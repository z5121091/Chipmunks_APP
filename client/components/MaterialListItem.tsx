/**
 * 物料列表项组件
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MaterialRecord } from '@/utils/database';
import { formatDate } from '@/utils/time';
import { Spacing, BorderRadius } from '@/constants/theme';
import { rf } from '@/utils/responsive';

interface MaterialListItemProps {
  material: MaterialRecord;
  onView: () => void;
  onUnpack: () => void;
  onEdit: () => void;
  theme: {
    backgroundSecondary: string;
    backgroundTertiary: string;
    primary: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    error: string;
  };
}

export const MaterialListItem: React.FC<MaterialListItemProps> = ({
  material,
  onView,
  onUnpack,
  onEdit,
  theme,
}) => {
  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <TouchableOpacity style={styles.content} onPress={onView} activeOpacity={0.7}>
        <View style={styles.mainInfo}>
          <Text style={[styles.model, { color: theme.primary }]} numberOfLines={1}>
            {material.model}
          </Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detail, { color: theme.textSecondary }]}>
              批次: {material.batch}
            </Text>
            <Text style={[styles.detail, { color: theme.textSecondary }]}>
              数量: <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{material.quantity}</Text>
            </Text>
          </View>
          {material.trace_no && (
            <Text style={[styles.traceNo, { color: theme.textTertiary }]} numberOfLines={1}>
              追溯码: {material.trace_no}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary + '15' }]}
            onPress={onUnpack}
            activeOpacity={0.7}
          >
            <Feather name="package" size={14} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>拆包</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.backgroundTertiary }]}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={14} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {material.production_date && (
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Text style={[styles.footerText, { color: theme.textTertiary }]}>
            生产日期: {formatDate(material.production_date)}
          </Text>
          {material.source_no && (
            <Text style={[styles.footerText, { color: theme.textTertiary }]}>
              箱号: {material.source_no}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = {
  container: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden' as const,
  },
  content: {
    flexDirection: 'row' as const,
    padding: Spacing.md,
    alignItems: 'center' as const,
  },
  mainInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  model: {
    fontSize: rf(15),
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row' as const,
    gap: Spacing.lg,
    marginBottom: 2,
  },
  detail: {
    fontSize: rf(12),
  },
  traceNo: {
    fontSize: rf(11),
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  actionText: {
    fontSize: rf(12),
    fontWeight: '500' as const,
  },
  footer: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: rf(11),
  },
};
