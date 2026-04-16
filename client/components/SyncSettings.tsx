/**
 * 同步设置组件
 */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SyncConfig, ConnectionStatus } from '@/constants/config';
import { Spacing, BorderRadius, BorderWidth } from '@/constants/theme';
import { rf } from '@/utils/responsive';

interface SyncSettingsProps {
  syncConfig: SyncConfig;
  connectionStatus: ConnectionStatus;
  onIpChange: (text: string) => void;
  onPortChange: (text: string) => void;
  onTestConnection: () => void;
  theme: {
    backgroundTertiary: string;
    backgroundSecondary: string;
    primary: string;
    success: string;
    error: string;
    warning: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    border: string;
  };
}

const getStatusIcon = (status: ConnectionStatus): { name: keyof typeof Feather.glyphMap; color: string; text: string } => {
  switch (status) {
    case 'success': return { name: 'check-circle', color: '#10B981', text: '已连接' };
    case 'error': return { name: 'x-circle', color: '#EF4444', text: '连接失败' };
    case 'disconnected': return { name: 'slash', color: '#6B7280', text: '已断开' };
    case 'testing': return { name: 'loader', color: '#3B82F6', text: '测试中...' };
    default: return { name: 'circle', color: '#6B7280', text: '未连接' };
  }
};

export const SyncSettings: React.FC<SyncSettingsProps> = ({
  syncConfig,
  connectionStatus,
  onIpChange,
  onPortChange,
  onTestConnection,
  theme,
}) => {
  const status = getStatusIcon(connectionStatus);
  const isTesting = connectionStatus === 'testing';

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>服务器</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary, borderColor: theme.border }]}
          value={syncConfig.ip}
          onChangeText={onIpChange}
          placeholder="IP或域名"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>端口</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary, borderColor: theme.border }]}
          value={syncConfig.port}
          onChangeText={onPortChange}
          placeholder="默认: 8080"
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
        />
      </View>
      <View style={styles.statusRow}>
        <Feather name={status.name} size={16} color={status.color} style={status.name === 'loader' && isTesting ? styles.spinning : undefined} />
        <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
      </View>
      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: theme.primary }]}
        onPress={onTestConnection}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Feather name="zap" size={14} color="#FFFFFF" />
            <Text style={styles.testButtonText}>测试连接</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = {
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.md,
  },
  label: {
    width: 50,
    fontSize: rf(14),
  },
  input: {
    flex: 1,
    fontSize: rf(14),
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: BorderWidth.normal,
    marginLeft: Spacing.md,
  },
  statusRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  statusText: {
    fontSize: rf(13),
  },
  spinning: {
    transform: [{ rotate: '360deg' }],
  },
  testButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  testButtonText: {
    fontSize: rf(14),
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
};
