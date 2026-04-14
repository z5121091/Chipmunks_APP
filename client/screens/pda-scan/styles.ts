import { StyleSheet } from 'react-native';
import { withAlpha } from '@/utils/colors';
import { Spacing, BorderRadius, Theme } from '@/constants/theme';
import { rf } from '@/utils/responsive';

export const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.backgroundRoot,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: theme.backgroundDefault,
  },

  backButton: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },

  headerTitle: {
    fontSize: rf(18),
    fontWeight: '700',
    color: theme.textPrimary,
  },

  // 顶栏
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
    backgroundColor: theme.backgroundDefault,
    gap: Spacing.xs,
  },

  warehouseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
  },

  warehouseText: {
    fontSize: rf(12),
    fontWeight: '500',
    color: theme.textPrimary,
    maxWidth: 70,
  },

  orderTag: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
  },

  orderTagActive: {
    backgroundColor: theme.success,
  },

  orderText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: theme.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  orderTextActive: {
    color: theme.white,
  },

  // 扫码框
  scanBox: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },

  scanInput: {
    height: rf(56),
    backgroundColor: theme.backgroundDefault,
    borderWidth: 2,
    borderColor: theme.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    fontSize: rf(18),
    fontWeight: '500',
    color: theme.textPrimary,
    textAlign: 'center',
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 100,
    left: Spacing.md,
    right: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    zIndex: 999,
    shadowColor: theme.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },

  toastSuccess: { backgroundColor: theme.success },
  toastWarning: { backgroundColor: theme.warning },
  toastError: { backgroundColor: theme.error },

  toastText: {
    color: theme.white,
    fontSize: rf(14),
    fontWeight: '700',
    textAlign: 'center',
  },

  // 列表
  listSection: {
    flex: 1,
    marginTop: Spacing.sm,
    backgroundColor: theme.backgroundDefault,
  },

  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },

  listTitle: {
    fontSize: rf(13),
    fontWeight: '600',
    color: theme.textSecondary,
  },

  listCount: {
    fontSize: rf(13),
    fontWeight: '600',
    color: theme.primary,
  },

  list: {
    flex: 1,
  },

  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },

  itemLeft: {
    flex: 1,
  },

  itemModel: {
    fontSize: rf(14),
    fontWeight: '600',
    color: theme.textPrimary,
  },

  itemBatch: {
    fontSize: rf(12),
    color: theme.textSecondary,
    marginTop: 1,
  },

  itemRight: {
    alignItems: 'flex-end',
  },

  itemQty: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.primary,
  },

  itemTime: {
    fontSize: rf(10),
    color: theme.textMuted,
    marginTop: 1,
  },

  detailsContainer: {
    backgroundColor: theme.backgroundTertiary,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },

  detailItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },

  detailText: {
    fontSize: rf(12),
    color: theme.textSecondary,
    lineHeight: 18,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },

  emptyText: {
    fontSize: rf(13),
    color: theme.textMuted,
  },

  // 仓库选择器
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pickerBox: {
    width: '80%',
    backgroundColor: theme.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },

  pickerTitle: {
    fontSize: rf(15),
    fontWeight: '600',
    color: theme.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },

  pickerItemActive: {
    backgroundColor: withAlpha(theme.primary, 0.06),
  },

  pickerItemText: {
    fontSize: rf(14),
    color: theme.textPrimary,
  },

  pickerClose: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },

  pickerCloseText: {
    fontSize: rf(14),
    color: theme.textSecondary,
  },
});
