import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { WorldMap } from './components/WorldMap';
import { ExplorationBoard, type ExplorationBoardRef } from './components/ExplorationBoard';
import { TeamSelectionPanel } from './components/TeamSelectionPanel';
import { TimeDisplay } from './components/TimeDisplay';
import { InventoryPanel } from './components/InventoryPanel';
import { CharacterEquipmentPanel } from './components/CharacterEquipmentPanel';
import { ResourceTransferPanel } from './components/ResourceTransferPanel';
import { LootAnimation } from './components/LootAnimation';
import { QuestPanel } from './components/QuestPanel';
import { ChapterStoryPanel } from './components/ChapterStoryPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { audioSystem } from './core/AudioSystem';
import { generateExplorationBoardLayer } from './core/ExplorationSystem';
import { resolveBattleTurn, processGarbageAfterBattle } from './core/BattleSystem';
import { distributeLootToExplorers, addToExplorerInventory } from './core/InventorySystem';
import { MapSystem, type WorldPosition } from './core/MapSystem';
import { QuestSystem } from './core/QuestSystem';
import { ChapterSystem } from './core/ChapterSystem';
import { getText } from './core/LanguageManager';
import type { ResourceStack, Quest, Chapter, ItemStack } from './types/gameTypes';
import type {
  Explorer,
  Monster,
  ExplorationBoardLayer,
  MapCellRuntime,
  EquipmentSlotType,
} from './types/gameTypes';
import type {
  ExplorerConfigEntry,
  MonsterConfigEntry,
  MapConfigEntry,
  ExplorationPointConfigEntry,
  AdvancedOutputConditionConfigEntry,
  ResourceConfigEntry,
  QuestConfigEntry,
  ChapterConfigEntry,
  EquipmentConfigEntry,
  ShelterLevelConfigEntry,
} from './types/configTypes';
import explorersConfig from '../configs/json/ExplorerConfig.json';
import monstersConfig from '../configs/json/MonsterConfig.json';
import mapConfig from '../configs/json/MapConfig.json';
import explorationPoints from '../configs/json/ExplorationPointConfig.json';
import garbagesConfig from '../configs/json/GarbageConfig.json';
import advancedOutputConditions from '../configs/json/AdvancedOutputConditionConfig.json';
import resourcesConfig from '../configs/json/ResourceConfig.json';
import questsConfig from '../configs/json/QuestConfig.json';
import chaptersConfig from '../configs/json/ChapterConfig.json';
import equipmentsConfig from '../configs/json/EquipmentConfig.json';
import shelterLevelsConfig from '../configs/json/ShelterLevelConfig.json';

type GameState = 'map' | 'traveling' | 'exploration';

export function App() {
  const explorersConfigArr = explorersConfig as ExplorerConfigEntry[];
  const monstersConfigArr = monstersConfig as MonsterConfigEntry[];
  const mapConfigArr = mapConfig as MapConfigEntry[];
  const pointsArr = explorationPoints as ExplorationPointConfigEntry[];
  const garbagesConfigArr = garbagesConfig as GarbageConfigEntry[];
  const advancedConditionsArr = advancedOutputConditions as AdvancedOutputConditionConfigEntry[];
  const resourcesConfigArr = resourcesConfig as ResourceConfigEntry[];
  const questsConfigArr = questsConfig as QuestConfigEntry[];
  const chaptersConfigArr = chaptersConfig as ChapterConfigEntry[];
  const equipmentsConfigArr = equipmentsConfig as EquipmentConfigEntry[];
  const shelterLevelsConfigArr = shelterLevelsConfig as ShelterLevelConfigEntry[];

  const [gameState, setGameState] = useState<GameState>('map');
  const [currentRound, setCurrentRound] = useState(1);
  const [currentDay, setCurrentDay] = useState(1);
  const [shelterLevel, setShelterLevel] = useState(1);
  const [showChapterStory, setShowChapterStory] = useState<Chapter | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<ExplorationPointConfigEntry | null>(null);
  const [boardLayer, setBoardLayer] = useState<ExplorationBoardLayer | null>(null);
  const [currentLayer, setCurrentLayer] = useState(1); // 当前探索层数（从1开始）
  const [explorers, setExplorers] = useState<Map<string, Explorer>>(new Map());
  const [monsters, setMonsters] = useState<Map<string, Monster>>(new Map());
  // 存储所有角色的装备数据（即使不在探索中）
  const [allExplorersEquipment, setAllExplorersEquipment] = useState<Map<string, {
    equipment: (string | null)[];
    equipmentSlotTypes: EquipmentSlotType[];
  }>>(new Map());
  const [teamSelectionVisible, setTeamSelectionVisible] = useState(false);
  const [inventoryPanelVisible, setInventoryPanelVisible] = useState(false);
  const [selectedExplorerIds, setSelectedExplorerIds] = useState<string[]>([]);
  // 临时背包状态
  const [tempInventory, setTempInventory] = useState<ItemStack[]>([]);
  const [isTempInventoryLocked, setIsTempInventoryLocked] = useState(true);
  // 避难所仓库状态
  const [shelterWarehouse, setShelterWarehouse] = useState<ItemStack[]>([]);
  const [showResourceTransfer, setShowResourceTransfer] = useState(false);
  const [characterEquipmentPanelVisible, setCharacterEquipmentPanelVisible] = useState(false);
  const [settingsPanelVisible, setSettingsPanelVisible] = useState(false);
  const [teamPosition, setTeamPosition] = useState<WorldPosition | null>(null);
  const [travelPath, setTravelPath] = useState<WorldPosition[]>([]);
  const [targetShelter, setTargetShelter] = useState<WorldPosition | null>(null); // 目标避难所位置（如果正在返回避难所）
  const travelTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 地图格子运行时状态（包含探索进度）
  const [mapCellsRuntime, setMapCellsRuntime] = useState<MapCellRuntime[]>(() => {
    // 初始化地图格子，为探索点设置探索进度为0
    return mapConfigArr.map((c) => {
      const cell: MapCellRuntime = {
        x: c.X坐标,
        y: c.Y坐标,
        type: c.格子类型 as MapCellRuntime['type'],
        state: c.初始状态,
      };
      // 如果是探索点，设置探索进度为0
      if (c.格子类型 === '探索点' || c.格子类型 === 'ExplorationPoint') {
        cell.explorationProgress = 0;
        // 关联探索点ID
        const pointIds = (c as any).资源生成规则ID as string[] | undefined;
        if (pointIds && pointIds.length > 0) {
          cell.explorationPointId = pointIds[0];
        }
      }
      return cell;
    });
  });
  
  // 视觉反馈相关状态
  const [shakingCellIndices, setShakingCellIndices] = useState<Set<number>>(new Set());
  const [displayLootByCell, setDisplayLootByCell] = useState<Map<number, ResourceStack[]>>(new Map());
  const [activeLootAnimations, setActiveLootAnimations] = useState<Array<{
    id: string;
    cellIndex: number;
    loot: ResourceStack[];
  }>>([]);
  const explorationBoardRef = useRef<ExplorationBoardRef>(null);
  const inventoryButtonRef = useRef<HTMLButtonElement>(null);
  // 跟踪已经初始化过工具的避难所等级（防止重复添加）
  const initializedToolLevelsRef = useRef<Set<number>>(new Set());

  const explorersArray = useMemo(() => Array.from(explorers.values()), [explorers]);
  
  // 为装备面板创建所有可用角色的列表（从配置创建，合并装备数据）
  const allExplorersForEquipment = useMemo(() => {
    return explorersConfigArr.map((cfg) => {
      const id = cfg.ID;
      // 如果角色正在探索中，使用探索中的实例
      const existingExplorer = explorers.get(id);
      if (existingExplorer) {
        return existingExplorer;
      }
      // 否则从配置创建新实例，并合并已保存的装备数据
      const equipmentData = allExplorersEquipment.get(id);
      const maxHp = (cfg as any).最大血量 ?? (cfg as any).最大生命 ?? 100;
      const initialHp = (cfg as any).初始血量 ?? (cfg as any).初始生命 ?? maxHp;
      const maxStamina = (cfg as any).最大体力 ?? 10;
      const initialStamina = (cfg as any).初始体力 ?? maxStamina;
      return {
        id,
        config: cfg,
        currentHp: initialHp,
        currentStamina: initialStamina,
        inventory: [],
        inventoryCapacity: (cfg as any).背包格子数量 ?? 10,
        initialTalentIds: ((cfg as any).初始天赋ID列表 ?? '').split('|').filter(Boolean),
        equipmentSlots: 6,
        equipment: equipmentData?.equipment ?? [null, null, null, null, null, null],
        equipmentSlotTypes: equipmentData?.equipmentSlotTypes ?? ['工具', '武器', '防具', '饰品', '特殊', '备用'],
      } as Explorer;
    });
  }, [explorersConfigArr, explorers, allExplorersEquipment]);

  // 任务系统
  const questSystemRef = useRef<QuestSystem | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);

  // 章节系统
  const chapterSystemRef = useRef<ChapterSystem | null>(null);

  // 初始化章节系统
  useEffect(() => {
    if (chapterSystemRef.current === null) {
      chapterSystemRef.current = new ChapterSystem(chaptersConfigArr);
      // 显示第一章剧情
      const firstChapter = chapterSystemRef.current.getChapterByNumber(1);
      if (firstChapter) {
        setShowChapterStory(firstChapter);
      }
    }
  }, []);

  // 初始化任务系统
  useEffect(() => {
    if (questSystemRef.current === null) {
      const initialContext = {
        currentRound: 1,
        currentDay: 1,
        shelterLevel: 1,
        explorers: explorersArray,
        completedQuests: new Set<string>(),
        completedExplorations: new Map<string, number>(),
        defeatedMonsters: new Map<string, number>(),
        builtFacilities: new Map<string, number>(),
      };
      questSystemRef.current = new QuestSystem(questsConfigArr, initialContext);
      setQuests(questSystemRef.current.getAcceptedQuests());
    }
  }, []);

  // 更新任务系统上下文
  useEffect(() => {
    if (questSystemRef.current) {
      questSystemRef.current.updateContext({
        currentRound,
        currentDay,
        shelterLevel,
        explorers: explorersArray,
      });
      questSystemRef.current.updateAllQuestProgress();
      questSystemRef.current.checkAndAutoAcceptQuests();
      setQuests(questSystemRef.current.getAcceptedQuests());
    }
  }, [currentRound, currentDay, shelterLevel, explorersArray]);

  // 初始化仓库中的出生工具（根据避难所等级）
  // 为每个等级只执行一次，避免重复添加
  useEffect(() => {
    // 如果当前等级已经初始化过，跳过
    if (initializedToolLevelsRef.current.has(shelterLevel)) {
      return;
    }

    // 查找当前避难所等级对应的配置
    const currentLevelConfig = shelterLevelsConfigArr.find((config) => config.等级 === shelterLevel);
    if (!currentLevelConfig || !currentLevelConfig.初始工具ID列表) {
      // 即使没有工具配置，也标记为已初始化，避免重复检查
      initializedToolLevelsRef.current.add(shelterLevel);
      return;
    }

    // 解析工具ID列表（支持字符串格式用|分割，或数组格式）
    let toolIds: string[] = [];
    const toolsRaw = currentLevelConfig.初始工具ID列表;
    if (typeof toolsRaw === 'string') {
      toolIds = toolsRaw.split('|').map((id) => id.trim()).filter(Boolean);
    } else if (Array.isArray(toolsRaw)) {
      toolIds = toolsRaw.map((id) => String(id).trim()).filter(Boolean);
    }
    
    if (toolIds.length === 0) {
      initializedToolLevelsRef.current.add(shelterLevel);
      return;
    }

    // 验证工具ID是否存在于装备配置中，并添加到仓库
    setShelterWarehouse((prevWarehouse) => {
      const updated = [...prevWarehouse];
      
      for (const toolId of toolIds) {
        // 验证工具ID是否存在
        const equipmentConfig = equipmentsConfigArr.find((eq) => eq.ID === toolId);
        if (!equipmentConfig) {
          console.warn(`[初始化工具] 工具ID不存在: ${toolId}`);
          continue;
        }

        // 查找仓库中是否已有该工具
        const existingItem = updated.find((item) => item.itemId === toolId);
        const maxStack = equipmentConfig.堆叠最大数量 ?? 1;

        if (existingItem) {
          // 如果已存在，检查是否达到堆叠上限
          if (existingItem.quantity < maxStack) {
            existingItem.quantity += 1;
          }
          // 如果已达到上限，不添加
        } else {
          // 如果不存在，添加新项（数量为1）
          updated.push({
            itemId: toolId,
            quantity: 1,
          });
        }
      }

      return updated;
    });

    // 标记当前等级为已初始化
    initializedToolLevelsRef.current.add(shelterLevel);
  }, [shelterLevel, shelterLevelsConfigArr, equipmentsConfigArr]);

  // 处理浏览器自动播放限制：监听用户首次交互
  const hasUserInteractedRef = useRef(false);
  
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (hasUserInteractedRef.current) return;
      hasUserInteractedRef.current = true;
      
      // 用户交互后，根据当前游戏状态播放音乐
      if (gameState === 'exploration') {
        audioSystem.playBGM('/audio/bgm/Explore.mp3', true);
      } else {
        audioSystem.playBGM('/audio/bgm/Home.mp3', true);
      }
    };

    if (!hasUserInteractedRef.current) {
      document.addEventListener('click', handleFirstInteraction, { once: true });
      document.addEventListener('keydown', handleFirstInteraction, { once: true });
      document.addEventListener('touchstart', handleFirstInteraction, { once: true });
    }

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  // 根据游戏状态切换背景音乐
  useEffect(() => {
    // 只有在用户已经交互过的情况下才自动切换音乐
    if (!hasUserInteractedRef.current) {
      return;
    }

    let musicPath: string;
    
    if (gameState === 'exploration') {
      musicPath = '/audio/bgm/Explore.mp3';
    } else {
      // map 或 traveling 状态
      musicPath = '/audio/bgm/Home.mp3';
    }

    // 播放对应的背景音乐
    audioSystem.playBGM(musicPath, true);

    // 组件卸载时停止音乐
    return () => {
      audioSystem.stopBGM();
    };
  }, [gameState]);

  // 处理垃圾产出视觉反馈
  const handleLootAnimations = useCallback((animations: Array<{
    cellIndex: number;
    loot: ResourceStack[];
    isAdvanced: boolean;
    relatedCellIndices: number[];
  }>) => {

    // 第一步：收集所有需要震动的格子（如果有进阶产出）
    const allShakingCells = new Set<number>();
    animations.forEach((anim) => {
      if (anim.isAdvanced && anim.relatedCellIndices.length > 0) {
        anim.relatedCellIndices.forEach((idx) => allShakingCells.add(idx));
      }
    });


    // 第二步：同时显示所有格子的资源信息
    const displayMap = new Map<number, ResourceStack[]>();
    animations.forEach((anim) => {
      displayMap.set(anim.cellIndex, anim.loot);
    });
    setDisplayLootByCell(displayMap);


    // 第三步：如果有震动，先触发震动（0.3秒）
    if (allShakingCells.size > 0) {
      setShakingCellIndices(allShakingCells);
      setTimeout(() => {
        setShakingCellIndices(new Set());
      }, 300);
    }

    // 第四步：等待0.3秒后，同时创建所有飞行动画
    setTimeout(() => {

      const inventoryButton = inventoryButtonRef.current;
      const newAnimations: Array<{ id: string; cellIndex: number; loot: ResourceStack[] }> = [];

      animations.forEach((anim, index) => {
        const cellElement = explorationBoardRef.current?.getCellElement(anim.cellIndex);
        

        if (cellElement && inventoryButton) {
          const animationId = `loot-${anim.cellIndex}-${Date.now()}-${index}`;
          newAnimations.push({ id: animationId, cellIndex: anim.cellIndex, loot: anim.loot });
        }
      });


      // 同时创建所有飞行动画
      setActiveLootAnimations((prev) => [...prev, ...newAnimations]);

      // 清除显示的资源信息
      setDisplayLootByCell(new Map());
    }, 300);
  }, []);

  const getMaxStack = (resourceId: string): number => {
    const res = resourcesConfigArr.find((r) => r.ID === resourceId);
    if (res) return res.堆叠最大数量 ?? 99;
    return 99;
  };

  // 根据棋盘上的怪物ID创建 Monster 实例，确保每个实例有唯一ID
  const createMonstersFromBoard = (
    board: ExplorationBoardLayer,
    monsterConfigs: MonsterConfigEntry[],
    layerIndex: number,
  ): { monsters: Map<string, Monster>; updatedBoard: ExplorationBoardLayer } => {
    const monsters = new Map<string, Monster>();
    const monsterConfigMap = new Map<string, MonsterConfigEntry>();
    for (const cfg of monsterConfigs) {
      monsterConfigMap.set(cfg.ID, cfg);
    }

    const updatedCells = board.cells.map((cell) => ({ ...cell }));
    let monsterCounter = 0;

    for (const cell of updatedCells) {
      if (cell.monsterId) {
        const configId = cell.monsterId;
        const monsterConfig = monsterConfigMap.get(configId);
        if (monsterConfig) {
          // 为每个怪物实例生成唯一ID
          const uniqueId = `${configId}_layer${layerIndex}_${monsterCounter++}`;
          monsters.set(uniqueId, {
            id: uniqueId,
            config: monsterConfig,
            currentHp: monsterConfig.血量,
          });
          // 更新棋盘上的怪物ID为唯一ID
          cell.monsterId = uniqueId;
        }
      }
    }

    return {
      monsters,
      updatedBoard: { ...board, cells: updatedCells },
    };
  };

  const handleSelectPoint = (point: ExplorationPointConfigEntry) => {
    if (!explorersConfigArr.length || !monstersConfigArr.length) return;
    
    // 检查是否点击了探险队当前所在的探索点
    if (explorers.size > 0 && teamPosition) {
      const pointPos = findPointPosition(point.ID);
      if (pointPos && pointPos.x === teamPosition.x && pointPos.y === teamPosition.y) {
        // 点击当前所在探索点，直接进入探索
        setSelectedPoint(point);
        setSelectedExplorerIds(Array.from(explorers.keys()));
        // 直接触发到达目的地逻辑
        setTimeout(() => {
          handleArriveAtDestination();
        }, 0);
        return;
      }
    }
    
    setSelectedPoint(point);
    
    // 如果已有探险队，使用现有成员（锁定）；否则打开选择面板
    if (explorers.size > 0) {
      setSelectedExplorerIds(Array.from(explorers.keys()));
    } else {
      setSelectedExplorerIds([]);
    }
    setTeamSelectionVisible(true);
  };

  // 处理点击避难所：返回避难所
  const handleSelectShelter = (shelterPos: WorldPosition) => {

    if (!teamPosition || explorers.size === 0) {
      // 如果没有外出的探险队，点击避难所无意义
      return;
    }

    // 如果已经在避难所，无需移动
    if (teamPosition.x === shelterPos.x && teamPosition.y === shelterPos.y) {
      return;
    }

    // 二次确认：弹出确认对话框
    const confirmed = window.confirm('确定要返回避难所吗？返回后探险队状态将被清空。');
    if (!confirmed) {
      return;
    }

    // 计算从当前位置到避难所的路径
    const mapCellsRuntime: MapCellRuntime[] = mapConfigArr.map((c) => ({
      x: c.X坐标,
      y: c.Y坐标,
      type: c.格子类型 as MapCellRuntime['type'],
      state: c.初始状态,
    }));

    const mapSystem = new MapSystem(mapCellsRuntime);
    const pathResult = mapSystem.findPath(teamPosition, shelterPos);


    if (!pathResult || pathResult.path.length === 0) {
      alert('无法计算到避难所的路径');
      return;
    }

    // 设置目标为避难所
    setSelectedPoint(null); // 清除探索点选择
    setTargetShelter(shelterPos); // 标记目标避难所
    setTravelPath(pathResult.path);
    // 保持 currentRound 连续，不重置
    setGameState('traveling');
  };

  const handleToggleExplorer = (explorerId: string) => {
    setSelectedExplorerIds((prev) => {
      if (prev.includes(explorerId)) {
        return prev.filter((id) => id !== explorerId);
      } else {
        if (prev.length >= 3) return prev;
        return [...prev, explorerId];
      }
    });
  };

  const findShelterPosition = (): WorldPosition | null => {
    const shelter = mapConfigArr.find((c) => c.格子类型 === '避难所');
    if (!shelter) return null;
    return { x: shelter.X坐标, y: shelter.Y坐标 };
  };

  // 根据探索点ID在MapConfig中查找其实际坐标
  const findPointPosition = (pointId: string): WorldPosition | null => {
    const cell = mapConfigArr.find((c) => {
      const ids = (c as any).资源生成规则ID as string[] | undefined;
      return c.格子类型 === '探索点' && ids && ids.includes(pointId);
    });
    if (!cell) return null;
    return { x: cell.X坐标, y: cell.Y坐标 };
  };

  const handleStartExploration = () => {
    if (!selectedPoint || selectedExplorerIds.length === 0) return;

    // 如果探险队已有位置，从当前位置出发；否则从避难所出发
    let startPos = teamPosition;
    if (!startPos) {
      startPos = findShelterPosition();
      if (!startPos) {
        alert('未找到避难所位置，无法开始移动');
        return;
      }
    }

    const targetPos = findPointPosition(selectedPoint.ID);
    if (!targetPos) {
      alert('无法在地图中找到该探索点的位置');
      return;
    }

    const mapCellsRuntime: MapCellRuntime[] = mapConfigArr.map((c) => ({
      x: c.X坐标,
      y: c.Y坐标,
      type: c.格子类型 as MapCellRuntime['type'],
      state: c.初始状态,
    }));

    const mapSystem = new MapSystem(mapCellsRuntime);
    const pathResult = mapSystem.findPath(startPos, targetPos);

    if (!pathResult || pathResult.path.length === 0) {
      alert('无法计算到目标探索点的路径');
      return;
    }

    setTeamPosition(startPos);
    setTravelPath(pathResult.path);
    // 不重置 currentRound，保持时间连续
    setTeamSelectionVisible(false);
    setGameState('traveling');
  };

  const handleArriveAtDestination = useCallback(() => {
    if (!selectedPoint || selectedExplorerIds.length === 0) return;

    const explorerConfigsToUse = explorersConfigArr.filter((cfg) =>
      selectedExplorerIds.includes(cfg.ID),
    );
    const monsterConfigsToUse = monstersConfigArr.slice(0, 1);

    const newExplorers = new Map<string, Explorer>();
    for (const cfg of explorerConfigsToUse) {
      const id = cfg.ID;
      const maxHp = (cfg as any).最大血量 ?? (cfg as any).最大生命 ?? 100;
      const initialHp = (cfg as any).初始血量 ?? (cfg as any).初始生命 ?? maxHp;
      const maxStamina = (cfg as any).最大体力 ?? 10;
      const initialStamina = (cfg as any).初始体力 ?? maxStamina;
      // 从allExplorersEquipment获取已保存的装备数据，如果没有则使用默认值
      const equipmentData = allExplorersEquipment.get(id);
      newExplorers.set(id, {
        id,
        config: cfg,
        currentHp: initialHp,
        currentStamina: initialStamina,
        inventory: [],
        inventoryCapacity: (cfg as any).背包格子数量 ?? 10,
        initialTalentIds: ((cfg as any).初始天赋ID列表 ?? '').split('|').filter(Boolean),
        equipmentSlots: 6, // 固定6个装备槽位
        equipment: equipmentData?.equipment ?? [null, null, null, null, null, null], // 使用已保存的装备数据或初始化为6个空槽位
        equipmentSlotTypes: equipmentData?.equipmentSlotTypes ?? ['工具', '武器', '防具', '饰品', '特殊', '备用'], // 使用已保存的槽位类型或默认值
      });
    }

    const newMonsters = new Map<string, Monster>();
    for (const cfg of monsterConfigsToUse) {
      const id = cfg.ID;
      newMonsters.set(id, {
        id,
        config: cfg,
        currentHp: cfg.血量,
      });
    }

    const boardResult = generateExplorationBoardLayer({
      pointConfig: selectedPoint,
      explorers: Array.from(newExplorers.values()),
      monsterConfigs: monstersConfigArr,
      garbageConfigs: garbagesConfigArr,
      layerIndex: 1, // 进入探索点时从第1层开始
    });

    // 根据棋盘上的怪物创建 Monster 实例
    const { monsters: boardMonsters, updatedBoard } = createMonstersFromBoard(
      boardResult.layer,
      monstersConfigArr,
      1,
    );

    setExplorers(newExplorers);
    setMonsters(boardMonsters);
    setBoardLayer(updatedBoard);
    setCurrentLayer(1); // 重置为第1层
    setTeamPosition(null);
    setTravelPath([]);
    setGameState('exploration');
  }, [selectedPoint, selectedExplorerIds, explorersConfigArr, monstersConfigArr, garbagesConfigArr, allExplorersEquipment]);

  useEffect(() => {
    if (gameState !== 'traveling' || travelPath.length === 0 || !teamPosition) return;

    if (travelTimerRef.current) {
      clearTimeout(travelTimerRef.current);
    }

    // 通用：基于 travelPath 推进一格
    const currentIndex = travelPath.findIndex(
      (p) => p.x === teamPosition.x && p.y === teamPosition.y,
    );
    const nextIndex = currentIndex === -1 ? 0 : currentIndex + 1;

    // 如果已经在路径终点，根据目标类型分别处理
    if (nextIndex >= travelPath.length) {
      if (targetShelter) {
        // 到达避难所，弹出资源转移界面
        setShowResourceTransfer(true);
        return;
      }

      if (selectedPoint) {
        handleArriveAtDestination();
      }
      return;
    }

    // 仍在路径中间：继续前进一格
    travelTimerRef.current = setTimeout(() => {
      const nextPos = travelPath[nextIndex];
      setTeamPosition(nextPos);
      const nextRound = currentRound + 1;
      const nextDay = Math.floor(nextRound / 48) + 1;
      setCurrentRound(nextRound);
      setCurrentDay(nextDay);
      // 更新任务系统回合数
      if (questSystemRef.current) {
        questSystemRef.current.updateRound(nextRound, nextDay);
        setQuests(questSystemRef.current.getAcceptedQuests());
      }
    }, 1000);

    return () => {
      if (travelTimerRef.current) {
        clearTimeout(travelTimerRef.current);
      }
    };
  }, [gameState, travelPath, teamPosition, selectedPoint, targetShelter, handleArriveAtDestination]);

  const handleCancelTeamSelection = () => {
    setTeamSelectionVisible(false);
    setSelectedPoint(null);
    setSelectedExplorerIds([]);
  };

  // 处理资源转移
  const handleTransferResources = (selectedItems: ItemStack[]) => {
    // 从所有角色背包中移除选中的资源
    const updatedExplorers = new Map<string, Explorer>();
    for (const [id, explorer] of explorers.entries()) {
      const updatedInventory = explorer.inventory.map((item) => {
        const selectedItem = selectedItems.find((si) => si.itemId === item.itemId);
        if (selectedItem) {
          // 减少数量
          const newQuantity = Math.max(0, item.quantity - selectedItem.quantity);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter((item) => item.quantity > 0);
      
      updatedExplorers.set(id, { ...explorer, inventory: updatedInventory });
    }
    setExplorers(updatedExplorers);
    
    // 将资源添加到仓库（合并相同物品）
    setShelterWarehouse((prev) => {
      const merged = new Map<string, ItemStack>();
      for (const item of [...prev, ...selectedItems]) {
        const existing = merged.get(item.itemId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          merged.set(item.itemId, { ...item });
        }
      }
      return Array.from(merged.values());
    });
    
    // 关闭资源转移界面
    setShowResourceTransfer(false);
    
    // 清空探险队状态
    setExplorers(new Map());
    setTeamPosition(null);
    setTravelPath([]);
    setTargetShelter(null);
    setGameState('map');
    
    alert('资源已转移到避难所仓库');
  };


  const handleNextRound = () => {
    if (!boardLayer || !selectedPoint) return;
    
    
    // 0. 回合开始时清空临时背包并锁定
    setTempInventory([]);
    setIsTempInventoryLocked(true);
    
    // 0.1 回合开始时扣除体力（每回合-1，最低为0）
    const updatedExplorers = new Map<string, Explorer>();
    for (const [id, explorer] of explorers.entries()) {
      const newStamina = Math.max(0, explorer.currentStamina - 1);
      updatedExplorers.set(id, { ...explorer, currentStamina: newStamina });
    }
    setExplorers(updatedExplorers);
    
    // 1. 先结算战斗（使用更新后的explorers）
    const battleResult = resolveBattleTurn(boardLayer, updatedExplorers, monsters);
    
    
    // 2. 战斗后自动处理垃圾产出
    const garbageResult = processGarbageAfterBattle(
      battleResult.board,
      battleResult.explorers,
      garbagesConfigArr,
      advancedConditionsArr,
      getMaxStack,
      equipmentsConfigArr,
    );
    
    // 处理视觉反馈
    if (garbageResult.lootAnimations.length > 0) {
      handleLootAnimations(garbageResult.lootAnimations);
    }
    
    // 2.1 处理剩余物品：如果有剩余物品，解锁临时背包并放入
    if (garbageResult.remainingItems.length > 0) {
      setIsTempInventoryLocked(false);
      setTempInventory((prev) => {
        // 合并相同物品ID的堆叠
        const merged = new Map<string, ItemStack>();
        for (const item of [...prev, ...garbageResult.remainingItems]) {
          const existing = merged.get(item.itemId);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            merged.set(item.itemId, { ...item });
          }
        }
        return Array.from(merged.values());
      });
    }
    
    // 3. 检查是否完成当前层（所有怪物被消灭，且还有至少1个角色存活）
    // 检查棋盘上是否还有怪物（而不是 monsters Map，因为怪物可能已从棋盘移除）
    const hasMonstersOnBoard = battleResult.board.cells.some(cell => cell.monsterId);
    const hasAliveExplorers = Array.from(garbageResult.explorers.values()).some(e => e.currentHp > 0);
    
    
    // 如果完成当前层且未达到最大层数，进入下一层
    if (!hasMonstersOnBoard && hasAliveExplorers && currentLayer < selectedPoint.最大层数) {
      const nextLayer = currentLayer + 1;
      
      
      // 重新生成下一层的棋盘（随机位置）
      const aliveExplorers = Array.from(garbageResult.explorers.values()).filter(e => e.currentHp > 0);
      
      
      const boardResult = generateExplorationBoardLayer({
        pointConfig: selectedPoint,
        explorers: aliveExplorers,
        monsterConfigs: monstersConfigArr,
        garbageConfigs: garbagesConfigArr,
        layerIndex: nextLayer,
      });
      
      
      // 根据棋盘上的怪物创建 Monster 实例
      const { monsters: newMonsters, updatedBoard } = createMonstersFromBoard(
        boardResult.layer,
        monstersConfigArr,
        nextLayer,
      );
      
      
      // 更新探索进度
      const pointPos = findPointPosition(selectedPoint.ID);
      if (pointPos) {
        setMapCellsRuntime((prev) => {
          return prev.map((cell) => {
            if (cell.x === pointPos.x && cell.y === pointPos.y && cell.explorationPointId === selectedPoint.ID) {
              // 计算新的探索进度
              const newProgress = Math.round((nextLayer / selectedPoint.最大层数) * 100);
              return { ...cell, explorationProgress: newProgress };
            }
            return cell;
          });
        });
      }
      
      setExplorers(garbageResult.explorers);
      setMonsters(newMonsters);
      setBoardLayer(updatedBoard);
      setCurrentLayer(nextLayer);
      const nextRound = currentRound + 1;
      const nextDay = Math.floor(nextRound / 48) + 1;
      setCurrentRound(nextRound);
      setCurrentDay(nextDay);
      // 更新任务系统回合数
      if (questSystemRef.current) {
        questSystemRef.current.updateRound(nextRound, nextDay);
        setQuests(questSystemRef.current.getAcceptedQuests());
      }
      return;
    }
    
    // 如果达到最大层数，强制结束探索
    if (currentLayer >= selectedPoint.最大层数 && !hasMonstersOnBoard && hasAliveExplorers) {
      
      // 更新探索进度为100%，并转换格子类型为空地
      const pointPos = findPointPosition(selectedPoint.ID);
      if (pointPos) {
        setMapCellsRuntime((prev) => {
          return prev.map((cell) => {
            if (cell.x === pointPos.x && cell.y === pointPos.y && cell.explorationPointId === selectedPoint.ID) {
              // 探索进度达到100%，转换为空地
              return {
                ...cell,
                explorationProgress: 100,
                type: 'Obstacle', // 转换为空地
                explorationPointId: undefined, // 清除探索点ID
              };
            }
            return cell;
          });
        });
      }
      
      // 更新任务系统：记录探索完成
      if (questSystemRef.current && selectedPoint) {
        questSystemRef.current.recordExplorationCompleted(selectedPoint.ID);
      }
      
      alert(`已完成探索点 ${getText(selectedPoint.名称Key ?? selectedPoint.ID)} 的所有 ${selectedPoint.最大层数} 层探索`);
      handleBackToMap();
      return;
    }
    
    // 如果所有角色都死亡，强制结束探索
    if (!hasAliveExplorers) {
      alert('所有角色都已死亡，探索失败');
      handleBackToMap();
      return;
    }
    
    // 4. 更新任务系统：记录击败的怪物
    if (questSystemRef.current) {
      // 检查哪些怪物被击败（HP <= 0）
      const defeatedMonsterIds = new Set<string>();
      for (const [monsterId, monster] of battleResult.monsters.entries()) {
        if (monster.currentHp <= 0) {
          defeatedMonsterIds.add(monster.config.ID);
        }
      }
      // 检查从棋盘移除的怪物（可能已经死亡）
      const removedMonsters = new Set<string>();
      for (const cell of battleResult.board.cells) {
        if (cell.monsterId) {
          const monster = battleResult.monsters.get(cell.monsterId);
          if (monster) {
            const configId = monster.config.ID;
            if (monster.currentHp <= 0) {
              removedMonsters.add(configId);
            }
          }
        }
      }
      // 记录击败的怪物
      for (const monsterId of defeatedMonsterIds) {
        questSystemRef.current.recordMonsterDefeated(monsterId);
      }
      for (const monsterId of removedMonsters) {
        questSystemRef.current.recordMonsterDefeated(monsterId);
      }
    }

    // 5. 正常更新状态（继续当前层）
    setExplorers(garbageResult.explorers);
    setMonsters(battleResult.monsters);
    setBoardLayer(battleResult.board);
    setCurrentRound((r) => r + 1);
  };

  const handleBackToMap = () => {
    if (travelTimerRef.current) {
      clearTimeout(travelTimerRef.current);
      travelTimerRef.current = null;
    }
    // 保留 teamPosition 和 explorers，只清除探索相关状态
    setGameState('map');
    setSelectedPoint(null);
    setBoardLayer(null);
    setMonsters(new Map());
    setCurrentLayer(1); // 重置层数
    setTravelPath([]);
    // 如果在探索点，将 teamPosition 设为该探索点的位置
    if (selectedPoint) {
      const pos = findPointPosition(selectedPoint.ID);
      if (pos) setTeamPosition(pos);
    }
  };

  return (
    <div style={{ padding: 16, fontFamily: 'monospace', color: '#fff', background: '#000', minHeight: '100vh', position: 'relative' }}>
      <h1>DoomsdaySSW2 调试入口</h1>
      {/* 设置按钮 - 右上角 */}
      <button
        onClick={() => setSettingsPanelVisible(true)}
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          padding: '8px 16px',
          background: '#555',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 14,
          zIndex: 1000,
        }}
        title="设置"
      >
        设置
      </button>
      {(gameState === 'map' || gameState === 'traveling') && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <TimeDisplay currentRound={currentRound} />
            <button
              onClick={() => {
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/abcc8814-fa11-4364-ab2b-9cb14d54a4af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:角色装备按钮onClick',message:'按钮点击',data:{currentVisible:characterEquipmentPanelVisible,explorersCount:explorersArray.length,gameState},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
                // #endregion
                setCharacterEquipmentPanelVisible(true);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/abcc8814-fa11-4364-ab2b-9cb14d54a4af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:角色装备按钮onClick',message:'状态更新后',data:{setToTrue:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
              }}
              style={{
                padding: '8px 16px',
                background: '#0af',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              角色装备
            </button>
          </div>
          <p>
            {gameState === 'traveling'
              ? (() => {
                  if (!teamPosition || !selectedPoint) return '移动中...';
                  const currentIndex = travelPath.findIndex(
                    (p) => p.x === teamPosition.x && p.y === teamPosition.y,
                  );
                  const remaining = currentIndex === -1 ? travelPath.length : travelPath.length - currentIndex - 1;
                  return `移动中... 回合：${currentRound} | 距离目标还有 ${remaining} 格`;
                })()
              : '点击大地图上的 📍 探索点，进入对应的探索棋盘。'}
          </p>
          <WorldMap
            mapCells={mapConfigArr}
            mapCellsRuntime={mapCellsRuntime}
            points={pointsArr}
            onSelectPoint={handleSelectPoint}
            onSelectShelter={handleSelectShelter}
            teamPosition={teamPosition}
          />
        </>
      )}
      {gameState === 'exploration' && selectedPoint && boardLayer && (
        <>
          <p>
            当前探索点：{getText(selectedPoint.名称Key ?? selectedPoint.ID)} | 回合：{currentRound}
          </p>
          <div style={{ marginBottom: 8 }}>
            <button onClick={handleBackToMap} style={{ marginRight: 8 }}>
              返回大地图
            </button>
            <button onClick={handleNextRound} style={{ marginRight: 8 }}>
              下一回合（结算战斗）
            </button>
            <button 
              ref={inventoryButtonRef}
              onClick={() => setInventoryPanelVisible(true)}
            >
              背包
            </button>
          </div>
          <ExplorationBoard
            ref={explorationBoardRef}
            layer={boardLayer}
            explorers={explorers}
            monsters={monsters}
            garbages={garbagesConfigArr}
            resourceConfigs={resourcesConfigArr}
            shakingCellIndices={shakingCellIndices}
            displayLootByCell={displayLootByCell}
          />
          {/* 飞行动画 */}
          {activeLootAnimations.map((anim) => {
            const cellElement = explorationBoardRef.current?.getCellElement(anim.cellIndex);
            const inventoryButton = inventoryButtonRef.current;
            
            return (
              <LootAnimation
                key={anim.id}
                startElement={cellElement || null}
                endElement={inventoryButton || null}
                loot={anim.loot}
                resourceConfigs={resourcesConfigArr}
                onComplete={() => {
                  setActiveLootAnimations((prev) => prev.filter((a) => a.id !== anim.id));
                }}
              />
            );
          })}
        </>
      )}
      <TeamSelectionPanel
        visible={teamSelectionVisible}
        availableExplorers={explorersConfigArr}
        selectedIds={selectedExplorerIds}
        explorationPoint={selectedPoint}
        onToggle={handleToggleExplorer}
        onConfirm={handleStartExploration}
        onCancel={handleCancelTeamSelection}
        locked={explorers.size > 0}
      />
      <InventoryPanel
        visible={inventoryPanelVisible}
        explorers={explorersArray}
        tempInventory={tempInventory}
        isTempInventoryLocked={isTempInventoryLocked}
        onClose={() => setInventoryPanelVisible(false)}
        onMoveFromTempToExplorer={(itemId, quantity, explorerId) => {
          // 从临时背包移动到角色背包
          const explorer = explorers.get(explorerId);
          if (!explorer) return;
          
          // 尝试添加到角色背包
          const remaining = addToExplorerInventory(
            explorer,
            { itemId, quantity },
            getMaxStack,
          );
          
          // 更新角色背包
          setExplorers((prev) => {
            const updated = new Map(prev);
            updated.set(explorerId, explorer);
            return updated;
          });
          
          // 更新临时背包
          setTempInventory((prev) => {
            const updated = prev.map((item) => {
              if (item.itemId === itemId) {
                const newQuantity = remaining.quantity;
                if (newQuantity <= 0) return null;
                return { ...item, quantity: newQuantity };
              }
              return item;
            }).filter((item): item is ItemStack => item !== null);
            
            // 如果临时背包为空，锁定它
            if (updated.length === 0) {
              setIsTempInventoryLocked(true);
            }
            
            return updated;
          });
        }}
      />
      <QuestPanel
        quests={quests}
        onCompleteQuest={(questId) => {
          if (questSystemRef.current) {
            const result = questSystemRef.current.completeQuest(questId);
            if (result.success) {
              setQuests(questSystemRef.current.getAcceptedQuests());
              
              // 检查是否为章节结束任务
              if (result.isChapterEndQuest && chapterSystemRef.current) {
                const nextChapter = chapterSystemRef.current.unlockNextChapter();
                if (nextChapter) {
                  // 显示新章节的剧情
                  setShowChapterStory(nextChapter);
                  // 重置探险队位置（可选：根据设计决定是否重置）
                  setTeamPosition(null);
                  setExplorers(new Map());
                }
              }
            }
          }
        }}
        onClaimReward={(questId) => {
          if (questSystemRef.current) {
            const reward = questSystemRef.current.claimReward(questId);
            if (reward) {
              // 发放奖励到角色背包
              const rewardItems: Array<{ itemId: string; quantity: number }> = [
                ...reward.resources.map((r) => ({ itemId: r.resourceId, quantity: r.quantity })),
                ...reward.items,
              ];
              if (rewardItems.length > 0) {
                const explorersArray = Array.from(explorers.values());
                const remaining = distributeLootToExplorers(explorersArray, rewardItems, {
                  getMaxStack,
                });
                setExplorers(new Map(explorersArray.map((e) => [e.id, e])));
                if (remaining.length > 0) {
                  console.warn('任务奖励未完全发放:', remaining);
                }
              }
              setQuests(questSystemRef.current.getAcceptedQuests());
            }
          }
        }}
      />
      {/* 章节剧情面板 */}
      {showChapterStory && (
        <ChapterStoryPanel
          chapter={showChapterStory}
          onContinue={() => {
            setShowChapterStory(null);
          }}
        />
      )}
      <SettingsPanel
        visible={settingsPanelVisible}
        onClose={() => setSettingsPanelVisible(false)}
      />
      <CharacterEquipmentPanel
        visible={characterEquipmentPanelVisible}
        explorers={allExplorersForEquipment}
        equipmentConfigs={equipmentsConfigArr}
        warehouse={shelterWarehouse}
        onClose={() => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/abcc8814-fa11-4364-ab2b-9cb14d54a4af',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'App.tsx:CharacterEquipmentPanel onClose',message:'关闭面板',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          setCharacterEquipmentPanelVisible(false);
        }}
        onEquip={(explorerId, slotIndex, equipmentId) => {
          // 获取角色配置以获取槽位类型
          const explorerConfig = explorersConfigArr.find((cfg) => cfg.ID === explorerId);
          if (!explorerConfig) return;
          
          // 从allExplorersForEquipment获取当前装备数据
          const currentExplorer = allExplorersForEquipment.find((e) => e.id === explorerId);
          if (!currentExplorer) return;
          
          // 检查槽位类型与装备标签是否匹配
          const slotType = currentExplorer.equipmentSlotTypes[slotIndex];
          const equipmentConfig = equipmentsConfigArr.find((eq) => eq.ID === equipmentId);
          if (!equipmentConfig) return;
          
          const tagsRaw = equipmentConfig.装备标签列表 ?? '';
          let tags: string[] = [];
          if (typeof tagsRaw === 'string') {
            tags = tagsRaw.split('|').map((t) => t.trim()).filter(Boolean);
          } else if (Array.isArray(tagsRaw)) {
            tags = tagsRaw.map((t) => String(t).trim()).filter(Boolean);
          }
          if (!tags.includes(slotType)) {
            alert(`该装备不能放入${slotType}槽位`);
            return;
          }
          
          // 检查仓库中是否有该装备
          const warehouseItem = shelterWarehouse.find((item) => item.itemId === equipmentId);
          if (!warehouseItem || warehouseItem.quantity <= 0) {
            alert('仓库中没有该装备');
            return;
          }
          
          // 如果槽位已有装备，先卸下到仓库
          const oldEquipmentId = currentExplorer.equipment[slotIndex];
          if (oldEquipmentId) {
            setShelterWarehouse((prevWarehouse) => {
              const existing = prevWarehouse.find((item) => item.itemId === oldEquipmentId);
              if (existing) {
                return prevWarehouse.map((item) =>
                  item.itemId === oldEquipmentId
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                );
              }
              return [...prevWarehouse, { itemId: oldEquipmentId, quantity: 1 }];
            });
          }
          
          // 安装新装备
          const newEquipment = [...currentExplorer.equipment];
          newEquipment[slotIndex] = equipmentId;
          
          // 从仓库移除装备
          setShelterWarehouse((prevWarehouse) => {
            return prevWarehouse.map((item) =>
              item.itemId === equipmentId && item.quantity > 0
                ? { ...item, quantity: item.quantity - 1 }
                : item
            ).filter((item) => item.quantity > 0);
          });
          
          // 更新allExplorersEquipment状态
          setAllExplorersEquipment((prev) => {
            const updated = new Map(prev);
            updated.set(explorerId, {
              equipment: newEquipment,
              equipmentSlotTypes: currentExplorer.equipmentSlotTypes,
            });
            return updated;
          });
          
          // 如果角色正在探索中，也更新explorers Map
          setExplorers((prev) => {
            const updated = new Map(prev);
            const explorer = updated.get(explorerId);
            if (explorer) {
              updated.set(explorerId, {
                ...explorer,
                equipment: newEquipment,
              });
            }
            return updated;
          });
        }}
        onUnequip={(explorerId, slotIndex) => {
          // 从allExplorersForEquipment获取当前装备数据
          const currentExplorer = allExplorersForEquipment.find((e) => e.id === explorerId);
          if (!currentExplorer) return;
          
          const equipmentId = currentExplorer.equipment[slotIndex];
          if (!equipmentId) return;
          
          // 从装备槽位移除
          const newEquipment = [...currentExplorer.equipment];
          newEquipment[slotIndex] = null;
          
          // 添加到仓库
          setShelterWarehouse((prevWarehouse) => {
            const existing = prevWarehouse.find((item) => item.itemId === equipmentId);
            if (existing) {
              return prevWarehouse.map((item) =>
                item.itemId === equipmentId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              );
            }
            return [...prevWarehouse, { itemId: equipmentId, quantity: 1 }];
          });
          
          // 更新allExplorersEquipment状态
          setAllExplorersEquipment((prev) => {
            const updated = new Map(prev);
            updated.set(explorerId, {
              equipment: newEquipment,
              equipmentSlotTypes: currentExplorer.equipmentSlotTypes,
            });
            return updated;
          });
          
          // 如果角色正在探索中，也更新explorers Map
          setExplorers((prev) => {
            const updated = new Map(prev);
            const explorer = updated.get(explorerId);
            if (explorer) {
              updated.set(explorerId, {
                ...explorer,
                equipment: newEquipment,
              });
            }
            return updated;
          });
        }}
      />
      <ResourceTransferPanel
        visible={showResourceTransfer}
        explorers={explorersArray}
        warehouse={shelterWarehouse}
        onClose={() => {
          // 如果关闭时没有转移，也清空探险队（玩家取消转移）
          setShowResourceTransfer(false);
          setExplorers(new Map());
          setTeamPosition(null);
          setTravelPath([]);
          setTargetShelter(null);
          setGameState('map');
        }}
        onTransfer={handleTransferResources}
      />
    </div>
  );
}
