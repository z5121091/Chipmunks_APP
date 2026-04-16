/**
 * 拆包弹窗组件
 */
import React, { useEffect, useRef } from 'react';
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
import { MaterialRecord, UnpackRecord } from '@/utils/database';
import { Spacing, BorderRadius, BorderWidth } from '@/constants/theme';
import { rf } from '@/utils/responsive';

interface UnpackModalProps {
  visible: boolean;
  material: MaterialRecord | null;
  newQuantity: string;
  newTraceNo: string;
  notes: string;
  unpacking: boolean;
  history: UnpackRecord[];
  nextIndex: number;
  onQuantityChange: (value: string) => void;
  onTraceNoChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  theme: {
    backgroundDefault: string;
    backgroundTertiary: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    primary: string;
    error: string;
  };
}

export const UnpackModal: React.FC<UnpackModalProps> = ({
  visible,
  material,
  newQuantity,
  newTraceNo,
  notes,
  unpacking,
  history,
  nextIndex,
  onQuantityChange,
  onTraceNoChange,
  onNotesChange,
  onConfirm,
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
            <Text style={[styles.title, { color: theme.textPrimary }]}>拆包物料</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
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

            {/* 拆包信息 */}
            <Text style={[styles.label, { color: theme.textPrimary }]}>拆包数量</Text>
            <TextInput
              ref={quantityRef}
              style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary, borderColor: theme.border }]}
              value={newQuantity}
              onChangeText={onQuantityChange}
              placeholder="输入拆包数量"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />

            <Text style={[styles.label, { color: theme.textPrimary }]}>新追溯码</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary, borderColor: theme.border }]}
              value={newTraceNo}
              onChangeText={onTraceNoChange}
              placeholder="输入新追溯码"
              placeholderTextColor={theme.textSecondary}
            />

            <Text style={[styles.label, { color: theme.textPrimary }]}>备注</Text>
            <TextInput
              style={[styles.input, styles.notesInput, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary, borderColor: theme.border }]}
              value={notes}
              onChangeText={onNotesChange}
              placeholder="可选备注"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
            />

            {/* 历史记录 */}
            {history.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>拆包历史</Text>
                {history.map((record, index) => (
                  <View key={index} style={[styles.historyItem, { borderColor: theme.border }]}>
                    <View style={styles.historyRow}>
                      <Text style={[styles.historyIndex, { color: theme.textSecondary }]}>#{record.unpack_index}</Text>
                      <Text style={[styles.historyQty, { color: theme.error }]}>-{record.quantity}</Text>
                      <Text style={[styles.historyTrace, { color: theme.textPrimary }]}>{record.new_trace_no}</Text>
                    </View>
                    {record.notes && (
                      <Text style={[styles.historyNotes, { color: theme.textTertiary }]}>{record.notes}</Text>
                    )}
                  </View>
                ))}
              </>
            )}
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
              onPress={onConfirm}
              disabled={unpacking || !newQuantity}
            >
              <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                {unpacking ? '处理中...' : `拆包 #${nextIndex}`}
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
  infoBox: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row' as const,
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    width: 60,
    fontSize: rf(13),
  },
  infoValue: {
    flex: 1,
    fontSize: rf(14),
    fontWeight: '500' as const,
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
  notesInput: {
    minHeight: 60,
    textAlignVertical: 'top' as const,
  },
  sectionTitle: {
    fontSize: rf(14),
    fontWeight: '600' as const,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  historyItem: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: BorderWidth.thin,
  },
  historyRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.md,
  },
  historyIndex: {
    fontSize: rf(12),
    width: 24,
  },
  historyQty: {
    fontSize: rf(14),
    fontWeight: '600' as const,
  },
  historyTrace: {
    flex: 1,
    fontSize: rf(13),
  },
  historyNotes: {
    fontSize: rf(12),
    marginTop: 2,
    marginLeft: 24 + Spacing.md,
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
