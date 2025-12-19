import type {
  Explorer,
  ExplorationBoardLayer,
  ResourceStack,
  GarbageConfigEntry,
  AdvancedOutputConditionConfigEntry,
} from '../types/gameTypes';

/** 通用参数解析："key=value;key2=3" -> { key: 'value', key2: 3 } */
export function parseParams(raw?: string): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  if (!raw) return result;
  const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (!k) continue;
    const key = k.trim();
    const valueRaw = (v ?? '').trim();
    if (valueRaw === '') {
      result[key] = '';
      continue;
    }
    const num = Number(valueRaw);
    result[key] = Number.isNaN(num) ? valueRaw : num;
  }
  return result;
}

/** 解析 "资源ID_数量|资源ID_数量" 为 ResourceStack[] */
export function parseResourceStacks(raw?: string): ResourceStack[] {
  if (!raw) return [];
  return raw
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      // 从最后一个下划线处分割，因为资源ID可能包含下划线（如 resource_food_3）
      const lastUnderscoreIndex = entry.lastIndexOf('_');
      if (lastUnderscoreIndex === -1) {
        // 没有下划线，整个字符串作为资源ID，数量默认为1
        return { resourceId: entry, quantity: 1 };
      }
      const id = entry.substring(0, lastUnderscoreIndex);
      const qtyStr = entry.substring(lastUnderscoreIndex + 1);
      const quantity = Number(qtyStr) || 1;
      return { resourceId: id, quantity };
    });
}

/** 将 ResourceStack[] 转回字符串形式，方便存回配置或日志。 */
export function formatResourceStacks(stacks: ResourceStack[]): string {
  return stacks.map((s) => `${s.resourceId}_${s.quantity}`).join('|');
}

// ====== 技能/天赋效果注册表骨架 ======

export type SkillTriggerTiming =
  | 'OnBattleStart'
  | 'OnAttack'
  | 'OnFirstAttack'
  | 'OnGarbageSearched'
  | 'OnWorldMove'
  | 'OnEnterExplorationBoard'
  | 'OnAllyDamaged'
  | 'OnDamageTaken'
  | 'OnReturnToShelter';

export type SkillTargetType =
  | 'Self'
  | 'CurrentExplorer'
  | 'Team'
  | 'Enemy'
  | 'EnemiesInRange';

export interface BattleContext {
  board: ExplorationBoardLayer;
  explorers: Map<string, Explorer>;
  monsters: Map<string, { currentHp: number; attack: number }>;
  actorId: string;
}

export interface GarbageSearchContext {
  explorers: Explorer[];
  garbageConfig: GarbageConfigEntry;
}

export type SkillEffectHandler = (
  params: Record<string, string | number>,
  ctx: BattleContext | GarbageSearchContext,
) => void;

export const skillEffectRegistry: Record<string, SkillEffectHandler> = {
  // 示例：战斗开始时给自己护盾（这里只示意，在真正数值系统接入时再实现具体护盾字段）
  Skill_EnergyShield: (params, ctx) => {
    // 这里只预留接口，不修改具体数值，后续接入 HP/护盾系统时再扩展
    void params;
    void ctx;
  },
  // 更多技能效果可以在此处按 ID 添加
};

export type TalentEffectHandler = SkillEffectHandler;

export const talentEffectRegistry: Record<string, TalentEffectHandler> = {
  Talent_HardenedExplorer: (params, ctx) => {
    // 示例：最大生命 +20。真实实现时应在角色属性初始化/刷新时应用。
    void params;
    void ctx;
  },
};

// ====== 垃圾进阶产出机制 ======

export interface AdvancedOutputEvaluationContext {
  explorers: Explorer[];
  garbageConfig: GarbageConfigEntry;
  board: ExplorationBoardLayer; // 当前探索棋盘数据（包含所有格子的位置和垃圾ID）
  allGarbageConfigs: GarbageConfigEntry[]; // 所有垃圾配置（用于根据垃圾ID查找配置）
}

export type AdvancedOutputConditionHandler = (
  condition: AdvancedOutputConditionConfigEntry,
  ctx: AdvancedOutputEvaluationContext,
) => boolean;

const advancedOutputConditionHandlers: Record<string, AdvancedOutputConditionHandler> = {
  /**
   * ExplorerTagCount:
   * - 参数示例："ExplorerTag=Engineer;MinCount=2";
   * - 逻辑：统计 explorers 中 config.末日前身份标签 中包含该标签的角色数量，数量 >= MinCount 则返回 true。
   */
  ExplorerTagCount: (condition, ctx) => {
    const params = parseParams(condition.触发条件参数);
    const tag = String(params.ExplorerTag ?? '');
    const minCount = Number(params.MinCount ?? 1) || 1;
    if (!tag) return false;

    const count = ctx.explorers.filter((ex) => {
      const tagsRaw = (ex.config as any).末日前身份标签 as string | undefined;
      if (!tagsRaw) return false;
      const tags = tagsRaw.split('|').map((t) => t.trim()).filter(Boolean);
      return tags.includes(tag);
    }).length;

    return count >= minCount;
  },
  /**
   * Advanced_10002:
   * - 参数示例："MinCount=2";
   * - 逻辑：检查整个探索棋盘上，是否有至少 MinCount 个垃圾满足以下条件：
   *   1. 拥有当前触发机制ID（在垃圾的 进阶产出机制ID列表 中）
   *   2. 垃圾类型与条件的 适用垃圾类型列表 有交集
   *   3. 这些垃圾的X轴坐标相同（在同一列）
   * - 如果满足，返回 true，触发这些垃圾的进阶产出机制
   */
  Advanced_10002: (condition, ctx) => {
    const params = parseParams(condition.触发条件参数);
    const minCount = Number(params.MinCount ?? 2) || 2;

    // 获取条件的适用垃圾类型列表
    const condTypesRaw = condition.适用垃圾类型列表 ?? '';
    const condTypes = Array.isArray(condTypesRaw)
      ? condTypesRaw.map((t) => String(t).trim()).filter(Boolean)
      : String(condTypesRaw)
          .split('|')
          .map((t) => t.trim())
          .filter(Boolean);

    // 创建垃圾ID到配置的映射
    const garbageConfigMap = new Map<string, GarbageConfigEntry>();
    for (const gc of ctx.allGarbageConfigs) {
      garbageConfigMap.set(gc.ID, gc);
    }

    // 按X轴坐标分组统计满足条件的垃圾
    const garbageByX = new Map<number, number>(); // Map<X坐标, 满足条件的垃圾数量>

    // 遍历棋盘上所有格子
    for (const cell of ctx.board.cells) {
      if (!cell.garbageId) continue;

      const garbageConfig = garbageConfigMap.get(cell.garbageId);
      if (!garbageConfig) continue;

      // 检查1：该垃圾的 进阶产出机制ID列表 是否包含当前条件的ID
      const advancedIdsRaw = garbageConfig.进阶产出机制ID列表 ?? '';
      const advancedIds = Array.isArray(advancedIdsRaw)
        ? advancedIdsRaw.map((id) => String(id).trim()).filter(Boolean)
        : String(advancedIdsRaw)
            .split('|')
            .map((id) => id.trim())
            .filter(Boolean);
      
      if (!advancedIds.includes(condition.ID)) continue;

      // 检查2：垃圾类型是否与条件的适用类型有交集
      const garbageTypesRaw = garbageConfig.垃圾类型列表 ?? '';
      const garbageTypes = Array.isArray(garbageTypesRaw)
        ? garbageTypesRaw.map((t) => String(t).trim()).filter(Boolean)
        : String(garbageTypesRaw)
            .split('|')
            .map((t) => t.trim())
            .filter(Boolean);
      
      const hasTypeIntersection = condTypes.length === 0 ||
        condTypes.some((t) => garbageTypes.includes(t));
      
      if (!hasTypeIntersection) continue;

      // 满足条件：计算X轴坐标并统计
      const x = cell.index % 6; // X轴坐标（列，0-5）
      const currentCount = garbageByX.get(x) || 0;
      garbageByX.set(x, currentCount + 1);
    }

    // 检查是否有任一X轴上的满足条件的垃圾数量 >= MinCount
    for (const count of garbageByX.values()) {
      if (count >= minCount) {
        return true;
      }
    }

    return false;
  },
};

export interface ResolvedGarbageOutput {
  loot: ResourceStack[];
  isAdvanced: boolean;
  relatedExplorerIds: string[]; // 触发进阶产出条件的相关角色ID
}

/**
 * 根据 GarbageConfig + AdvancedOutputConditionConfig 列表与当前上下文，
 * 决定最终的资源产出：
 * - 若任一进阶产出机制命中，则使用 garbage.进阶产出；
 * - 否则使用 garbage.默认搜索产出。
 */
export function resolveGarbageOutput(
  garbageConfig: GarbageConfigEntry,
  allConditions: AdvancedOutputConditionConfigEntry[],
  ctx: AdvancedOutputEvaluationContext,
): ResolvedGarbageOutput {
  // 支持字符串和数组两种格式
  const advancedIdsRaw = garbageConfig.进阶产出机制ID列表 ?? '';
  const advancedIds = Array.isArray(advancedIdsRaw)
    ? advancedIdsRaw.map((id) => String(id).trim()).filter(Boolean)
    : String(advancedIdsRaw)
        .split('|')
        .map((id) => id.trim())
        .filter(Boolean);

  const applicableConditions = allConditions.filter((c) => advancedIds.includes(c.ID));
  
  if (applicableConditions.length === 0) {
    return {
      loot: parseResourceStacks(garbageConfig.默认搜索产出),
      isAdvanced: false,
      relatedExplorerIds: [],
    };
  }

  // 支持字符串和数组两种格式
  const targetTypesRaw = garbageConfig.垃圾类型列表 ?? '';
  const targetTypes = Array.isArray(targetTypesRaw)
    ? targetTypesRaw.map((t) => String(t).trim()).filter(Boolean)
    : String(targetTypesRaw)
        .split('|')
        .map((t) => t.trim())
        .filter(Boolean);

  let matchedCondition: AdvancedOutputConditionConfigEntry | null = null as AdvancedOutputConditionConfigEntry | null;
  const matched = applicableConditions.some((cond) => {
    // 对于需要检查整个棋盘的触发条件类型（如 Advanced_10002），跳过类型预检查
    // 因为这些条件会在 handler 内部检查整个棋盘上所有垃圾的类型
    const needsFullBoardCheck = cond.触发条件类型 === 'Advanced_10002';
    
    if (!needsFullBoardCheck) {
      // 类型过滤：仅当垃圾类型与条件适用类型有交集时才评估
      // 支持字符串和数组两种格式
      const condTypesRaw = cond.适用垃圾类型列表 ?? '';
      const condTypes = Array.isArray(condTypesRaw)
        ? condTypesRaw.map((t) => String(t).trim()).filter(Boolean)
        : String(condTypesRaw)
            .split('|')
            .map((t) => t.trim())
            .filter(Boolean);
      const hasTypeIntersection = condTypes.length === 0 ||
        condTypes.some((t) => targetTypes.includes(t));
      
      if (!hasTypeIntersection) return false;
    }

    const handler = advancedOutputConditionHandlers[cond.触发条件类型];
    if (!handler) return false;
    
    const result = handler(cond, ctx);
    
    if (result) {
      matchedCondition = cond;
    }
    return result;
  });

  // 收集相关角色ID（触发条件的角色）
  const relatedExplorerIds: string[] = [];
  if (matchedCondition && matchedCondition.触发条件类型 === 'ExplorerTagCount') {
    const params = parseParams((matchedCondition as AdvancedOutputConditionConfigEntry).触发条件参数);
    const tag = String(params.ExplorerTag ?? '');
    if (tag) {
      ctx.explorers.forEach((ex) => {
        const tagsRaw = (ex.config as any).末日前身份标签 as string | undefined;
        if (tagsRaw) {
          const tags = tagsRaw.split('|').map((t) => t.trim()).filter(Boolean);
          if (tags.includes(tag)) {
            relatedExplorerIds.push(ex.id);
          }
        }
      });
    }
  }

  if (matched && garbageConfig.进阶产出) {
    return {
      loot: parseResourceStacks(garbageConfig.进阶产出),
      isAdvanced: true,
      relatedExplorerIds,
    };
  }

  return {
    loot: parseResourceStacks(garbageConfig.默认搜索产出),
    isAdvanced: false,
    relatedExplorerIds: [],
  };
}
