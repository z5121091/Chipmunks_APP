/**
 * 编辑物料弹窗组件 - 仅修改数量
 */
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialRecord } from '@/utils/database';
import { Spacing, BorderRadius, BorderWidth } from '@/constants/theme';
import { rf } from '@/utils/responsive';

interface EditMaterialModalProps {
  visible: boolean;
  material: MaterialRecord | null;
  quantity: string;
  saving: boolean;
  onQuantityChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  theme: {
    backgroundDefault: string;
    backgroundTertiary: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    primary: string;
  };
}

export const EditMaterialModal: React.FC<EditMaterialModalProps> = ({
  visible,
  material,
  quantity,
  saving,
  onQuantityChange,
  onSave,
  onClose,
  theme,
}) => {
  const quantityRef = useRef<TextInput>(null);

  // 弹窗打开时聚焦输入框
  useEffect(() => {
    if (visible && quantityRef.current) {
      const timer = setTimeout(() => quantityRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!material) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.content, { backgroundColor: theme.backgroundDefault }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>编辑物料</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {/* 物料信息 */}
            <View style={[styles.infoBox, { backgroundColor: theme.backgroundTertiary }]}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>型号</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{material.model}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>批次</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{material.batch}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>追溯码</Text>
                <Text style={[styles.infoValue, { color: theme.textPrimary }]}>{material.trace_no || '-'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>当前数量</Text>
                <Text style={[styles.infoValue, { color: theme.primary }]}>{material.quantity}</Text>
              </View>
            </View>

            {/* 数量编辑 */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>新数量</Text>
            <TextInput
              ref={quantityRef}
              style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary, borderColor: theme.border }]}
              value={quantity}
              onChangeText={onQuantityChange}
              placeholder="输入数量"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primary }]}
              onPress={onSave}
              disabled={saving}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {saving ? '保存中...' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  content: {
    width: '90%' as any,
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden' as const,
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: BorderWidth.normal,
  },
  title: {
    fontSize: rf(18),
    fontWeight: '600' as const,
  },
  closeBtn: {
    fontSize: rf(28),
    lineHeight: rf(28),
  },
  body: {
    padding: Spacing.lg,
  },
  infoBox: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    fontSize: rf(14),
  },
  infoValue: {
    fontSize: rf(14),
    fontWeight: '500' as const,
  },
  label: {
    fontSize: rf(14),
    fontWeight: '500' as const,
    marginBottom: Spacing.sm,
  },
  input: {
    height: rf(48),
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: rf(16),
    borderWidth: BorderWidth.normal,
  },
  footer: {
    flexDirection: 'row' as const,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderTopWidth: BorderWidth.normal,
  },
  button: {
    flex: 1,
    height: rf(48),
    borderRadius: BorderRadius.md,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: BorderWidth.normal,
  },
  buttonText: {
    fontSize: rf(16),
    fontWeight: '500' as const,
  },
};
