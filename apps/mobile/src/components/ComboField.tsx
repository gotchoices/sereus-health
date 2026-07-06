import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { spacing, typography, useTheme } from '../theme/useTheme';
import { useT } from '../i18n/useT';

export interface ComboOption {
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * Inline "select-or-create" field (general.md · Inline creation). A text input whose
 * matching existing values drop down directly beneath it; the chevron toggles the full
 * list; typing a value that doesn't exist offers "+ Create '<text>'". No modal.
 *
 * Two modes:
 *  - adder (default): clears itself after a pick/create so it can add repeatedly (items).
 *  - value: pass `value` + `onChangeText`; the field holds a single value (categories).
 */
export default function ComboField(props: {
  placeholder: string;
  options: ComboOption[];
  onSelect: (opt: ComboOption) => void;
  onCreate?: (text: string) => void;
  createLabelKey?: string;
  /** Controlled "value" mode when provided. */
  value?: string;
  onChangeText?: (text: string) => void;
  autoFocus?: boolean;
  max?: number;
}) {
  const theme = useTheme();
  const t = useT();
  const controlled = props.value !== undefined;
  const inputRef = useRef<TextInput>(null);
  const [innerQuery, setInnerQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const query = controlled ? (props.value ?? '') : innerQuery;
  const setQuery = (txt: string) => { if (controlled) props.onChangeText?.(txt); else setInnerQuery(txt); };

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = q ? props.options.filter((o) => o.label.toLowerCase().includes(q)) : props.options;
    return list.slice(0, props.max ?? 12);
  }, [props.options, props.max, q]);

  const exact = props.options.some((o) => o.label.trim().toLowerCase() === q);
  const showCreate = !!props.onCreate && query.trim().length > 0 && !exact;
  // Always show the panel while focused so the chevron/tap gives visible feedback
  // (existing choices, a create row, or a hint) rather than doing nothing.
  const open = focused;

  const close = () => { inputRef.current?.blur(); setFocused(false); };
  const choose = (opt: ComboOption) => { props.onSelect(opt); setQuery(controlled ? opt.label : ''); close(); };
  const create = () => { props.onCreate?.(query.trim()); if (!controlled) setQuery(''); close(); };
  const toggle = () => { if (focused) close(); else inputRef.current?.focus(); };

  return (
    <View>
      <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: open ? theme.accentPrimary : theme.border }]}>
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={props.placeholder}
          placeholderTextColor={theme.textSecondary}
          autoFocus={props.autoFocus}
          style={[styles.input, { color: theme.textPrimary }]}
        />
        <TouchableOpacity onPress={toggle} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {open ? (
        <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {showCreate ? (
            <TouchableOpacity style={[styles.row, { borderBottomColor: theme.border }]} onPress={create}>
              <Ionicons name="add-circle" size={18} color={theme.accentPrimary} />
              <Text style={{ color: theme.accentPrimary, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                {t(props.createLabelKey ?? 'combo.create', { name: query.trim() })}
              </Text>
            </TouchableOpacity>
          ) : null}
          {filtered.map((o) => (
            <TouchableOpacity key={o.id} style={[styles.row, { borderBottomColor: theme.border }]} onPress={() => choose(o)}>
              <Text style={{ color: theme.textPrimary, flex: 1 }} numberOfLines={1}>{o.label}</Text>
              {o.sublabel ? <Text style={{ color: theme.textSecondary, ...typography.small }}>{o.sublabel}</Text> : null}
            </TouchableOpacity>
          ))}
          {!filtered.length && !showCreate ? (
            <View style={styles.row}><Text style={{ color: theme.textSecondary }}>{t('combo.empty')}</Text></View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[2],
    borderWidth: 1, borderRadius: 12, paddingHorizontal: spacing[3], paddingVertical: spacing[2],
  },
  input: { flex: 1, ...typography.body, paddingVertical: 4 },
  dropdown: { borderWidth: 1, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
});
