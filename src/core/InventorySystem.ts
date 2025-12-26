import type { Explorer, ItemStack, DroppedItemOnCell } from '../types/gameTypes';

export interface AddItemOptions {
  getMaxStack: (itemId: string) => number;
}

/**
 * 尝试将一组物品按“角色顺序，从前到后挨个塞满背包”的规则分配到小队角色背包中。
 * 返回未能放入的剩余物品（可由更高层逻辑放入临时背包）。
 */
export function distributeLootToExplorers(
  explorers: Explorer[],
  loot: ItemStack[],
  options: AddItemOptions,
): ItemStack[] {
  const remaining: ItemStack[] = [];

  for (const stack of loot) {
    let toPlace = { ...stack };

    // 负值处理：从背包中减少资源
    if (toPlace.quantity < 0) {
      for (const explorer of explorers) {
        toPlace = removeFromExplorerInventory(explorer, toPlace);
        if (toPlace.quantity >= 0) break; // 已经减少完毕或无法再减少
      }
      // 负值减少后，剩余部分不再处理（不会扣到负数）
      continue;
    }

    // 正值处理：添加到背包
    for (const explorer of explorers) {
      toPlace = addToExplorerInventory(explorer, toPlace, options.getMaxStack);
      if (toPlace.quantity <= 0) break;
    }

    if (toPlace.quantity > 0) {
      remaining.push(toPlace);
    }
  }

  return remaining;
}

/**
 * 向单个角色背包中添加物品，优先：
 * 1. 填满已有同 ID 堆叠；
 * 2. 若仍有剩余且背包还有空格，则开新的堆叠；
 * 返回“尚未能放入”的那部分。
 */
export function addToExplorerInventory(
  explorer: Explorer,
  stack: ItemStack,
  getMaxStack: (itemId: string) => number,
): ItemStack {
  if (stack.quantity <= 0) return { ...stack };

  const maxStack = getMaxStack(stack.itemId);
  const inv = explorer.inventory;

  // 1. 先填充已有堆叠
  for (const slot of inv) {
    if (slot.itemId !== stack.itemId) continue;
    const canAdd = Math.max(0, maxStack - slot.quantity);
    if (canAdd <= 0) continue;

    const add = Math.min(canAdd, stack.quantity);
    slot.quantity += add;
    stack.quantity -= add;
    if (stack.quantity <= 0) return { ...stack };
  }

  // 2. 再尝试使用空格
  while (stack.quantity > 0 && inv.length < explorer.inventoryCapacity) {
    const add = Math.min(maxStack, stack.quantity);
    inv.push({ itemId: stack.itemId, quantity: add });
    stack.quantity -= add;
  }

  return { ...stack };
}

/**
 * 从单个角色背包中减少物品（用于负值产出）。
 * 优先减少已有堆叠，如果数量不足则只减少到0（不扣到负数）。
 * 如果背包中没有该资源，直接返回（不减少）。
 * 返回"尚未能减少"的那部分（负数，表示还需要减少的数量）。
 */
export function removeFromExplorerInventory(
  explorer: Explorer,
  stack: ItemStack,
): ItemStack {
  if (stack.quantity >= 0) return { ...stack }; // 只处理负值

  const inv = explorer.inventory;
  let toRemove = Math.abs(stack.quantity); // 转为正数处理

  // 从背包中查找并减少对应资源
  for (const slot of inv) {
    if (slot.itemId !== stack.itemId) continue;
    if (slot.quantity <= 0) continue;

    const remove = Math.min(toRemove, slot.quantity);
    slot.quantity -= remove;
    toRemove -= remove;

    // 如果该格子数量为0，可以考虑移除（但为了保持格子结构，暂时保留）
    if (slot.quantity <= 0) {
      slot.quantity = 0;
    }

    if (toRemove <= 0) break;
  }

  // 返回剩余需要减少的数量（负数）
  return { itemId: stack.itemId, quantity: toRemove > 0 ? -toRemove : 0 };
}

/**
 * 当角色死亡时，生成死亡掉落结构，由更高层逻辑挂到对应地图格子上。
 */
export function createDeathDrop(
  explorer: Explorer,
  currentRound: number,
): DroppedItemOnCell | undefined {
  // 收集背包物品
  const items: ItemStack[] = explorer.inventory.map((it) => ({ ...it }));
  
  // 添加装备到掉落列表
  for (const equipmentId of explorer.equipment) {
    if (equipmentId) {
      items.push({
        itemId: equipmentId,
        quantity: 1,
      });
    }
  }
  
  if (items.length === 0) return undefined;

  return {
    items,
    deathRound: currentRound,
    deadExplorerId: explorer.id,
  };
}
