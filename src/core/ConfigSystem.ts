import fs from 'fs';
import path from 'path';
import type {
  ConfigBundle,
  ExplorerConfigEntry,
  MonsterConfigEntry,
  MapConfigEntry,
  ExplorationPointConfigEntry,
  ResourceConfigEntry,
  ItemConfigEntry,
  ShelterLevelConfigEntry,
  GarbageConfigEntry,
  AdvancedOutputConditionConfigEntry,
  SkillConfigEntry,
  TalentConfigEntry,
} from '../types/configTypes';

export interface ConfigSystemOptions {
  /**
   * 配置 JSON 根目录，默认指向 `../configs/json`（相对于当前文件编译后的目录）。
   */
  baseDir?: string;
}

/**
 * 负责从 `configs/json` 目录加载所有配置表，并提供按类型访问的统一入口。
 *
 * 该系统设计为纯 Node/服务端逻辑，后续可以在 UI 层注入实例使用。
 */
export class ConfigSystem {
  private readonly baseDir: string;

  private explorers: ExplorerConfigEntry[] = [];
  private monsters: MonsterConfigEntry[] = [];
  private mapCells: MapConfigEntry[] = [];
  private explorationPoints: ExplorationPointConfigEntry[] = [];
  private resources: ResourceConfigEntry[] = [];
  private items: ItemConfigEntry[] = [];
  private shelterLevels: ShelterLevelConfigEntry[] = [];
  private garbages: GarbageConfigEntry[] = [];
  private advancedOutputConditions: AdvancedOutputConditionConfigEntry[] = [];
  private skills: SkillConfigEntry[] = [];
  private talents: TalentConfigEntry[] = [];

  private loaded = false;

  constructor(options: ConfigSystemOptions = {}) {
    const defaultBaseDir = path.resolve(__dirname, '..', '..', 'configs', 'json');
    this.baseDir = options.baseDir ?? defaultBaseDir;
  }

  /**
   * 同步加载所有配置表到内存中。重复调用是幂等的。
   */
  loadAllSync(): void {
    if (this.loaded) return;

    const loadJson = <T>(fileName: string): T => {
      const filePath = path.join(this.baseDir, fileName);
      if (!fs.existsSync(filePath)) {
        throw new Error(`[ConfigSystem] 配置文件不存在: ${filePath}`);
      }
      const raw = fs.readFileSync(filePath, 'utf-8');
      try {
        return JSON.parse(raw) as T;
      } catch (e) {
        throw new Error(`[ConfigSystem] 解析 JSON 失败: ${filePath} - ${(e as Error).message}`);
      }
    };

    this.explorers = loadJson<ExplorerConfigEntry[]>('ExplorerConfig.json');
    this.monsters = loadJson<MonsterConfigEntry[]>('MonsterConfig.json');
    this.mapCells = loadJson<MapConfigEntry[]>('MapConfig.json');
    this.explorationPoints = loadJson<ExplorationPointConfigEntry[]>('ExplorationPointConfig.json');
    this.resources = loadJson<ResourceConfigEntry[]>('ResourceConfig.json');
    this.items = loadJson<ItemConfigEntry[]>('ItemConfig.json');
    this.shelterLevels = loadJson<ShelterLevelConfigEntry[]>('ShelterLevelConfig.json');
    this.garbages = loadJson<GarbageConfigEntry[]>('GarbageConfig.json');
    this.advancedOutputConditions = loadJson<AdvancedOutputConditionConfigEntry[]>(
      'AdvancedOutputConditionConfig.json',
    );
    this.skills = loadJson<SkillConfigEntry[]>('SkillConfig.json');
    this.talents = loadJson<TalentConfigEntry[]>('TalentConfig.json');

    this.loaded = true;
  }

  /**
   * 返回一个方便调试使用的整体打包对象。
   */
  getBundle(): ConfigBundle {
    if (!this.loaded) {
      this.loadAllSync();
    }

    return {
      explorers: this.explorers,
      monsters: this.monsters,
      mapCells: this.mapCells,
      explorationPoints: this.explorationPoints,
      resources: this.resources,
      items: this.items,
      shelterLevels: this.shelterLevels,
      garbages: this.garbages,
      advancedOutputConditions: this.advancedOutputConditions,
      skills: this.skills,
      talents: this.talents,
    };
  }

  getExplorers(): ExplorerConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.explorers;
  }

  getMonsters(): MonsterConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.monsters;
  }

  getMapCells(): MapConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.mapCells;
  }

  getExplorationPoints(): ExplorationPointConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.explorationPoints;
  }

  getResources(): ResourceConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.resources;
  }

  getItems(): ItemConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.items;
  }

  getShelterLevels(): ShelterLevelConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.shelterLevels;
  }

  getGarbages(): GarbageConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.garbages;
  }

  getAdvancedOutputConditions(): AdvancedOutputConditionConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.advancedOutputConditions;
  }

  getSkills(): SkillConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.skills;
  }

  getTalents(): TalentConfigEntry[] {
    if (!this.loaded) this.loadAllSync();
    return this.talents;
  }
}
