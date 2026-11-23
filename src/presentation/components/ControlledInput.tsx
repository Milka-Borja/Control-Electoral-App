import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
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
  secureTextEntry = false,
  ...inputProps
}: Props<T>) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
        const textInputProps = {
          ...inputProps,
          onBlur,
          value: value === undefined || value === null ? '' : String(value),
          onChangeText: (text: string) => {
            if (numeric) {
              const digits = text.replace(/[^0-9]/g, '');
              onChange(digits === '' ? 0 : parseInt(digits, 10));
            } else {
              onChange(text);
            }
          },
          keyboardType: numeric ? 'number-pad' : inputProps.keyboardType,
          placeholderTextColor: theme.colors.textMuted,
        };

        return (
          <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>
            {secureTextEntry ? (
              <View style={[styles.passwordContainer, error && styles.inputError]}>
                <TextInput
                  {...textInputProps}
                  secureTextEntry={!isPasswordVisible}
                  style={[
                    styles.passwordInput,
                    numeric && styles.numericInput,
                    inputProps.style,
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                  accessibilityHint="Alterna la visibilidad de la contraseña"
                  hitSlop={4}
                  onPress={() => setIsPasswordVisible((visible) => !visible)}
                  style={styles.visibilityButton}
                >
                  {isPasswordVisible ? (
                    <EyeOff size={20} color={theme.colors.textMuted} />
                  ) : (
                    <Eye size={20} color={theme.colors.textMuted} />
                  )}
                </Pressable>
              </View>
            ) : (
              <TextInput
                {...textInputProps}
                secureTextEntry={false}
                style={[
                  styles.input,
                  numeric && styles.numericInput,
                  error && styles.inputError,
                  inputProps.style,
                ]}
              />
            )}
            {error?.message ? (
              <Text style={styles.errorText}>{error.message}</Text>
            ) : helperText ? (
              <Text style={styles.helperText}>{helperText}</Text>
            ) : null}
          </View>
        );
      }}
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
  passwordContainer: {
    minHeight: theme.touch.minInputHeight,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
  },
  passwordInput: {
    flex: 1,
    minHeight: theme.touch.minInputHeight,
    paddingHorizontal: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  visibilityButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
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