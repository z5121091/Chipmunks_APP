/**
 * 搜索栏组件
 */
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Spacing, BorderRadius } from '@/constants/theme';
import { rf } from '@/utils/responsive';

type SearchType = 'order' | 'customer' | 'batch';

interface SearchBarProps {
  value: string;
  searchType: SearchType;
  onChangeText: (text: string) => void;
  onSearchTypeChange: (type: SearchType) => void;
  placeholder?: string;
  theme: {
    backgroundTertiary: string;
    backgroundSecondary: string;
    primary: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
  };
}

const searchTypes: { type: SearchType; label: string }[] = [
  { type: 'order', label: '订单号' },
  { type: 'customer', label: '客户' },
  { type: 'batch', label: '批次' },
];

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  searchType,
  onChangeText,
  onSearchTypeChange,
  placeholder = '搜索...',
  theme,
}) => {
  return (
    <View style={styles.container}>
      {/* 搜索类型切换 */}
      <View style={[styles.typeContainer, { backgroundColor: theme.backgroundTertiary }]}>
        {searchTypes.map(({ type, label }) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              searchType === type && { backgroundColor: theme.primary },
            ]}
            onPress={() => onSearchTypeChange(type)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.typeText,
                { color: searchType === type ? '#FFFFFF' : theme.textSecondary },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 搜索输入框 */}
      <View style={[styles.inputContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <Feather name="search" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.input, { color: theme.textPrimary }]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.7}>
            <Feather name="x" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = {
  container: {
    gap: Spacing.md,
  },
  typeContainer: {
    flexDirection: 'row' as const,
    borderRadius: BorderRadius.md,
    padding: 2,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center' as const,
    borderRadius: BorderRadius.sm,
  },
  typeText: {
    fontSize: rf(13),
    fontWeight: '500' as const,
  },
  inputContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: rf(16),
    padding: 0,
  },
};
