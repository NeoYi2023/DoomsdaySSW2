import type {
  Quest,
  QuestStatus,
  QuestTriggerType,
  QuestCompletionType,
  QuestTriggerCondition,
  QuestCompletionCondition,
  QuestReward,
  QuestConfigEntry,
  Explorer,
  ResourceStack,
  ItemStack,
} from '../types/gameTypes';

export interface QuestSystemContext {
  currentRound: number;
  currentDay: number;
  shelterLevel: number;
  explorers: Explorer[];
  completedQuests: Set<string>; // 已完成的任务ID集合
  completedExplorations: Map<string, number>; // 探索点ID -> 完成次数
  defeatedMonsters: Map<string, number>; // 怪物ID -> 击败次数
  builtFacilities: Map<string, number>; // 建筑类型ID -> 建设数量
}

/**
 * 解析触发条件参数
 */
function parseTriggerParams(paramsStr?: string): Record<string, unknown> {
  if (!paramsStr) return {};
  try {
    // 尝试解析为JSON
    return JSON.parse(paramsStr);
  } catch {
    // 如果不是JSON，尝试解析为键值对格式（如 "round=10" 或 "resourceId=food;quantity=5"）
    const result: Record<string, unknown> = {};
    const pairs = paramsStr.split(';');
    for (const pair of pairs) {
      const [key, value] = pair.split('=').map((s) => s.trim());
      if (key && value) {
        // 尝试转换为数字
        const numValue = Number(value);
        result[key] = isNaN(numValue) ? value : numValue;
      }
    }
    return result;
  }
}

/**
 * 检查触发条件是否满足
 */
export function checkTriggerCondition(
  condition: QuestTriggerCondition,
  ctx: QuestSystemContext,
): boolean {
  const { type, params } = condition;

  switch (type) {
    case 'RoundReached': {
      const round = params.round as number;
      return ctx.currentRound >= round;
    }

    case 'QuestCompleted': {
      const questId = params.questId as string;
      return ctx.completedQuests.has(questId);
    }

    case 'ResourceOwned': {
      const resourceId = params.resourceId as string;
      const quantity = params.quantity as number;
      // 统计所有角色背包中该资源的总数量
      let total = 0;
      for (const explorer of ctx.explorers) {
        for (const item of explorer.inventory) {
          if (item.itemId === resourceId) {
            total += item.quantity;
          }
        }
      }
      return total >= quantity;
    }

    case 'ExplorationCompleted': {
      const explorationPointId = params.explorationPointId as string;
      const count = ctx.completedExplorations.get(explorationPointId) || 0;
      return count > 0;
    }

    case 'MonsterDefeated': {
      const monsterId = params.monsterId as string;
      const quantity = (params.quantity as number) || 1;
      const count = ctx.defeatedMonsters.get(monsterId) || 0;
      return count >= quantity;
    }

    case 'ShelterLevelReached': {
      const level = params.level as number;
      return ctx.shelterLevel >= level;
    }

    default:
      return false;
  }
}

/**
 * 计算完成条件的当前值
 */
export function calculateCompletionCurrentValue(
  condition: QuestCompletionCondition,
  ctx: QuestSystemContext,
): number {
  const { type, targetId } = condition;

  switch (type) {
    case 'CollectResource': {
      // 统计所有角色背包中该资源的总数量
      let total = 0;
      for (const explorer of ctx.explorers) {
        for (const item of explorer.inventory) {
          if (item.itemId === targetId) {
            total += item.quantity;
          }
        }
      }
      return total;
    }

    case 'DefeatMonster': {
      return ctx.defeatedMonsters.get(targetId) || 0;
    }

    case 'CompleteExploration': {
      return ctx.completedExplorations.get(targetId) || 0;
    }

    case 'BuildFacility': {
      return ctx.builtFacilities.get(targetId) || 0;
    }

    case 'ReachRound': {
      return ctx.currentRound;
    }

    default:
      return 0;
  }
}

/**
 * 检查完成条件是否满足
 */
export function checkCompletionCondition(condition: QuestCompletionCondition): boolean {
  return condition.currentValue >= condition.targetValue;
}

/**
 * 解析奖励字符串
 */
function parseRewardString(rewardStr?: string): Array<{ id: string; quantity: number }> {
  if (!rewardStr) return [];
  const rewards: Array<{ id: string; quantity: number }> = [];
  const entries = rewardStr.split('|');
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const parts = trimmed.split('_');
    if (parts.length >= 2) {
      const id = parts.slice(0, -1).join('_'); // 支持ID中包含下划线
      const quantity = Number(parts[parts.length - 1]);
      if (!isNaN(quantity)) {
        rewards.push({ id, quantity });
      }
    }
  }
  return rewards;
}

/**
 * 从配置创建任务实例
 */
export function createQuestFromConfig(config: QuestConfigEntry): Quest {
  const triggerCondition: QuestTriggerCondition = {
    type: config.触发条件类型 as QuestTriggerType,
    params: parseTriggerParams(config.触发条件参数),
  };

  const completionCondition: QuestCompletionCondition = {
    type: config.完成条件类型 as QuestCompletionType,
    targetId: config.完成条件目标ID,
    targetValue: config.完成条件目标值,
    currentValue: 0, // 初始值为0，后续动态更新
  };

  const resourceRewards = parseRewardString(config.奖励资源列表);
  const itemRewards = parseRewardString(config.奖励道具列表);

  const reward: QuestReward = {
    resources: resourceRewards.map((r) => ({ resourceId: r.id, quantity: r.quantity })),
    items: itemRewards.map((r) => ({ itemId: r.id, quantity: r.quantity })),
  };

  // 判断是否为章节结束任务
  const isChapterEndQuest =
    config.是否章节结束任务 === true ||
    config.是否章节结束任务 === 'true' ||
    config.是否章节结束任务 === '1';

  return {
    questId: config.ID,
    config,
    status: 'NotTriggered',
    triggerCondition,
    completionCondition,
    reward,
    nextQuestId: config.下一个任务ID,
    priority: config.优先级 ?? 999, // 默认优先级为999（最低）
    isChapterEndQuest,
  };
}

/**
 * 更新任务的完成条件当前值
 */
export function updateQuestCompletionValue(quest: Quest, ctx: QuestSystemContext): Quest {
  const newCurrentValue = calculateCompletionCurrentValue(quest.completionCondition, ctx);
  return {
    ...quest,
    completionCondition: {
      ...quest.completionCondition,
      currentValue: newCurrentValue,
    },
  };
}

/**
 * 尝试自动领取任务（检查触发条件）
 */
export function tryAutoAcceptQuest(quest: Quest, ctx: QuestSystemContext): Quest {
  if (quest.status !== 'NotTriggered') {
    return quest; // 已经触发或已领取，不需要检查
  }

  if (checkTriggerCondition(quest.triggerCondition, ctx)) {
    return {
      ...quest,
      status: 'Accepted',
    };
  }

  return quest;
}

/**
 * 完成任务
 */
export function completeQuest(quest: Quest): Quest {
  if (quest.status !== 'Accepted') {
    return quest; // 只能从"已领取"状态转为"已完成"
  }

  if (!checkCompletionCondition(quest.completionCondition)) {
    return quest; // 完成条件未满足
  }

  return {
    ...quest,
    status: 'Completed',
  };
}

/**
 * 领取奖励
 */
export function claimQuestReward(quest: Quest): Quest {
  if (quest.status !== 'Completed') {
    return quest; // 只能从"已完成"状态转为"已领取奖励"
  }

  return {
    ...quest,
    status: 'RewardClaimed',
  };
}

/**
 * 任务系统主类
 */
export class QuestSystem {
  private quests: Map<string, Quest> = new Map();
  private ctx: QuestSystemContext;

  constructor(questConfigs: QuestConfigEntry[], initialContext: QuestSystemContext) {
    this.ctx = initialContext;
    // 初始化所有任务
    for (const config of questConfigs) {
      const quest = createQuestFromConfig(config);
      this.quests.set(quest.questId, quest);
    }
  }

  /**
   * 更新上下文
   */
  updateContext(ctx: Partial<QuestSystemContext>): void {
    this.ctx = { ...this.ctx, ...ctx };
  }

  /**
   * 获取所有任务
   */
  getAllQuests(): Quest[] {
    return Array.from(this.quests.values());
  }

  /**
   * 获取已领取的任务（用于界面显示）
   */
  getAcceptedQuests(): Quest[] {
    return this.getAllQuests()
      .filter((q) => q.status === 'Accepted' || q.status === 'Completed' || q.status === 'RewardClaimed')
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * 检查并自动领取满足触发条件的任务
   */
  checkAndAutoAcceptQuests(): Quest[] {
    const updatedQuests: Quest[] = [];
    for (const quest of this.quests.values()) {
      const updated = tryAutoAcceptQuest(quest, this.ctx);
      if (updated.status !== quest.status) {
        this.quests.set(updated.questId, updated);
        updatedQuests.push(updated);
      }
    }
    return updatedQuests;
  }

  /**
   * 更新所有已领取任务的完成条件当前值
   */
  updateAllQuestProgress(): void {
    for (const quest of this.quests.values()) {
      if (quest.status === 'Accepted' || quest.status === 'Completed') {
        const updated = updateQuestCompletionValue(quest, this.ctx);
        this.quests.set(updated.questId, updated);
      }
    }
  }

  /**
   * 完成任务
   * 返回：{ success: boolean, isChapterEndQuest: boolean }
   */
  completeQuest(questId: string): { success: boolean; isChapterEndQuest: boolean } {
    const quest = this.quests.get(questId);
    if (!quest) return { success: false, isChapterEndQuest: false };

    const updated = completeQuest(quest);
    if (updated.status === 'Completed') {
      this.quests.set(questId, updated);
      // 标记为已完成
      this.ctx.completedQuests.add(questId);
      // 检查是否有下一个任务需要自动领取
      this.checkAndAutoAcceptQuests();
      return { success: true, isChapterEndQuest: updated.isChapterEndQuest };
    }
    return { success: false, isChapterEndQuest: false };
  }

  /**
   * 领取任务奖励
   */
  claimReward(questId: string): QuestReward | null {
    const quest = this.quests.get(questId);
    if (!quest) return null;

    const updated = claimQuestReward(quest);
    if (updated.status === 'RewardClaimed') {
      this.quests.set(questId, updated);
      // 检查是否有下一个任务需要自动领取
      if (updated.nextQuestId) {
        this.checkAndAutoAcceptQuests();
      }
      return quest.reward;
    }
    return null;
  }

  /**
   * 获取任务
   */
  getQuest(questId: string): Quest | undefined {
    return this.quests.get(questId);
  }

  /**
   * 记录探索完成
   */
  recordExplorationCompleted(explorationPointId: string): void {
    const count = this.ctx.completedExplorations.get(explorationPointId) || 0;
    this.ctx.completedExplorations.set(explorationPointId, count + 1);
    this.updateAllQuestProgress();
    this.checkAndAutoAcceptQuests();
  }

  /**
   * 记录怪物击败
   */
  recordMonsterDefeated(monsterId: string): void {
    const count = this.ctx.defeatedMonsters.get(monsterId) || 0;
    this.ctx.defeatedMonsters.set(monsterId, count + 1);
    this.updateAllQuestProgress();
    this.checkAndAutoAcceptQuests();
  }

  /**
   * 记录建筑建设
   */
  recordFacilityBuilt(facilityId: string): void {
    const count = this.ctx.builtFacilities.get(facilityId) || 0;
    this.ctx.builtFacilities.set(facilityId, count + 1);
    this.updateAllQuestProgress();
    this.checkAndAutoAcceptQuests();
  }

  /**
   * 更新回合数（用于触发回合数相关任务）
   */
  updateRound(round: number, day: number): void {
    this.ctx.currentRound = round;
    this.ctx.currentDay = day;
    this.updateAllQuestProgress();
    this.checkAndAutoAcceptQuests();
  }

  /**
   * 更新避难所等级（用于触发避难所等级相关任务）
   */
  updateShelterLevel(level: number): void {
    this.ctx.shelterLevel = level;
    this.checkAndAutoAcceptQuests();
  }

  /**
   * 更新角色列表（用于资源收集类任务）
   */
  updateExplorers(explorers: Explorer[]): void {
    this.ctx.explorers = explorers;
    this.updateAllQuestProgress();
    this.checkAndAutoAcceptQuests();
  }
}

