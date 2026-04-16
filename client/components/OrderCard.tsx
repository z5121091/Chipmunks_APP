/**
 * 订单卡片组件
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Spacing, BorderRadius, BorderWidth } from '@/constants/theme';
import { rf } from '@/utils/responsive';
import { Order } from '@/utils/database';

interface OrderCardProps {
  order: Order;
  isExpanded: boolean;
  materialCount: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  theme: {
    backgroundSecondary: string;
    backgroundTertiary: string;
    primary: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    error: string;
    warning: string;
  };
}

export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  isExpanded,
  materialCount,
  onToggle,
  onEdit,
  onDelete,
  theme,
}) => {
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}>
      {/* 主行 */}
      <TouchableOpacity
        style={styles.mainRow}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.orderInfo}>
          <View style={styles.orderNoRow}>
            <Text style={[styles.orderNo, { color: theme.primary }]} numberOfLines={1}>
              {order.order_no}
            </Text>
            {order.is_today && (
              <View style={[styles.todayBadge, { backgroundColor: theme.warning + '20' }]}>
                <Text style={[styles.todayText, { color: theme.warning }]}>今日</Text>
              </View>
            )}
          </View>
          {order.customer_name && (
            <Text style={[styles.customerName, { color: theme.textSecondary }]} numberOfLines={1}>
              {order.customer_name}
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          <View style={styles.materialCount}>
            <Text style={[styles.countNumber, { color: theme.textPrimary }]}>{materialCount}</Text>
            <Text style={[styles.countLabel, { color: theme.textTertiary }]}>物料</Text>
          </View>
          <Feather
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* 展开的操作按钮 */}
      {isExpanded && (
        <View style={[styles.actions, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.backgroundTertiary }]}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={14} color={theme.primary} />
            <Text style={[styles.actionText, { color: theme.primary }]}>编辑客户</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.error + '15' }]}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={14} color={theme.error} />
            <Text style={[styles.actionText, { color: theme.error }]}>删除</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = {
  card: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden' as const,
  },
  mainRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: Spacing.lg,
  },
  orderInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  orderNoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },
  orderNo: {
    fontSize: rf(16),
    fontWeight: '600' as const,
    flexShrink: 1,
  },
  todayBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  todayText: {
    fontSize: rf(11),
    fontWeight: '600' as const,
  },
  customerName: {
    fontSize: rf(13),
    marginTop: 2,
  },
  rightSection: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.md,
  },
  materialCount: {
    alignItems: 'center' as const,
  },
  countNumber: {
    fontSize: rf(18),
    fontWeight: '700' as const,
  },
  countLabel: {
    fontSize: rf(11),
  },
  actions: {
    flexDirection: 'row' as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: BorderWidth.thin,
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: rf(13),
    fontWeight: '500' as const,
  },
};
