import type { MapCellRuntime } from '../types/gameTypes';

export interface WorldPosition {
  x: number;
  y: number;
}

export interface PathResult {
  path: WorldPosition[]; // 不包含起点，包含终点
}

/**
 * 简单的网格地图系统：
 * - 从 MapConfig/MapCellRuntime 构建可行走网格；
 * - 计算从起点到终点的路径；
 * - 提供“沿路径前进一格”的工具方法（1 回合走 1 格）。
 */
export class MapSystem {
  private readonly cells: MapCellRuntime[];

  constructor(cells: MapCellRuntime[]) {
    this.cells = cells;
  }

  /** 判断某个坐标是否可走（目前简单根据格子是否存在、是否不是阻挡类型来判断）。 */
  isWalkable(pos: WorldPosition): boolean {
    const cell = this.cells.find((c) => c.x === pos.x && c.y === pos.y);
    if (!cell) {
      return false;
    }

    // 根据 SPEC：空地视为障碍，不可通行；已建设地点也不可通行。
    // 允许通行的类型仅限：道路 / 避难所 / 探索点（兼容中英文配置值）。
    const t = cell.type;
    const allowed =
      t === 'Road' ||
      t === 'Shelter' ||
      t === 'ExplorationPoint' ||
      t === '道路' ||
      t === '避难所' ||
      t === '探索点';


    return allowed;
  }

  /** 使用 BFS 计算从起点到终点的最短路径（4 向移动）。 */
  findPath(start: WorldPosition, target: WorldPosition): PathResult | null {
    if (start.x === target.x && start.y === target.y) {
      return { path: [] };
    }

    const key = (p: WorldPosition) => `${p.x},${p.y}`;
    const visited = new Set<string>();
    const queue: { pos: WorldPosition; prev?: string }[] = [];
    const prevMap = new Map<string, string | undefined>();

    queue.push({ pos: start, prev: undefined });
    visited.add(key(start));

    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];

    let foundKey: string | null = null;

    while (queue.length > 0) {
      const current = queue.shift()!;
      const curKey = key(current.pos);

      if (current.pos.x === target.x && current.pos.y === target.y) {
        foundKey = curKey;
        break;
      }

      for (const d of dirs) {
        const next: WorldPosition = { x: current.pos.x + d.x, y: current.pos.y + d.y };
        const nextKey = key(next);
        if (visited.has(nextKey)) continue;
        if (!this.isWalkable(next)) continue;
        visited.add(nextKey);
        prevMap.set(nextKey, curKey);
        queue.push({ pos: next, prev: curKey });
      }
    }

    if (!foundKey) return null;

    // 回溯路径
    const path: WorldPosition[] = [];
    let curKey = foundKey;
    while (curKey !== key(start)) {
      const [xStr, yStr] = curKey.split(',');
      path.push({ x: Number(xStr), y: Number(yStr) });
      const p = prevMap.get(curKey);
      if (!p) break;
      curKey = p;
    }

    path.reverse();


    return { path };
  }

  /** 沿路径前进一步：返回新的位置（如果路径为空则留在原地）。 */
  stepAlongPath(current: WorldPosition, path: WorldPosition[]): WorldPosition {
    if (path.length === 0) return current;
    // 1 回合走 1 格：取路径中的第一个目标格子
    return path[0];
  }
}
