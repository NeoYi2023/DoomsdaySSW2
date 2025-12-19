import { forwardRef } from 'react';
import type { ExplorationBoardCell, Explorer, Monster, ResourceStack } from '../types/gameTypes';
import type { GarbageConfigEntry } from '../types/configTypes';
import { CharacterCard } from './CharacterCard';
import { getText } from '../core/LanguageManager';
import { getResourceIcon, getResourceName } from '../utils/resourceIcons';
import type { ResourceConfigEntry } from '../types/configTypes';

export interface ExplorationCellProps {
  cell: ExplorationBoardCell;
  explorer?: Explorer;
  monster?: Monster;
  garbageConfig?: GarbageConfigEntry;
  isShaking?: boolean;
  displayLoot?: ResourceStack[];
  resourceConfigs?: ResourceConfigEntry[];
}

export const ExplorationCell = forwardRef<HTMLDivElement, ExplorationCellProps>(
  ({ cell, explorer, monster, garbageConfig, isShaking, displayLoot, resourceConfigs }, ref) => {
    // 合并相同资源的数量
    const mergedLoot = new Map<string, number>();
    if (displayLoot) {
      for (const item of displayLoot) {
        const current = mergedLoot.get(item.resourceId) || 0;
        mergedLoot.set(item.resourceId, current + item.quantity);
      }
    }

    return (
      <div
        ref={ref}
        style={{
          width: 80,
          height: 80,
          border: '1px solid #555',
          padding: 2,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#222',
          position: 'relative',
        }}
      >
        <div style={{ fontSize: 10, color: '#aaa' }}>#{cell.index + 1}</div>
        {explorer && (
          <div style={{ marginBottom: 2 }}>
            <CharacterCard type="explorer" data={explorer} />
          </div>
        )}
        {monster && (
          <div style={{ marginBottom: 2 }}>
            <CharacterCard type="monster" data={monster} />
          </div>
        )}
        {garbageConfig && !explorer && !monster && (
          <div style={{ fontSize: 10, textAlign: 'center' }}>
            <div>🗑 {getText((garbageConfig as any).名称Key ?? garbageConfig.ID)}</div>
          </div>
        )}
        {/* 浮动文本显示资源产出 */}
        {displayLoot && displayLoot.length > 0 && resourceConfigs && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              pointerEvents: 'none',
            }}
          >
            {Array.from(mergedLoot.entries()).map(([resourceId, quantity]) => {
              const resourceConfig = resourceConfigs.find((r) => r.ID === resourceId);
              const icon = getResourceIcon(resourceId, resourceConfig);
              const name = getResourceName(resourceId, resourceConfig);
              const sign = quantity >= 0 ? '+' : '';
              
              return (
                <div
                  key={resourceId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '2px 6px',
                    background: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid #fff',
                    borderRadius: 4,
                    fontSize: 11,
                    color: quantity >= 0 ? '#4ade80' : '#f87171',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{icon}</span>
                  <span>{name}</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {sign}{quantity}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);

ExplorationCell.displayName = 'ExplorationCell';
