import fs from 'fs';
import path from 'path';
import type { Explorer, MapCellRuntime, ExplorationSession } from '../types/gameTypes';

export interface GameSaveData {
  round: number;
  explorers: Explorer[];
  mapCells: MapCellRuntime[];
  explorationSession?: ExplorationSession;
}

export interface SaveSystemOptions {
  baseDir?: string; // 存档根目录
}

/**
 * 简单的文件存档系统：
 * - 仅在回合结束或返回避难所时被调用；
 * - 不保存临时背包、运行中计算用的缓存等。
 */
export class SaveSystem {
  private readonly baseDir: string;

  constructor(options: SaveSystemOptions = {}) {
    const defaultBaseDir = path.resolve(process.cwd(), 'saves');
    this.baseDir = options.baseDir ?? defaultBaseDir;
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  save(slot: string, data: GameSaveData): void {
    this.ensureDir();
    const filePath = path.join(this.baseDir, `${slot}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  load(slot: string): GameSaveData | null {
    const filePath = path.join(this.baseDir, `${slot}.json`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as GameSaveData;
  }
}
