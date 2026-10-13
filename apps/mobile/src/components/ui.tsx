import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';

export function Screen({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const colors = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {title ? (
          <View style={{ gap: 4 }}>
            <Text
              accessibilityRole="header"
              style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>{subtitle}</Text>
            ) : null}
          </View>
        ) : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surfaceRaised,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        gap: 12,
      }}
    >
      {children}
    </View>
  );
}

export function Banner({
  tone,
  message,
}: {
  tone: 'danger' | 'info' | 'success';
  message: string;
}) {
  const colors = useTheme();
  const color = tone === 'danger' ? colors.danger : tone === 'success' ? colors.success : colors.info;
  return (
    <Text
      accessibilityRole="alert"
      style={{
        color,
        backgroundColor: colors.surfaceSunken,
        borderRadius: 10,
        padding: 12,
        overflow: 'hidden',
      }}
    >
      {message}
    </Text>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const colors = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      {hint ? <Text style={{ color: colors.textMuted, fontSize: 12 }}>{hint}</Text> : null}
      {children}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 12 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function TextField({
  label,
  error,
  hint,
  onFocus,
  onBlur,
  style,
  ...input
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} hint={hint} error={error}>
      <TextInput
        {...input}
        accessibilityLabel={input.accessibilityLabel ?? label}
        placeholderTextColor={colors.textMuted}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          {
            minHeight: 48,
            borderWidth: 1,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            color: colors.text,
            backgroundColor: colors.surface,
            fontSize: 16,
          },
          style,
        ]}
      />
    </Field>
  );
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const colors = useTheme();
  const blocked = disabled || loading;
  const filled = variant === 'primary';
  const background = filled ? colors.primary : 'transparent';
  const color =
    variant === 'danger' ? colors.danger : filled ? colors.primaryContrast : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={{
        minHeight: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: background,
        borderWidth: filled ? 0 : 1,
        borderColor: variant === 'danger' ? colors.danger : colors.border,
        opacity: blocked ? 0.5 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={filled ? colors.primaryContrast : colors.primary} />
      ) : (
        <Text style={{ color, fontSize: 16, fontWeight: '600' }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return <Text style={{ color: colors.textMuted, fontSize: 14 }}>{children}</Text>;
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: 44,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? colors.primarySoft : colors.surface,
        paddingHorizontal: 14,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: selected ? colors.primary : colors.text, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}
