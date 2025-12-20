import type { Chapter, ChapterStatus, ChapterConfigEntry } from '../types/gameTypes';

export interface ChapterSystemContext {
  currentChapterId: string | null;
  unlockedChapterIds: Set<string>;
  completedChapterIds: Set<string>;
}

/**
 * 从配置创建章节实例
 */
export function createChapterFromConfig(config: ChapterConfigEntry): Chapter {
  const mapIds = config.地图ID列表
    .split('|')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);

  // 第一章默认为已解锁，其他章节默认为未解锁
  const initialStatus: ChapterStatus =
    config.章节编号 === 1 ? 'Unlocked' : 'Locked';

  return {
    chapterId: config.ID,
    config,
    status: initialStatus,
    currentMapIndex: 1, // 默认从第一张地图开始
    mapIds,
  };
}

/**
 * 章节系统主类
 */
export class ChapterSystem {
  private chapters: Map<string, Chapter> = new Map();
  private ctx: ChapterSystemContext;

  constructor(chapterConfigs: ChapterConfigEntry[], initialContext?: Partial<ChapterSystemContext>) {
    // 初始化上下文
    this.ctx = {
      currentChapterId: initialContext?.currentChapterId ?? null,
      unlockedChapterIds: initialContext?.unlockedChapterIds ?? new Set(),
      completedChapterIds: initialContext?.completedChapterIds ?? new Set(),
    };

    // 初始化所有章节
    for (const config of chapterConfigs) {
      const chapter = createChapterFromConfig(config);
      this.chapters.set(chapter.chapterId, chapter);
    }

    // 设置初始状态
    this.initializeChapterStates();
  }

  /**
   * 初始化章节状态
   */
  private initializeChapterStates(): void {
    // 第一章默认为已解锁
    const firstChapter = this.getChapterByNumber(1);
    if (firstChapter) {
      firstChapter.status = 'Unlocked';
      this.ctx.unlockedChapterIds.add(firstChapter.chapterId);
      if (!this.ctx.currentChapterId) {
        this.ctx.currentChapterId = firstChapter.chapterId;
        firstChapter.status = 'InProgress';
      }
    }

    // 恢复已解锁的章节
    for (const chapterId of this.ctx.unlockedChapterIds) {
      const chapter = this.chapters.get(chapterId);
      if (chapter && chapter.status === 'Locked') {
        chapter.status = 'Unlocked';
      }
    }

    // 恢复已完成的章节
    for (const chapterId of this.ctx.completedChapterIds) {
      const chapter = this.chapters.get(chapterId);
      if (chapter) {
        chapter.status = 'Completed';
      }
    }
  }

  /**
   * 根据章节编号获取章节
   */
  getChapterByNumber(chapterNumber: number): Chapter | undefined {
    for (const chapter of this.chapters.values()) {
      if (chapter.config.章节编号 === chapterNumber) {
        return chapter;
      }
    }
    return undefined;
  }

  /**
   * 获取当前章节
   */
  getCurrentChapter(): Chapter | undefined {
    if (!this.ctx.currentChapterId) return undefined;
    return this.chapters.get(this.ctx.currentChapterId);
  }

  /**
   * 获取所有章节
   */
  getAllChapters(): Chapter[] {
    return Array.from(this.chapters.values()).sort(
      (a, b) => a.config.章节编号 - b.config.章节编号,
    );
  }

  /**
   * 获取已解锁的章节
   */
  getUnlockedChapters(): Chapter[] {
    return this.getAllChapters().filter((c) => c.status !== 'Locked');
  }

  /**
   * 解锁下一章节
   * 当完成章节结束任务时调用
   */
  unlockNextChapter(): Chapter | null {
    const currentChapter = this.getCurrentChapter();
    if (!currentChapter) return null;

    // 标记当前章节为已完成
    currentChapter.status = 'Completed';
    this.ctx.completedChapterIds.add(currentChapter.chapterId);

    // 查找下一章节
    const nextChapterNumber = currentChapter.config.章节编号 + 1;
    const nextChapter = this.getChapterByNumber(nextChapterNumber);

    if (nextChapter) {
      // 解锁下一章节
      nextChapter.status = 'Unlocked';
      this.ctx.unlockedChapterIds.add(nextChapter.chapterId);

      // 切换到下一章节的第一张地图
      this.ctx.currentChapterId = nextChapter.chapterId;
      nextChapter.status = 'InProgress';
      nextChapter.currentMapIndex = 1;

      return nextChapter;
    }

    return null;
  }

  /**
   * 检查章节是否已解锁
   */
  isChapterUnlocked(chapterId: string): boolean {
    return this.ctx.unlockedChapterIds.has(chapterId);
  }

  /**
   * 检查章节是否已完成
   */
  isChapterCompleted(chapterId: string): boolean {
    return this.ctx.completedChapterIds.has(chapterId);
  }

  /**
   * 获取章节
   */
  getChapter(chapterId: string): Chapter | undefined {
    return this.chapters.get(chapterId);
  }

  /**
   * 获取当前章节的地图ID列表
   */
  getCurrentChapterMapIds(): string[] {
    const currentChapter = this.getCurrentChapter();
    if (!currentChapter) return [];
    return currentChapter.mapIds;
  }

  /**
   * 获取当前地图ID
   */
  getCurrentMapId(): string | null {
    const currentChapter = this.getCurrentChapter();
    if (!currentChapter) return null;
    const mapIndex = currentChapter.currentMapIndex - 1; // 转换为数组索引
    if (mapIndex >= 0 && mapIndex < currentChapter.mapIds.length) {
      return currentChapter.mapIds[mapIndex];
    }
    return currentChapter.mapIds[0] || null; // 默认返回第一张地图
  }

  /**
   * 切换到指定地图
   */
  switchToMap(mapIndex: number): boolean {
    const currentChapter = this.getCurrentChapter();
    if (!currentChapter) return false;
    if (mapIndex < 1 || mapIndex > currentChapter.mapIds.length) return false;

    currentChapter.currentMapIndex = mapIndex;
    return true;
  }

  /**
   * 获取上下文（用于存档）
   */
  getContext(): ChapterSystemContext {
    return {
      currentChapterId: this.ctx.currentChapterId,
      unlockedChapterIds: new Set(this.ctx.unlockedChapterIds),
      completedChapterIds: new Set(this.ctx.completedChapterIds),
    };
  }

  /**
   * 更新上下文（用于读档）
   */
  updateContext(ctx: Partial<ChapterSystemContext>): void {
    if (ctx.currentChapterId !== undefined) {
      this.ctx.currentChapterId = ctx.currentChapterId;
    }
    if (ctx.unlockedChapterIds !== undefined) {
      this.ctx.unlockedChapterIds = ctx.unlockedChapterIds;
    }
    if (ctx.completedChapterIds !== undefined) {
      this.ctx.completedChapterIds = ctx.completedChapterIds;
    }
    // 重新初始化章节状态
    this.initializeChapterStates();
  }
}

