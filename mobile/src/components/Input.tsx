import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { color, type } from '@/theme/tokens';

// Figma: Input component set 74:519 — Default / Filled / Error. Label in the Button type
// style with a brand asterisk when required; 64px wrapper on the raised background.
//
// One deliberate deviation from the file: the error border here is `color.error`
// (red/300), not Brand. Figma's error variant (74:518) still uses Brand red, which plan
// 3a explicitly ruled out ("error must not look like primary buttons"). 👤 Figma to update.

type InputProps = {
  label?: string;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  /** Shows "n/maxLength" in the helper row (node 74:409). Needs `maxLength`. */
  showCount?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
} & Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'keyboardType' | 'secureTextEntry' | 'maxLength'
>;

export function Input({
  label,
  required = false,
  error = false,
  helperText,
  showCount = false,
  leftIcon,
  rightIcon,
  ...inputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.root}>
      {label !== undefined && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.asterisk}>*</Text>}
        </View>
      )}
      <View
        style={[
          styles.wrapper,
          error ? styles.wrapperError : focused ? styles.wrapperFocused : null,
        ]}
      >
        {leftIcon}
        <TextInput
          {...inputProps}
          onBlur={() => setFocused(false)}
          onFocus={() => setFocused(true)}
          placeholderTextColor={color.text.secondary}
          style={styles.field}
        />
        {rightIcon}
      </View>
      {(helperText !== undefined || showCount) && (
        <View style={styles.helperRow}>
          {helperText !== undefined && (
            <Text style={[styles.helper, error && styles.helperError]}>{helperText}</Text>
          )}
          {showCount && inputProps.maxLength !== undefined && (
            <Text style={styles.helper}>
              {(inputProps.value ?? '').length}/{inputProps.maxLength}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignSelf: 'stretch' },
  labelRow: { flexDirection: 'row', gap: 2, padding: 4 },
  label: { ...type.button, color: color.text.primary },
  asterisk: { ...type.button, color: color.brand },
  // Figma: h64, pad 20, r8, raised bg, border neutral/700.
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 64,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: color.bg.raised,
    borderColor: color.border,
  },
  // Focus isn't drawn in the file; brightening the border is the minimal affordance.
  wrapperFocused: { borderColor: color.text.secondary },
  wrapperError: { borderColor: color.error },
  // Vertical centering: Android adds font padding below Geom's tall ascent, which made
  // the text sit high in the 64px field (Justin, 2026-09-01). Kill the font padding,
  // center explicitly, and let the field's height do the aligning — no hard lineHeight.
  field: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    fontWeight: type.body.fontWeight,
    flex: 1,
    color: color.text.primary,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  helper: { ...type.body, color: color.text.secondary },
  helperError: { color: color.error },
});
