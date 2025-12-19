import { ConfigSystem } from './core/ConfigSystem';
import { generateExplorationBoardLayer } from './core/ExplorationSystem';
import { resolveBattleTurn } from './core/BattleSystem';
import { SaveSystem } from './core/SaveSystem';
import type { Explorer, Monster } from './types/gameTypes';

/**
 * 一个极简的“从配置跑一小回合”的入口，用于验证系统是否能串起来：
 * - 从配置中加载第一个探索点和若干角色/怪物；
 * - 生成一层探索棋盘；
 * - 结算一轮战斗；
 * - 将结果写入存档文件。
 */
async function main() {
  const config = new ConfigSystem();
  config.loadAllSync();

  const explorersConfig = config.getExplorers();
  const monstersConfig = config.getMonsters();
  const points = config.getExplorationPoints();

  if (!explorersConfig.length || !monstersConfig.length || !points.length) {
    console.log('[Demo] 配置不足，无法运行最小流程。请确保至少有1个角色、1个怪物和1个探索点。');
    return;
  }

  const explorerConfigsToUse = explorersConfig.slice(0, 1);
  const monsterConfigsToUse = monstersConfig.slice(0, 1);
  const point = points[0];

  const explorers = new Map<string, Explorer>();
  for (const cfg of explorerConfigsToUse) {
    const id = cfg.ID;
    explorers.set(id, {
      id,
      config: cfg,
      currentHp: cfg.初始生命 ?? cfg.最大生命 ?? 100,
      currentStamina: cfg.初始体力 ?? cfg.最大体力 ?? 10,
      inventory: [],
      inventoryCapacity: cfg.背包格子数量 ?? 10,
      initialTalentIds: (cfg.初始天赋ID列表 ?? '').split('|').filter(Boolean),
    });
  }

  const monsters = new Map<string, Monster>();
  for (const cfg of monsterConfigsToUse) {
    const id = cfg.ID;
    monsters.set(id, {
      id,
      config: cfg,
      currentHp: cfg.血量,
    });
  }

  const boardResult = generateExplorationBoardLayer({
    pointConfig: point,
    explorers: Array.from(explorers.values()),
    monsterConfigs: monstersConfig,
    garbageConfigs: config.getGarbages(),
  });

  console.log('[Demo] 初始棋盘:', JSON.stringify(boardResult.layer, null, 2));

  const battleResult = resolveBattleTurn(boardResult.layer, explorers, monsters);

  console.log('[Demo] 战斗后角色状态:');
  console.log(JSON.stringify(Array.from(battleResult.explorers.values()), null, 2));
  console.log('[Demo] 战斗后怪物状态:');
  console.log(JSON.stringify(Array.from(battleResult.monsters.values()), null, 2));

  const saveSystem = new SaveSystem();
  saveSystem.save('demo', {
    round: 1,
    explorers: Array.from(battleResult.explorers.values()),
    mapCells: [],
    explorationSession: {
      pointConfig: point,
      currentLayerIndex: 1,
      maxLayers: point.最大层数,
      board: battleResult.board,
    },
  });

  console.log('[Demo] 已将本回合结果写入 saves/demo.json');
}

main().catch((err) => {
  console.error('[Demo] 运行失败:', err);
});
