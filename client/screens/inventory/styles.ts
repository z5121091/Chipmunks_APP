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
    padding: Spacing.xs,
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.xs,
    backgroundColor: theme.backgroundDefault,
    gap: Spacing.xs,
  },

  // 盘点类型选择器
  typeSelector: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },

  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
  },

  typeBtnActive: {
    backgroundColor: theme.success,
  },

  typeBtnText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.textPrimary,
  },

  typeBtnTextActive: {
    color: theme.white,
  },

  // 已保存按钮
  savedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
  },

  savedBtnText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.textPrimary,
  },

  // 仓库按钮
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
    fontSize: rf(11),
    fontWeight: '500',
    color: theme.textPrimary,
    maxWidth: 60,
  },

  // 扫码框
  scanBox: {
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.md,
  },

  scanInput: {
    height: rf(56),
    backgroundColor: theme.backgroundDefault,
    borderWidth: 2,
    borderColor: theme.primary,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: rf(18),
    fontWeight: '500',
    color: theme.textPrimary,
    textAlign: 'center',
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 240,
    left: Spacing.md,
    right: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    zIndex: 999,
    shadowColor: theme.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },

  toastSuccess: { backgroundColor: theme.success },
  toastWarning: { backgroundColor: theme.warning },
  toastError: { backgroundColor: theme.error },

  toastText: {
    color: theme.white,
    fontSize: rf(16),
    fontWeight: '600',
    textAlign: 'center',
  },

  // 列表
  listSection: {
    flex: 1,
    marginTop: Spacing.md,
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
    fontSize: rf(12),
    fontWeight: '600',
    color: theme.textSecondary,
  },

  listCount: {
    fontSize: rf(12),
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

  itemModelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
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

  itemCode: {
    fontSize: rf(11),
    color: theme.textMuted,
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

  itemQtyLabel: {
    fontSize: rf(11),
    color: theme.textMuted,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },

  actualRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginTop: 1,
  },

  actualLabel: {
    fontSize: rf(11),
    color: theme.textMuted,
  },

  actualQty: {
    fontSize: rf(14),
    fontWeight: '700',
    color: theme.accent,
  },

  itemTime: {
    fontSize: rf(10),
    color: theme.textMuted,
    marginTop: 1,
  },

  // 聚合项容器
  itemContainer: {
    marginBottom: Spacing.xs,
  },

  // 型号内容区域（包含箭头和型号）
  modelContent: {
    flex: 1,
  },

  // 聚合项内容区域
  itemContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // 明细容器
  detailsContainer: {
    backgroundColor: theme.backgroundTertiary,
    marginLeft: Spacing.xl,
    marginRight: Spacing.sm,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },

  // 明细项
  detailItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginVertical: 2,
    borderRadius: BorderRadius.sm,
  },

  // 明细文本
  detailText: {
    fontSize: rf(12),
    color: theme.textSecondary,
  },

  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },

  emptyText: {
    fontSize: rf(16),
    color: theme.textMuted,
  },

  // 操作按钮
  actionBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.borderLight,
  },

  clearBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
  },

  clearBtnText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.textSecondary,
  },

  submitBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: theme.primary,
    alignItems: 'center',
  },

  submitBtnText: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.buttonPrimaryText,
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
    fontSize: rf(13),
    color: theme.textSecondary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: theme.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '85%',
    maxWidth: 300,
  },

  modalTitle: {
    fontSize: rf(16),
    fontWeight: '600',
    color: theme.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },

  modalInput: {
    fontSize: rf(14),
    fontWeight: '500',
    color: theme.textPrimary,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.sm,
    backgroundColor: theme.backgroundTertiary,
    borderRadius: BorderRadius.sm,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  modalCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: theme.backgroundTertiary,
    alignItems: 'center',
  },

  modalCancelText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: theme.textPrimary,
  },

  modalConfirmBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: theme.primary,
    alignItems: 'center',
  },

  modalConfirmText: {
    fontSize: rf(13),
    fontWeight: '600',
    color: theme.buttonPrimaryText,
  },

  // 已保存记录弹窗样式
  savedEmptyText: {
    fontSize: rf(14),
    color: theme.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  savedList: {
    maxHeight: 300,
  },

  savedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.borderLight,
  },

  savedItemLeft: {
    flex: 1,
  },

  savedModel: {
    fontSize: rf(14),
    fontWeight: '600',
    color: theme.textPrimary,
  },

  savedDate: {
    fontSize: rf(12),
    color: theme.textMuted,
    marginTop: 2,
  },

  savedItemRight: {
    alignItems: 'flex-end',
  },

  savedQty: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.primary,
  },

  // 已保存盘点弹窗
  modalInfo: {
    maxHeight: '70%',
  },

  savedModalContent: {
    backgroundColor: theme.backgroundDefault,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    width: '85%',
    maxWidth: 320,
  },

  savedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },

  savedModalTitle: {
    fontSize: rf(16),
    fontWeight: '700',
    color: theme.textPrimary,
  },

  savedEmpty: {
    paddingVertical: Spacing.xl,
  },
});
