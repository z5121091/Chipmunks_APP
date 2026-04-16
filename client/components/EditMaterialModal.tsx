/**
 * 编辑物料弹窗组件
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialRecord } from '@/utils/database';
import { Spacing, BorderRadius, BorderWidth } from '@/constants/theme';
import { rf } from '@/utils/responsive';

interface EditMaterialModalProps {
  visible: boolean;
  material: MaterialRecord | null;
  formData: {
    model: string;
    batch: string;
    quantity: string;
    package: string;
    version: string;
    productionDate: string;
    traceNo: string;
    sourceNo: string;
  };
  saving: boolean;
  onChange: (field: string, value: string) => void;
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

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  theme: {
    textPrimary: string;
    textSecondary: string;
    backgroundTertiary: string;
    border: string;
  };
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  theme,
}) => (
  <>
    <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
    <TextInput
      style={[
        styles.input,
        { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary, borderColor: theme.border },
        !editable && { opacity: 0.6 },
      ]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      editable={editable}
    />
  </>
);

export const EditMaterialModal: React.FC<EditMaterialModalProps> = ({
  visible,
  material,
  formData,
  saving,
  onChange,
  onSave,
  onClose,
  theme,
}) => {
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
          <ScrollView style={styles.body}>
            <InputField label="型号" value={formData.model} onChangeText={(v) => onChange('model', v)} placeholder="请输入型号" theme={theme} />
            <InputField label="批次" value={formData.batch} onChangeText={(v) => onChange('batch', v)} placeholder="请输入批次" theme={theme} />
            <InputField label="封装" value={formData.package} onChangeText={(v) => onChange('package', v)} placeholder="请输入封装" theme={theme} />
            <InputField label="版本" value={formData.version} onChangeText={(v) => onChange('version', v)} placeholder="请输入版本" theme={theme} />
            <InputField label="数量" value={formData.quantity} onChangeText={(v) => onChange('quantity', v)} placeholder="请输入数量" theme={theme} />
            <InputField label="生产日期" value={formData.productionDate} onChangeText={(v) => onChange('productionDate', v)} placeholder="YYYY-MM-DD" theme={theme} />
            <InputField label="追溯码" value={formData.traceNo} onChangeText={(v) => onChange('traceNo', v)} placeholder="请输入追溯码" theme={theme} />
            <InputField label="箱号" value={formData.sourceNo} onChangeText={(v) => onChange('sourceNo', v)} placeholder="请输入箱号" theme={theme} />
          </ScrollView>

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
    maxHeight: '85%',
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
  label: {
    fontSize: rf(14),
    fontWeight: '500' as const,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  input: {
    fontSize: rf(16),
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: BorderWidth.normal,
  },
  footer: {
    flexDirection: 'row' as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: BorderWidth.normal,
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center' as const,
    borderRadius: BorderRadius.md,
    borderWidth: BorderWidth.normal,
  },
  buttonText: {
    fontSize: rf(16),
    fontWeight: '600' as const,
  },
};
