import type { Explorer, ResourceStack, ExplorationBoardLayer } from '../types/gameTypes';
import type { GarbageConfigEntry, AdvancedOutputConditionConfigEntry } from '../types/configTypes';
import { resolveGarbageOutput } from '../core/EffectSystem';
import { getText } from '../core/LanguageManager';

export interface GarbageCollectionPanelProps {
  visible: boolean;
  garbage: GarbageConfigEntry | null;
  explorers: Explorer[];
  advancedConditions: AdvancedOutputConditionConfigEntry[];
  allGarbageConfigs?: GarbageConfigEntry[]; // 可选：用于 Advanced_10002 等需要检查整个棋盘的触发条件
  board?: ExplorationBoardLayer; // 可选：当前探索棋盘（如果可用）
  onClose: () => void;
  onConfirm: (loot: ResourceStack[]) => void;
}

export function GarbageCollectionPanel({
  visible,
  garbage,
  explorers,
  advancedConditions,
  allGarbageConfigs = [],
  board,
  onClose,
  onConfirm,
}: GarbageCollectionPanelProps) {
  if (!visible || !garbage) return null;

  const defaultOutput = garbage.默认搜索产出;
  const advancedOutput = garbage.进阶产出;
  
  // 如果没有提供 board，创建一个空的棋盘（Advanced_10002 等需要检查整个棋盘的触发条件将无法触发）
  const emptyBoard: ExplorationBoardLayer = board || {
    cells: Array.from({ length: 24 }, (_, i) => ({
      index: i,
      garbageId: null,
      monsterId: null,
      explorerIds: [],
    })),
  };
  
  const resolvedLoot = resolveGarbageOutput(garbage, advancedConditions, {
    explorers,
    garbageConfig: garbage,
    board: emptyBoard,
    allGarbageConfigs,
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#222',
          padding: 16,
          borderRadius: 8,
          width: 400,
          color: '#fff',
        }}
      >
        <h3>采集垃圾：{getText((garbage as any).名称Key ?? garbage.ID)}</h3>
        <p>默认产出：{defaultOutput}</p>
        <p>进阶产出配置：{advancedOutput || '无'}</p>
        <p>本次实际产出（已根据进阶机制计算）：</p>
        <ul>
          {resolvedLoot.map((r) => (
            <li key={r.resourceId}>
              {r.resourceId} x {r.quantity}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <button onClick={onClose} style={{ marginRight: 8 }}>
            取消
          </button>
          <button
            onClick={() => {
              onConfirm(resolvedLoot);
              onClose();
            }}
          >
            确认采集
          </button>
        </div>
      </div>
    </div>
  );
}
