/**
 * 自定义确认弹窗组件
 */
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { rf } from '@/utils/responsive';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: 'success' | 'warning' | 'error' | 'info';
  buttons: AlertButton[];
  onClose: () => void;
  theme: {
    backgroundDefault: string;
    textPrimary: string;
    textSecondary: string;
    white: string;
    primary: string;
    error: string;
    warning: string;
    info: string;
    border: string;
    backgroundTertiary: string;
  };
}

const iconMap = {
  success: 'check',
  warning: 'triangle-exclamation',
  error: 'xmark',
  info: 'info',
};

const colorMap = {
  success: { bg: 'rgba(16, 185, 129, 0.12)', fg: '#10B981' },
  warning: { bg: 'rgba(245, 158, 11, 0.12)', fg: '#F59E0B' },
  error: { bg: 'rgba(239, 68, 68, 0.12)', fg: '#EF4444' },
  info: { bg: 'rgba(59, 130, 246, 0.12)', fg: '#3B82F6' },
};

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  icon,
  buttons,
  onClose,
  theme,
}) => {
  const colors = icon ? colorMap[icon] : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.backgroundDefault }]}>
          {/* 图标 */}
          {icon && colors && (
            <View style={[styles.iconContainer, { backgroundColor: colors.bg }]}>
              <View style={[styles.iconInner, { backgroundColor: colors.fg }]}>
                <FontAwesome6 name={iconMap[icon]} size={24} color={theme.white} />
              </View>
            </View>
          )}

          {/* 标题 */}
          <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>

          {/* 消息内容 */}
          <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>

          {/* 按钮组 */}
          <View style={styles.buttonGroup}>
            {buttons.map((button, index) => {
              const isDestructive = button.style === 'destructive';
              const isCancel = button.style === 'cancel';
              const bgColor = isDestructive ? theme.error
                : isCancel ? theme.backgroundTertiary
                : theme.primary;
              const textColor = isDestructive ? theme.white
                : isCancel ? theme.textPrimary
                : theme.buttonPrimaryText;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    buttons.length === 1 ? styles.fullButton : styles.halfButton,
                    { backgroundColor: bgColor },
                    isCancel && { borderWidth: 1.5, borderColor: theme.border },
                  ]}
                  onPress={() => {
                    onClose();
                    button.onPress?.();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, { color: textColor }]}>{button.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: Spacing['2xl'],
  },
  content: {
    width: '100%' as const,
    maxWidth: 320,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center' as const,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius['4xl'],
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 4,
  },
  iconInner: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  title: {
    fontSize: rf(18),
    fontWeight: '700' as const,
    textAlign: 'center' as const,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: rf(14),
    lineHeight: Spacing.xl,
    textAlign: 'center' as const,
    marginBottom: Spacing.xl,
  },
  buttonGroup: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
    width: '100%' as const,
  },
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: Spacing['2xl'],
  },
  fullButton: {
    width: '100%' as const,
  },
  halfButton: {
    flex: 1,
  },
  buttonText: {
    fontSize: rf(16),
    fontWeight: '600' as const,
  },
};
