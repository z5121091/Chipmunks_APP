/**
 * 统计卡片组件
 */
import React from 'react';
import { View, Text } from 'react-native';
import { Spacing, BorderRadius } from '@/constants/theme';
import { rf } from '@/utils/responsive';

interface StatItemProps {
  label: string;
  value: number | string;
  highlight?: boolean;
  theme: {
    backgroundSecondary: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    primary: string;
  };
}

export const StatItem: React.FC<StatItemProps> = ({ label, value, highlight, theme }) => (
  <View style={[styles.item, { backgroundColor: theme.backgroundSecondary }]}>
    <Text style={[styles.value, { color: highlight ? theme.primary : theme.textPrimary }]}>
      {value}
    </Text>
    <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
  </View>
);

interface StatsCardProps {
  title: string;
  stats: Array<{ label: string; value: number | string; highlight?: boolean }>;
  theme: {
    backgroundSecondary: string;
    backgroundTertiary: string;
    textPrimary: string;
    textSecondary: string;
    textTertiary: string;
    primary: string;
  };
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, stats, theme }) => (
  <View style={[styles.card, { backgroundColor: theme.backgroundTertiary }]}>
    <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
    <View style={styles.statsRow}>
      {stats.map((stat, index) => (
        <StatItem key={index} {...stat} theme={theme} />
      ))}
    </View>
  </View>
);

const styles = {
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: rf(14),
    fontWeight: '600' as const,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row' as const,
    gap: Spacing.sm,
  },
  item: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center' as const,
  },
  value: {
    fontSize: rf(24),
    fontWeight: '700' as const,
    marginBottom: 2,
  },
  label: {
    fontSize: rf(11),
  },
};
