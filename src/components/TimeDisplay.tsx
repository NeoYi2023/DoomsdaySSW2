interface TimeDisplayProps {
  currentRound: number; // 总回合数，从1开始
}

export function TimeDisplay({ currentRound }: TimeDisplayProps) {
  const day = Math.floor((currentRound - 1) / 48) + 1;
  const tickOfDay = (currentRound - 1) % 48; // 0-47

  // 根据刻度索引返回背景色
  // 白天：06:00-18:00（刻度 12-35）
  // 傍晚：18:00-22:00（刻度 36-43）
  // 深夜：22:00-06:00（刻度 44-47 + 0-11）
  const getTickColor = (tick: number): string => {
    if (tick >= 12 && tick <= 35) return '#f5f5f5'; // 白天 - 白色
    if (tick >= 36 && tick <= 43) return '#ff9800'; // 傍晚 - 橙色
    return '#7b1fa2'; // 深夜 - 紫色
  };

  const ticks: JSX.Element[] = [];
  for (let i = 0; i < 48; i++) {
    const isCurrent = i === tickOfDay;
    ticks.push(
      <div
        key={i}
        style={{
          width: 12,
          height: 20,
          backgroundColor: getTickColor(i),
          border: isCurrent ? '2px solid #ffeb3b' : '1px solid #555',
          boxSizing: 'border-box',
        }}
        title={`${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 === 0 ? '00' : '30'}`}
      />
    );
  }

  // 计算刻度条总宽度：48格 × 12px + 47个gap × 1px
  const tickBarWidth = 48 * 12 + 47 * 1;

  return (
    <div style={{ marginBottom: 12, padding: 8, background: '#222', borderRadius: 4, display: 'inline-block' }}>
      <div style={{ marginBottom: 6, fontSize: 14 }}>
        第 <strong>{day}</strong> 天 | 当前时间：
        <strong>
          {String(Math.floor(tickOfDay / 2)).padStart(2, '0')}:
          {tickOfDay % 2 === 0 ? '00' : '30'}
        </strong>
      </div>
      <div style={{ display: 'flex', gap: 1 }}>{ticks}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 2, color: '#aaa', width: tickBarWidth }}>
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  );
}
