import React from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { theme } from '../theme/theme';

interface Props<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  control: Control<T, any, any>;
  name: Path<T>;
  label: string;
  helperText?: string;
  numeric?: boolean;
}

export function ControlledInput<T extends FieldValues>({
  control,
  name,
  label,
  helperText,
  numeric = false,
  ...inputProps
}: Props<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
        <View style={styles.container}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            {...inputProps}
            onBlur={onBlur}
            value={value === undefined || value === null ? '' : String(value)}
            onChangeText={(text) => {
              if (numeric) {
                const digits = text.replace(/[^0-9]/g, '');
                onChange(digits === '' ? 0 : parseInt(digits, 10));
              } else {
                onChange(text);
              }
            }}
            keyboardType={numeric ? 'number-pad' : inputProps.keyboardType}
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.input,
              numeric && styles.numericInput,
              error && styles.inputError,
              inputProps.style,
            ]}
          />
          {error?.message ? (
            <Text style={styles.errorText}>{error.message}</Text>
          ) : helperText ? (
            <Text style={styles.helperText}>{helperText}</Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 6,
  },
  input: {
    minHeight: theme.touch.minInputHeight,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  numericInput: {
    fontSize: theme.typography.voteNumber,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputError: {
    borderColor: theme.colors.danger,
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 5,
  },
  helperText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});