import type { ExplorerConfigEntry, ExplorationPointConfigEntry } from '../types/configTypes';
import { getText } from '../core/LanguageManager';

export interface TeamSelectionPanelProps {
  visible: boolean;
  availableExplorers: ExplorerConfigEntry[];
  selectedIds: string[];
  explorationPoint?: ExplorationPointConfigEntry | null; // 要前往的探索点
  onToggle: (explorerId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  locked?: boolean; // 是否锁定成员选择（已有探险队时）
}

export function TeamSelectionPanel({
  visible,
  availableExplorers,
  selectedIds,
  explorationPoint,
  onToggle,
  onConfirm,
  onCancel,
  locked = false,
}: TeamSelectionPanelProps) {
  if (!visible) return null;

  const canConfirm = selectedIds.length >= 1 && selectedIds.length <= 3;

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
          width: 500,
          color: '#fff',
        }}
      >
        {explorationPoint && (
          <div
            style={{
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: '1px solid #555',
            }}
          >
            <div style={{ fontSize: 14, color: '#aaa', marginBottom: 4 }}>
              目标探索点
            </div>
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#4caf50' }}>
              {getText(explorationPoint.名称Key ?? explorationPoint.ID)}
            </div>
          </div>
        )}
        <h3>{locked ? '当前探险队' : '创建探险队'}</h3>
        <p>
          {locked
            ? `探险队成员（共 ${selectedIds.length} 人）`
            : `请选择 1-3 名角色组成探险队（已选择：${selectedIds.length}/3）`}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {availableExplorers.map((explorer) => {
            const isSelected = selectedIds.includes(explorer.ID);
            const maxHp = (explorer as any).最大血量 ?? (explorer as any).最大生命 ?? 100;
            const attack = (explorer as any).攻击力 ?? 0;
            const maxStamina = (explorer as any).最大体力 ?? 10;
            const tags = (explorer as any).末日前身份标签 ?? '';

            return (
              <div
                key={explorer.ID}
                style={{
                  border: `2px solid ${isSelected ? '#4caf50' : '#555'}`,
                  borderRadius: 4,
                  padding: 8,
                  cursor: locked ? 'default' : 'pointer',
                  background: isSelected ? '#1a3a1a' : '#1a1a1a',
                  opacity: locked && !isSelected ? 0.5 : 1,
                }}
                onClick={() => !locked && onToggle(explorer.ID)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 'bold' }}>
                      {getText(explorer.名称Key ?? explorer.ID)}
                    </div>
                    <div style={{ fontSize: 12, color: '#aaa' }}>
                      {tags && `标签: ${tags}`} | HP: {maxHp} | ATK: {attack} | 体力: {maxStamina}
                    </div>
                  </div>
                  <div style={{ fontSize: 20 }}>{isSelected ? '✓' : '○'}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'right' }}>
          <button onClick={onCancel} style={{ marginRight: 8 }}>
            取消
          </button>
          <button onClick={onConfirm} disabled={!canConfirm}>
            {locked ? '前往' : '出发'} ({selectedIds.length}/3)
          </button>
        </div>
        {selectedIds.length === 0 && (
          <p style={{ color: '#f44336', fontSize: 12, marginTop: 8 }}>
            至少需要选择 1 名角色
          </p>
        )}
        {selectedIds.length > 3 && (
          <p style={{ color: '#f44336', fontSize: 12, marginTop: 8 }}>
            最多只能选择 3 名角色
          </p>
        )}
      </div>
    </div>
  );
}
