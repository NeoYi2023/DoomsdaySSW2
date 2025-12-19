import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import type { ExplorationBoardLayer, Explorer, Monster, ResourceStack } from '../types/gameTypes';
import type { GarbageConfigEntry, ResourceConfigEntry } from '../types/configTypes';
import { ExplorationCell } from './ExplorationCell';
import { applyShakeEffect } from '../utils/shakeAnimation';

export interface ExplorationBoardProps {
  layer: ExplorationBoardLayer;
  explorers: Map<string, Explorer>;
  monsters: Map<string, Monster>;
  garbages: GarbageConfigEntry[];
  resourceConfigs?: ResourceConfigEntry[];
  // 视觉反馈数据
  shakingCellIndices?: Set<number>;
  displayLootByCell?: Map<number, ResourceStack[]>;
}

export interface ExplorationBoardRef {
  getCellElement: (cellIndex: number) => HTMLDivElement | null;
}

export const ExplorationBoard = forwardRef<ExplorationBoardRef, ExplorationBoardProps>(
  ({ layer, explorers, monsters, garbages, resourceConfigs, shakingCellIndices, displayLootByCell }, ref) => {
    const cellRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    useImperativeHandle(ref, () => ({
      getCellElement: (cellIndex: number) => {
        return cellRefs.current.get(cellIndex) || null;
      },
    }));

    // 应用震动效果
    useEffect(() => {
      if (shakingCellIndices) {
        shakingCellIndices.forEach((cellIndex) => {
          const element = cellRefs.current.get(cellIndex);
          if (element) {
            applyShakeEffect(element, 300);
          }
        });
      }
    }, [shakingCellIndices]);

    const garbageMap = new Map<string, GarbageConfigEntry>();
    for (const g of garbages) {
      garbageMap.set(g.ID, g);
    }

    const width = 6;
    const height = 4;

    const rows: JSX.Element[] = [];
    for (let y = 0; y < height; y++) {
      const cells: JSX.Element[] = [];
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const cell = layer.cells.find((c) => c.index === index)!;
        const explorer = cell.explorerId ? explorers.get(cell.explorerId) : undefined;
        const monster = cell.monsterId ? monsters.get(cell.monsterId) : undefined;
        const garbageConfig = cell.garbageId ? garbageMap.get(cell.garbageId) : undefined;
        const isShaking = shakingCellIndices?.has(index) || false;
        const displayLoot = displayLootByCell?.get(index);

        cells.push(
          <ExplorationCell
            key={index}
            ref={(el) => {
              if (el) {
                cellRefs.current.set(index, el);
              } else {
                cellRefs.current.delete(index);
              }
            }}
            cell={cell}
            explorer={explorer}
            monster={monster}
            garbageConfig={garbageConfig}
            isShaking={isShaking}
            displayLoot={displayLoot}
            resourceConfigs={resourceConfigs}
          />,
        );
      }
      rows.push(
        <div key={y} style={{ display: 'flex' }}>
          {cells}
        </div>
      );
    }

    return (
      <div>
        <h2>探索棋盘 - 第 {layer.layerIndex} 层</h2>
        <div
          style={{
            display: 'inline-block',
            border: '1px solid #555',
            padding: 4,
            background: '#111',
          }}
        >
          {rows}
        </div>
      </div>
    );
  },
);

ExplorationBoard.displayName = 'ExplorationBoard';
