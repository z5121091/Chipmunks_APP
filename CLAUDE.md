# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## 5. 仓库切换规范（三大扫码页面）

三大扫码页面：**扫码入库**、**盘点**、**扫码出库**

### 5.1 仓库持久化

用户切换仓库后，下次进入该页面应恢复上次选择的仓库，而不是重置为默认仓库。

**实现方式**：
```typescript
// 1. 定义存储键
const PAGE_WAREHOUSE_KEY = 'page_current_warehouse';

// 2. loadWarehouses() 中优先恢复
const loadWarehouses = async () => {
  const list = await getAllWarehouses();
  setWarehouses(list);
  
  // 优先恢复之前选择的仓库
  const savedWarehouse = await AsyncStorage.getItem(PAGE_WAREHOUSE_KEY);
  if (savedWarehouse) {
    const warehouse = JSON.parse(savedWarehouse);
    if (list.find(w => w.id === warehouse.id)) {
      setCurrentWarehouse(warehouse);
      return;
    }
  }
  
  // 无保存记录，使用默认仓库
  const def = await getDefaultWarehouse();
  setCurrentWarehouse(def || list[0] || null);
};

// 3. 切换仓库时保存
const handleWarehouseChange = (warehouse: Warehouse) => {
  setCurrentWarehouse(warehouse);
  AsyncStorage.setItem(PAGE_WAREHOUSE_KEY, JSON.stringify(warehouse));
};
```

### 5.2 切换仓库时的 C+B 逻辑

用户切换仓库时，必须先保存当前数据，再清空页面积累数据。

**执行顺序**：C（保存） → B（清空） → 切换

| 页面 | C: 保存 | B: 清空 |
|------|---------|---------|
| 扫码入库 | 扫描记录（saveScanRecords） | 扫描记录 + 展开状态 + 确认状态 |
| 盘点 | 扫描记录（saveCheckRecords） | 扫描记录 + 展开状态 |
| 扫码出库 | 无（订单/物料实时查询） | 订单号 + 物料列表 + 展开状态 |

**代码模板**：
```typescript
const selectWarehouse = async (wh: Warehouse) => {
  // 如果选择的是当前仓库，直接关闭弹窗
  if (wh.id === currentWarehouse?.id) {
    setShowWarehousePicker(false);
    return;
  }

  // C: 保存当前记录（如有持久化逻辑）
  if (scanRecords.length > 0) {
    await saveScanRecords(scanRecords);
  }

  // B: 清空当前页面积累数据
  setScanRecords([]);
  setExpandedGroups(new Set());

  // 切换到新仓库
  handleWarehouseChange(wh);
  setShowWarehousePicker(false);
  showToast(`已切换到 ${wh.name}`, 'success');
};
```

### 5.3 仓库选择器弹窗交互

选择相同仓库时：直接关闭弹窗，不做其他操作。
