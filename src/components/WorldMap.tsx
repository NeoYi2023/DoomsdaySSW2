import type { MapConfigEntry, ExplorationPointConfigEntry } from '../types/gameTypes';
import { getText } from '../core/LanguageManager';

export interface WorldPosition {
  x: number;
  y: number;
}

export interface WorldMapProps {
  mapCells: MapConfigEntry[];
  points: ExplorationPointConfigEntry[];
  onSelectPoint: (point: ExplorationPointConfigEntry) => void;
  onSelectShelter?: (position: WorldPosition) => void;
  teamPosition?: WorldPosition | null;
}

interface InternalCell {
  x: number;
  y: number;
  type: string;
  point?: ExplorationPointConfigEntry;
}

export function WorldMap({ mapCells, points, onSelectPoint, onSelectShelter, teamPosition }: WorldMapProps) {
  if (!mapCells.length) return <div>地图配置为空</div>;

  const pointById = new Map<string, ExplorationPointConfigEntry>();
  for (const p of points) {
    pointById.set(p.ID, p);
  }

  const internalCells: InternalCell[] = mapCells.map((c) => {
    let point: ExplorationPointConfigEntry | undefined;
    const ids = (c as any).资源生成规则ID as string[] | undefined;
    if (c.格子类型 === '探索点' && ids && ids.length > 0) {
      point = pointById.get(ids[0]);
    }
    return {
      x: c.X坐标,
      y: c.Y坐标,
      type: c.格子类型,
      point,
    };
  });

  const xs = internalCells.map((c) => c.x);
  const ys = internalCells.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  const cellMap = new Map<string, InternalCell>();
  for (const c of internalCells) {
    cellMap.set(`${c.x},${c.y}`, c);
  }

  // 渲染时交换X/Y轴：外层循环用X（作为行），内层循环用Y（作为列）
  const rows: JSX.Element[] = [];
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/785ee644-5db5-4b52-b42f-bb682139b76e', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'road-align-check',
      hypothesisId: 'R1',
      location: 'WorldMap.tsx:render',
      message: 'grid summary',
      data: {
        minX,
        maxX,
        minY,
        maxY,
        width,
        height,
        roadCount: internalCells.filter((c) => c.type === '道路').length,
        obstacleCount: internalCells.filter(
          (c) => c.type === '障碍' || c.type === 'Obstacle' || c.type === '空地',
        ).length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  for (let x = minX; x <= maxX; x++) {
    const cells: JSX.Element[] = [];
    for (let y = minY; y <= maxY; y++) {
      const key = `${x},${y}`;
      const cell = cellMap.get(key);
      if (!cell) {
        cells.push(
          <div key={key} style={emptyStyle} />,
        );
        continue;
      }

      const isShelter = cell.type === '避难所';
      const isRoad = cell.type === '道路';
      const isExploration = cell.type === '探索点';
      // “障碍”格子（包括兼容旧配置中的“空地”）
      const isObstacle =
        cell.type === '障碍' || cell.type === 'Obstacle' || cell.type === '空地';
      const hasPoint = !!cell.point;

      let bg = 'transparent';
      let label = '';
      // 描边改为使用 box-shadow 向内描边，不再使用 border，避免格子外轮廓看起来有偏移
      let border = 'none' as string | undefined;
      let boxShadow: string | undefined;

      // #region agent log
      if (isRoad && x === minX + 1) {
        fetch('http://127.0.0.1:7242/ingest/785ee644-5db5-4b52-b42f-bb682139b76e', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'road-align-check',
            hypothesisId: 'R2',
            location: 'WorldMap.tsx:cell',
            message: 'road cell sample',
            data: { x, y, type: cell.type },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion

      if (isShelter) {
        // 避难所：绿色实心格子 + 向内描边（1 像素）
        bg = '#2e7d32';
        label = '🏠';
        border = 'none';
        boxShadow = 'inset 0 0 0 1px #555';
      } else if (isExploration) {
        // 探索点：橙色实心格子 + 向内描边（1 像素）
        bg = '#ff9800';
        label = '📍';
        border = 'none';
        boxShadow = 'inset 0 0 0 1px #555';
      } else if (isRoad) {
        // 道路：蓝色实心格子 + 向内描边（1 像素）
        bg = '#1e88e5';
        label = '';
        border = 'none';
        boxShadow = 'inset 0 0 0 1px #555';
      } else if (isObstacle) {
        // 障碍格子：完全透明，不绘制边框，只透出底图
        bg = 'transparent';
        label = '';
        border = 'none';
        boxShadow = 'none';
      }

      // 当有探索点时可点击（无论探险队是否存在）
      // 当有探险队外出时，避难所也可以点击（用于返回避难所）
      const clickable = (isExploration && hasPoint) || (isShelter && !!teamPosition && !!onSelectShelter);
      const isTeamHere = teamPosition && teamPosition.x === x && teamPosition.y === y;

      cells.push(
        <div
          key={key}
          style={{
            ...baseCellStyle,
            backgroundColor: bg,
            border,
            boxShadow,
            cursor: clickable ? 'pointer' : 'default',
            position: 'relative',
          }}
          onClick={() => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/785ee644-5db5-4b52-b42f-bb682139b76e', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'shelter-click-check',
                hypothesisId: 'S1',
                location: 'WorldMap.tsx:onClick',
                message: 'cell clicked',
                data: {
                  x,
                  y,
                  type: cell.type,
                  hasPoint,
                  clickable,
                  teamPosition,
                },
                timestamp: Date.now(),
              }),
            }).catch(() => {});
            // #endregion

            if (clickable) {
              if (isExploration && cell.point) {
                onSelectPoint(cell.point);
              } else if (isShelter && onSelectShelter) {
                onSelectShelter({ x, y });
              }
            }
          }}
          title={cell.point ? getText(cell.point.名称Key ?? cell.point.ID) : cell.type}
        >
          <div>{label}</div>
          {isTeamHere && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                background: 'rgba(255, 255, 0, 0.3)',
                pointerEvents: 'none',
              }}
            >
              👥
            </div>
          )}
        </div>,
      );
    }
    rows.push(
      <div key={x} style={{ display: 'flex' }}>
        {cells}
      </div>,
    );
  }

  return (
    <div>
      <h2>大地图</h2>
      <div
        style={{
          display: 'inline-block',
          border: '1px solid #555',
          padding: 4,
          // 使用背景图作为大地图底图
          backgroundColor: '#000',
          backgroundImage: 'url("/images/world-map-bg.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {rows}
      </div>
    </div>
  );
}

const baseCellStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
};

const emptyStyle: React.CSSProperties = {
  ...baseCellStyle,
  backgroundColor: '#222',
};
