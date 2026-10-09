/**
 * NodeCodeScanner — a full-screen camera that reads a cadre node's QR code
 * (`sereus-join:1.…`) and hands back its text.
 *
 * Reusable by any Sereus RN app — a candidate for `@serfab/cadre-rn` (as an optional
 * subpath, since it needs `react-native-vision-camera` ^4.7, the camera chat uses too).
 * It imports no app code (only vision-camera and react-native-safe-area-context): words and colors come in as props, so each app keeps its own
 * i18n and theme.
 *
 * Native setup the app needs (one time):
 * - `react-native-vision-camera` ^4.7 installed (iOS: pod install).
 * - Android: `android.permission.CAMERA` in the manifest, and
 *   `VisionCamera_enableCodeScanner=true` in android/gradle.properties to bundle the
 *   ML Kit model (otherwise Play Services downloads it on first scan, which fails offline
 *   and on devices without Play Services).
 * - iOS: `NSCameraUsageDescription` in Info.plist that mentions scanning node codes.
 *
 * Do not clip the preview (`overflow: 'hidden'`, `borderRadius`) or set `resizeMode`:
 * on some Android devices any clip of the native preview surface renders it blank
 * (measured by chat on a Galaxy S7; the emulator does not reproduce it).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Camera, useCameraDevice, useCodeScanner, type Code } from 'react-native-vision-camera';
import { isNodeCode } from './nodeCodeLink';

export interface NodeCodeScannerText {
  /** Shown under the camera while scanning. */
  hint: string;
  /** Replaces the hint after a QR code that is not a node code was seen. */
  otherCode: string;
  /** While the permission prompt is up. */
  waitingPermission: string;
  /** Camera refused; the user can paste the code's text instead. */
  permissionDenied: string;
  /** No camera (e.g. a simulator). */
  noCamera: string;
  allowCamera: string;
  openSettings: string;
  cancel: string;
}

export interface NodeCodeScannerColors {
  background: string;
  text: string;
  accent: string;
  accentText: string;
}

const DEFAULT_COLORS: NodeCodeScannerColors = {
  background: '#0f0f1a',
  text: '#dddddd',
  accent: '#4A90E2',
  accentText: '#ffffff',
};

type Permission = 'granted' | 'not-determined' | 'denied' | 'restricted';

export function NodeCodeScanner({
  visible,
  onScanned,
  onClose,
  text,
  colors = DEFAULT_COLORS,
}: {
  visible: boolean;
  /** The scanned text, which starts with `sereus-join:`.  Close the scanner here. */
  onScanned: (code: string) => void;
  onClose: () => void;
  text: NodeCodeScannerText;
  colors?: NodeCodeScannerColors;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {/* Mounted only while open: every opening starts unlatched and re-checks permission. */}
      {/* A Modal is its own native window: it needs its own safe-area provider. */}
      {visible && (
        <SafeAreaProvider>
          <ScannerBody onScanned={onScanned} onClose={onClose} text={text} colors={colors} />
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

function ScannerBody({
  onScanned,
  onClose,
  text,
  colors,
}: {
  onScanned: (code: string) => void;
  onClose: () => void;
  text: NodeCodeScannerText;
  colors: NodeCodeScannerColors;
}) {
  const device = useCameraDevice('back');
  const [permission, setPermission] = useState<Permission>(() => Camera.getCameraPermissionStatus());
  const [sawOtherCode, setSawOtherCode] = useState(false);
  // The scanner reports many times a second while a code is in view: the first node code
  // wins and the rest are dropped.
  const latched = useRef(false);

  const ask = useCallback(async () => {
    setPermission(await Camera.requestCameraPermission());
  }, []);

  useEffect(() => {
    if (permission === 'not-determined') void ask();
  }, [permission, ask]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes: Code[]) => {
      if (latched.current) return;
      for (const code of codes) {
        const value = code.value?.trim();
        if (!value) continue;
        if (isNodeCode(value)) {
          latched.current = true;
          onScanned(value);
          return;
        }
        setSawOtherCode(true);
      }
    },
  });

  let body: React.ReactNode;
  if (permission === 'granted' && device) {
    body = <Camera style={styles.camera} device={device} isActive codeScanner={codeScanner} />;
  } else if (permission === 'granted') {
    body = <Notice message={text.noCamera} colors={colors} />;
  } else if (permission === 'not-determined') {
    body = <Notice message={text.waitingPermission} colors={colors} />;
  } else {
    // Android asks again until "don't ask again"; iOS never re-prompts after a denial.
    const canAskAgain = Platform.OS === 'android' && permission === 'denied';
    body = (
      <Notice
        message={text.permissionDenied}
        colors={colors}
        action={
          canAskAgain
            ? { label: text.allowCamera, onPress: () => void ask() }
            : { label: text.openSettings, onPress: () => void Linking.openSettings() }
        }
      />
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      {body}
      <View style={styles.footer}>
        <Text style={[styles.hint, { color: colors.text }]}>{sawOtherCode ? text.otherCode : text.hint}</Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={onClose}
          accessibilityRole="button"
          testID="node-code-scanner-cancel"
        >
          <Text style={[styles.buttonText, { color: colors.accentText }]}>{text.cancel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Notice({
  message,
  colors,
  action,
}: {
  message: string;
  colors: NodeCodeScannerColors;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.notice}>
      <Text style={[styles.noticeText, { color: colors.text }]}>{message}</Text>
      {action && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent }]}
          onPress={action.onPress}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.accentText }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  camera: { flex: 1 },
  notice: { flex: 1, justifyContent: 'center', padding: 24 },
  noticeText: { fontSize: 15, lineHeight: 21, marginBottom: 16 },
  footer: { padding: 16 },
  hint: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  button: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
