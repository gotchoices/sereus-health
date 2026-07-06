import React, { useMemo, useState } from 'react';
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
 * matching existing values appear in a dropdown directly beneath it; typing a value
 * that doesn't exist offers "+ Create '<text>'". No modal — everything stays on the
 * screen. Adder semantics: clears itself after a selection/creation so it can add
 * repeatedly (e.g. multiple items on one entry).
 */
export default function ComboField(props: {
  placeholder: string;
  options: ComboOption[];
  onSelect: (opt: ComboOption) => void;
  onCreate?: (text: string) => void;
  /** i18n key for the create row; receives {name}. Defaults to a generic "Create". */
  createLabelKey?: string;
  autoFocus?: boolean;
  max?: number; // max suggestions shown (default 8)
}) {
  const theme = useTheme();
  const t = useT();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    const list = q ? props.options.filter((o) => o.label.toLowerCase().includes(q)) : props.options;
    return list.slice(0, props.max ?? 8);
  }, [props.options, props.max, q]);

  const exact = props.options.some((o) => o.label.trim().toLowerCase() === q);
  const showCreate = !!props.onCreate && query.trim().length > 0 && !exact;
  const open = focused && (filtered.length > 0 || showCreate);

  const choose = (opt: ComboOption) => { props.onSelect(opt); setQuery(''); };
  const create = () => { props.onCreate?.(query.trim()); setQuery(''); };

  return (
    <View>
      <View style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: open ? theme.accentPrimary : theme.border }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          // Delay so a tap on a dropdown row registers before blur closes it.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={props.placeholder}
          placeholderTextColor={theme.textSecondary}
          autoFocus={props.autoFocus}
          style={[styles.input, { color: theme.textPrimary }]}
        />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textSecondary} />
      </View>

      {open ? (
        <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {showCreate ? (
            <TouchableOpacity style={[styles.row, styles.createRow, { borderBottomColor: theme.border }]} onPress={create}>
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
  createRow: {},
});
