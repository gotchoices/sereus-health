import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { getPendingCount, subscribeActivity } from '../util/activity';
import { useTheme } from '../theme/useTheme';

/**
 * Single app-wide activity indicator (async-activity.md): a thin bar pinned to the
 * top edge that pulses while any operation is outstanding. Non-blocking — it
 * overlays nothing interactive and never intercepts touches.
 */
export default function GlobalActivityIndicator() {
  const theme = useTheme();
  const pending = useSyncExternalStore(subscribeActivity, getPendingCount);
  const active = pending > 0;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      opacity.stopAnimation();
      opacity.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 550, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, opacity]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.bar, { backgroundColor: theme.accentPrimary, opacity }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000 },
  bar: { height: 3 },
});
