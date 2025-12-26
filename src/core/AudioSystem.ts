export class AudioSystem {
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmPath: string | null = null;
  private volume: number = 0.5; // 默认音量 50%
  private isMuted: boolean = false;
  private isPlaying: boolean = false;

  constructor() {
    // 从本地存储加载设置
    const savedVolume = localStorage.getItem('bgmVolume');
    const savedMuted = localStorage.getItem('bgmMuted');
    
    if (savedVolume !== null) {
      this.volume = parseFloat(savedVolume);
    }
    if (savedMuted !== null) {
      this.isMuted = savedMuted === 'true';
    }
  }

  /**
   * 播放背景音乐
   * @param musicPath 音乐文件路径（相对于 public 目录）
   * @param loop 是否循环播放，默认 true
   */
  playBGM(musicPath: string, loop: boolean = true): void {
    // 如果正在播放相同的音乐，不重复播放
    if (this.currentBgmPath === musicPath && this.isPlaying) {
      return;
    }

    // 停止当前音乐
    this.stopBGM();

    // 创建新的音频对象
    this.bgmAudio = new Audio(musicPath);
    this.bgmAudio.loop = loop;
    this.bgmAudio.volume = this.isMuted ? 0 : this.volume;
    
    // 播放音乐
    this.bgmAudio.play().catch((error) => {
      console.warn('背景音乐播放失败:', error);
      // 浏览器可能阻止了自动播放，需要用户交互后才能播放
    });

    this.currentBgmPath = musicPath;
    this.isPlaying = true;
  }

  /**
   * 停止背景音乐
   */
  stopBGM(): void {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio = null;
    }
    this.currentBgmPath = null;
    this.isPlaying = false;
  }

  /**
   * 暂停背景音乐
   */
  pauseBGM(): void {
    if (this.bgmAudio && this.isPlaying) {
      this.bgmAudio.pause();
      this.isPlaying = false;
    }
  }

  /**
   * 恢复背景音乐
   */
  resumeBGM(): void {
    if (this.bgmAudio && !this.isPlaying) {
      this.bgmAudio.play().catch((error) => {
        console.warn('背景音乐恢复失败:', error);
      });
      this.isPlaying = true;
    }
  }

  /**
   * 设置音量（0-1）
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('bgmVolume', this.volume.toString());
    if (this.bgmAudio) {
      this.bgmAudio.volume = this.isMuted ? 0 : this.volume;
    }
  }

  /**
   * 获取当前音量
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * 静音/取消静音
   */
  setMuted(muted: boolean): void {
    this.isMuted = muted;
    localStorage.setItem('bgmMuted', muted.toString());
    if (this.bgmAudio) {
      this.bgmAudio.volume = muted ? 0 : this.volume;
    }
  }

  /**
   * 获取静音状态
   */
  getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * 获取播放状态
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

// 导出单例
export const audioSystem = new AudioSystem();

