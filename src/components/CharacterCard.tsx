import type { Explorer, Monster } from '../types/gameTypes';
import { getText } from '../core/LanguageManager';

export interface CharacterCardProps {
  type: 'explorer' | 'monster';
  data: Explorer | Monster;
}

export function CharacterCard({ type, data }: CharacterCardProps) {
  const isExplorer = type === 'explorer';
  const nameKey = (data.config as any).名称Key ?? data.id;
  const name = getText(nameKey);
  const maxHp = (data.config as any).最大生命 ?? (data as any).currentHp ?? 100;
  const currentHp = (data as any).currentHp ?? maxHp;
  const attack = (data.config as any).攻击力 ?? 0;

  const ratio = Math.max(0, Math.min(1, currentHp / maxHp));

  return (
    <div
      style={{
        border: '1px solid #888',
        borderRadius: 4,
        padding: 4,
        background: '#1e1e1e',
        fontSize: 10,
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
        <span style={{ marginRight: 4 }}>{isExplorer ? '🧍' : '👾'}</span>
        <span>{name}</span>
      </div>
      <div style={{ height: 6, background: '#333', borderRadius: 3, overflow: 'hidden', marginBottom: 2 }}>
        <div
          style={{
            width: `${ratio * 100}%`,
            height: '100%',
            background: '#e53935',
          }}
        />
      </div>
      <div>HP: {currentHp} / {maxHp}</div>
      <div>ATK: {attack}</div>
    </div>
  );
}
