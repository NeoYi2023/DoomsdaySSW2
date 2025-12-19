import type { MapCellRuntime } from '../types/gameTypes';

export interface RoundContext {
  currentRound: number;
  mapCells: MapCellRuntime[];
}

export interface RoundSystemOptions {
  /** 死亡掉落在地图上保留的回合数（包含死亡当回合），默认 96 回合 */
  deathItemExpireRounds?: number;
}

/**
 * 负责处理“进入新回合”时的一些全局结算：
 * - 回合数递增；
 * - 检查地图格子上的死亡掉落是否过期并清理。
 *
 * 与角色体力扣除、临时背包清空等逻辑，可以在更高层的 GameManager 中调用其他系统实现。
 */
export class RoundSystem {
  private readonly deathItemExpireRounds: number;

  constructor(options: RoundSystemOptions = {}) {
    this.deathItemExpireRounds = options.deathItemExpireRounds ?? 96;
  }

  advanceRound(ctx: RoundContext): RoundContext {
    const nextRound = ctx.currentRound + 1;

    const cleanedCells = ctx.mapCells.map((cell) => {
      if (!cell.dropped) return cell;
      const { deathRound } = cell.dropped;
      if (nextRound - deathRound >= this.deathItemExpireRounds) {
        // 超过保留回合数，清理死亡掉落
        return { ...cell, dropped: undefined };
      }
      return cell;
    });

    return {
      currentRound: nextRound,
      mapCells: cleanedCells,
    };
  }
}
