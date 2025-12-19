export interface ExplorerConfigEntry {
  ID: string; // explorerId
  名称Key: string;
  描述Key?: string;
  最大生命?: number;
  初始生命?: number;
  最大体力?: number;
  初始体力?: number;
  攻击力?: number;
  背包格子数量?: number; // inventoryCapacity
  初始天赋ID列表?: string; // Talent IDs joined by |
}

export interface MonsterConfigEntry {
  ID: string; // monsterId
  名称Key: string;
  描述Key?: string;
  血量: number;
  攻击力: number;
  出现时间段?: string;
  出现概率?: number;
}

export interface MapConfigEntry {
  X坐标: number;
  Y坐标: number;
  格子类型: string;
  初始状态?: string;
  资源生成规则ID?: string;
  可建设类型?: string;
}

export interface ExplorationPointConfigEntry {
  ID: string; // explorationPointId
  名称Key: string;
  描述Key?: string;
  最大层数: number;
  探索难度: string;
  棋盘出现内容: string | string[]; // 字符串格式: "Monster_monster_zombie_10|Garbage_garbage_trash_5" 或数组格式: ["Monster_monster_zombie_10", "Garbage_garbage_trash_5"]
}

export interface ResourceConfigEntry {
  ID: string;
  名称Key: string;
  描述Key?: string;
  基础产出: number;
  稀有度: string;
  资源类型: string;
  堆叠最大数量: number;
}

export interface ItemConfigEntry {
  ID: string;
  名称Key: string;
  描述Key?: string;
  道具类型: string;
  使用效果类型: string;
  使用效果数值?: number | string;
  消耗条件?: string;
  堆叠最大数量: number;
}

export interface ShelterLevelConfigEntry {
  等级: number;
  默认解锁设施ID列表?: string;
  可建造设施ID列表?: string;
  最大设施数量?: number;
  升级前置条件资源ID?: string;
  升级前置条件资源数量?: number;
}

export interface GarbageConfigEntry {
  ID: string; // garbageId
  名称Key: string;
  描述Key?: string;
  默认搜索产出: string; // 资源ID_数量|资源ID_数量
  垃圾类型列表: string; // 类型A|类型B
  进阶产出机制ID列表?: string; // condition ids joined by |
  进阶产出?: string; // 资源ID_数量|资源ID_数量
}

export interface AdvancedOutputConditionConfigEntry {
  ID: string; // conditionId
  名称Key: string;
  描述Key?: string;
  适用垃圾类型列表: string; // 类型A|类型B
  触发条件类型: string;
  触发条件参数?: string;
}

export interface SkillConfigEntry {
  ID: string; // skillId
  名称Key: string;
  描述Key?: string;
  效果类型: string;
  效果参数?: string;
  触发时机: string;
  作用目标: string;
  消耗道具ID?: string;
}

export interface TalentConfigEntry {
  ID: string; // talentId
  名称Key: string;
  描述Key?: string;
  效果类型: string;
  效果参数?: string;
  解锁条件类型?: string;
  解锁条件参数?: string;
  是否可叠加?: boolean | string;
  最大叠加层数?: number | string;
}

export interface ConfigBundle {
  explorers: ExplorerConfigEntry[];
  monsters: MonsterConfigEntry[];
  mapCells: MapConfigEntry[];
  explorationPoints: ExplorationPointConfigEntry[];
  resources: ResourceConfigEntry[];
  items: ItemConfigEntry[];
  shelterLevels: ShelterLevelConfigEntry[];
  garbages: GarbageConfigEntry[];
  advancedOutputConditions: AdvancedOutputConditionConfigEntry[];
  skills: SkillConfigEntry[];
  talents: TalentConfigEntry[];
}
