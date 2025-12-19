import type {
  ExplorerConfigEntry,
  MonsterConfigEntry,
  MapConfigEntry,
  ExplorationPointConfigEntry,
  ResourceConfigEntry,
  ItemConfigEntry,
  GarbageConfigEntry,
  AdvancedOutputConditionConfigEntry,
  SkillConfigEntry,
  TalentConfigEntry,
} from './configTypes';

export interface ItemStack {
  itemId: string;
  quantity: number;
}

export interface ResourceStack {
  resourceId: string;
  quantity: number;
}

export interface Explorer {
  id: string;
  config: ExplorerConfigEntry;
  currentHp: number;
  currentStamina: number;
  inventory: ItemStack[];
  inventoryCapacity: number;
  initialTalentIds: string[];
}

export interface Monster {
  id: string;
  config: MonsterConfigEntry;
  currentHp: number;
}

// 地图格子类型：
// - Shelter / 避难所
// - Road / 道路
// - ExplorationPoint / 探索点
// - Obstacle / 障碍（原“空地”，不可通行）
// - Built / 已建设地点（同样视为障碍）
export type GridCellType = 'Shelter' | 'Road' | 'ExplorationPoint' | 'Obstacle' | 'Built';

export interface DroppedItemOnCell {
  items: ItemStack[];
  deathRound: number;
  deadExplorerId: string;
}

export interface MapCellRuntime {
  x: number;
  y: number;
  type: GridCellType;
  state?: string;
  explorationPointId?: string;
  dropped?: DroppedItemOnCell;
}

export interface ExplorationBoardCell {
  index: number; // 0-23 for 6x4
  explorerId?: string;
  monsterId?: string;
  garbageId?: string;
}

export interface ExplorationBoardLayer {
  layerIndex: number; // 1-based
  cells: ExplorationBoardCell[];
}

export interface ExplorationSession {
  pointConfig: ExplorationPointConfigEntry;
  currentLayerIndex: number;
  maxLayers: number;
  board: ExplorationBoardLayer;
}

export interface GarbageUnitRuntime {
  id: string; // garbageId
  config: GarbageConfigEntry;
}

export interface AdvancedOutputConditionRuntime {
  id: string; // conditionId
  config: AdvancedOutputConditionConfigEntry;
}

export interface SkillRuntime {
  id: string; // skillId
  config: SkillConfigEntry;
}

export interface TalentRuntime {
  id: string; // talentId
  config: TalentConfigEntry;
}

export type {
  ExplorerConfigEntry,
  MonsterConfigEntry,
  MapConfigEntry,
  ExplorationPointConfigEntry,
  ResourceConfigEntry,
  ItemConfigEntry,
  GarbageConfigEntry,
  AdvancedOutputConditionConfigEntry,
  SkillConfigEntry,
  TalentConfigEntry,
};
