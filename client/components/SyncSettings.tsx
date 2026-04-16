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

const getStatusText = (status: ConnectionStatus): string => {
  switch (status) {
    case 'success': return '已连接 ✓';
    case 'error': return '连接失败 ✗';
    case 'disconnected': return '断开连接 ✗';
    case 'testing': return '测试中...';
    default: return '未连接';
  }
};

const getStatusIcon = (status: ConnectionStatus): { name: keyof typeof Feather.glyphMap; color: string } => {
  switch (status) {
    case 'success': return { name: 'check-circle', color: '#10B981' };
    case 'error': return { name: 'x-circle', color: '#EF4444' };
    case 'disconnected': return { name: 'slash', color: '#6B7280' };
    case 'testing': return { name: 'loader', color: '#3B82F6' };
    default: return { name: 'circle', color: '#6B7280' };
  }
};

const getButtonConfig = (status: ConnectionStatus): { text: string; bgColor: string; textColor: string } => {
  switch (status) {
    case 'success': return { text: '已连接 ✓', bgColor: '#10B981', textColor: '#FFFFFF' };
    case 'error': return { text: '连接失败 ✗', bgColor: '#EF4444', textColor: '#FFFFFF' };
    case 'disconnected': return { text: '断开连接 ✗', bgColor: '#EF4444', textColor: '#FFFFFF' };
    case 'testing': return { text: '测试中...', bgColor: '#3B82F6', textColor: '#FFFFFF' };
    default: return { text: '测试连接', bgColor: '#4F46E5', textColor: '#FFFFFF' };
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
  const statusIcon = getStatusIcon(connectionStatus);
  const statusText = getStatusText(connectionStatus);
  const buttonConfig = getButtonConfig(connectionStatus);
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
        <Feather name={statusIcon.name} size={16} color={statusIcon.color} style={statusIcon.name === 'loader' && isTesting ? styles.spinning : undefined} />
        <Text style={[styles.statusText, { color: statusIcon.color }]}>{statusText}</Text>
      </View>
      <TouchableOpacity
        style={[styles.testButton, { backgroundColor: buttonConfig.bgColor }]}
        onPress={onTestConnection}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Feather name="zap" size={14} color={buttonConfig.textColor} />
            <Text style={[styles.testButtonText, { color: buttonConfig.textColor }]}>{buttonConfig.text}</Text>
          </>
        )}
      </TouchableOpacity>
      {connectionStatus === 'success' && (
        <Text style={[styles.hintText, { color: '#10B981' }]}>连接成功，配置已自动保存</Text>
      )}
      {(connectionStatus === 'error' || connectionStatus === 'disconnected') && (
        <Text style={[styles.hintText, { color: '#EF4444' }]}>
          {connectionStatus === 'disconnected' ? '网络连接已断开，请检查网络后重新连接' : '请检查服务器地址和状态后重试'}
        </Text>
      )}
      {connectionStatus === 'idle' && !syncConfig.ip && (
        <Text style={[styles.hintText, { color: theme.textMuted }]}>支持局域网IP、公网IP或域名</Text>
      )}
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
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  testButtonText: {
    fontSize: rf(15),
    fontWeight: '600' as const,
  },
  hintText: {
    fontSize: rf(12),
    marginTop: Spacing.sm,
    textAlign: 'center' as const,
  },
};
