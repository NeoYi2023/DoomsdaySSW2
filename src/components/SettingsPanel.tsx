import { useState, useEffect } from 'react';
import { audioSystem } from '../core/AudioSystem';

export interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsPanel({ visible, onClose }: SettingsPanelProps) {
  const [volume, setVolume] = useState(audioSystem.getVolume());
  const [isMuted, setIsMuted] = useState(audioSystem.getMuted());

  // 同步音频系统状态
  useEffect(() => {
    setVolume(audioSystem.getVolume());
    setIsMuted(audioSystem.getMuted());
  }, [visible]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    audioSystem.setVolume(newVolume);
    setVolume(newVolume);
    // 如果调整音量，自动取消静音
    if (isMuted && newVolume > 0) {
      audioSystem.setMuted(false);
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    audioSystem.setMuted(newMuted);
    setIsMuted(newMuted);
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* 遮罩层 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9998,
        }}
        onClick={onClose}
      />
      {/* 设置面板 */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#222',
          border: '2px solid #555',
          borderRadius: 8,
          padding: 24,
          minWidth: 320,
          maxWidth: 500,
          zIndex: 9999,
          fontFamily: 'monospace',
          color: '#fff',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>设置</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: 24,
              cursor: 'pointer',
              padding: 0,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="关闭"
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label style={{ fontSize: 14 }}>背景音乐音量</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleToggleMute}
                style={{
                  background: isMuted ? '#f44336' : '#4caf50',
                  border: 'none',
                  color: '#fff',
                  fontSize: 18,
                  cursor: 'pointer',
                  padding: '4px 12px',
                  borderRadius: 4,
                  minWidth: 50,
                }}
                title={isMuted ? '取消静音' : '静音'}
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              <span style={{ fontSize: 14, minWidth: 45, textAlign: 'right' }}>
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            style={{
              width: '100%',
              height: 6,
              borderRadius: 3,
              background: '#555',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </div>

        <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
          其他设置功能后续补充
        </div>
      </div>
    </>
  );
}

