/**
 * 菜单卡片组件
 */
import React from 'react';
import { View, Text, Switch, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AnimatedCard } from '@/components/AnimatedCard';
import { Spacing, BorderRadius } from '@/constants/theme';
import { rf } from '@/utils/responsive';

interface MenuCardProps {
  title: string;
  desc: string;
  iconName: keyof typeof Feather.glyphMap;
  color: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  rightText?: string;
  theme: {
    backgroundSecondary: string;
    primary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
  };
}

export const MenuCard: React.FC<MenuCardProps> = ({
  title,
  desc,
  iconName,
  color,
  onPress,
  disabled,
  loading,
  rightText,
  theme,
}) => {
  return (
    <AnimatedCard
      onPress={onPress}
      disabled={disabled || loading}
      style={disabled ? styles.disabled : undefined}
    >
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.icon, { backgroundColor: color + '15' }]}>
            {loading ? (
              <ActivityIndicator size="small" color={color} />
            ) : (
              <Feather name={iconName} size={20} color={color} />
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>{loading ? '处理中...' : title}</Text>
            <Text style={styles.desc}>{desc}</Text>
          </View>
          {rightText ? (
            <Text style={[styles.rightText, { color }]}>{rightText}</Text>
          ) : (
            <Feather name="chevron-right" size={16} color={theme.textMuted} />
          )}
        </View>
      </View>
    </AnimatedCard>
  );
};

interface SwitchCardProps {
  title: string;
  desc: string;
  iconName: keyof typeof Feather.glyphMap;
  color: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  theme: {
    backgroundSecondary: string;
    primary: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
  };
}

export const SwitchCard: React.FC<SwitchCardProps> = ({
  title,
  desc,
  iconName,
  color,
  value,
  onValueChange,
  theme,
}) => {
  

  return (
    <AnimatedCard onPress={() => onValueChange(!value)}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={[styles.icon, { backgroundColor: color + '15' }]}>
            <Feather name={iconName} size={20} color={color} />
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.desc}>{desc}</Text>
          </View>
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: theme.border, true: color + '80' }}
            thumbColor={value ? color : theme.textMuted}
          />
        </View>
      </View>
    </AnimatedCard>
  );
};

const styles = {
  container: {
    width: '100%',
  },
  card: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: Spacing.lg,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: rf(16),
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 2,
  },
  desc: {
    fontSize: rf(12),
    color: '#888',
  },
  rightText: {
    fontSize: rf(13),
    fontWeight: '500' as const,
  },
  disabled: {
    opacity: 0.5,
  },
};
