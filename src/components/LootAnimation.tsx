import { useEffect, useRef } from 'react';
import type { ResourceStack } from '../types/gameTypes';
import { getResourceIcon, getResourceName } from '../utils/resourceIcons';
import type { ResourceConfigEntry } from '../types/configTypes';

export interface LootAnimationProps {
  startElement: HTMLElement | null;
  endElement: HTMLElement | null;
  loot: ResourceStack[];
  resourceConfigs: ResourceConfigEntry[];
  onComplete: () => void;
}

export function LootAnimation({
  startElement,
  endElement,
  loot,
  resourceConfigs,
  onComplete,
}: LootAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  useEffect(() => {
    if (!startElement || !endElement || !containerRef.current) {
      onComplete();
      return;
    }

    const container = containerRef.current;
    const startRect = startElement.getBoundingClientRect();
    const endRect = endElement.getBoundingClientRect();

    // 设置初始位置
    container.style.left = `${startRect.left + startRect.width / 2}px`;
    container.style.top = `${startRect.top + startRect.height / 2}px`;

    // 计算目标位置
    const targetX = endRect.left + endRect.width / 2;
    const targetY = endRect.top + endRect.height / 2;

    // 创建飞行动画
    const keyframes = [
      {
        transform: 'translate(0, 0) scale(1)',
        opacity: 1,
      },
      {
        transform: `translate(${targetX - startRect.left - startRect.width / 2}px, ${targetY - startRect.top - startRect.height / 2}px) scale(0.5)`,
        opacity: 0.3,
      },
    ];

    const options: KeyframeAnimationOptions = {
      duration: 600,
      easing: 'ease-in-out',
      fill: 'forwards',
    };

    const animation = container.animate(keyframes, options);
    animationRef.current = animation;

    animation.onfinish = () => {
      onComplete();
    };

    return () => {
      if (animationRef.current) {
        animationRef.current.cancel();
      }
    };
  }, [startElement, endElement, onComplete]);

  // 合并相同资源的数量
  const mergedLoot = new Map<string, number>();
  for (const item of loot) {
    const current = mergedLoot.get(item.resourceId) || 0;
    mergedLoot.set(item.resourceId, current + item.quantity);
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {Array.from(mergedLoot.entries()).map(([resourceId, quantity]) => {
        const resourceConfig = resourceConfigs.find((r) => r.ID === resourceId);
        const icon = getResourceIcon(resourceId, resourceConfig);
        const name = getResourceName(resourceId, resourceConfig);
        const sign = quantity >= 0 ? '+' : '';
        
        return (
          <div
            key={resourceId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 8px',
              background: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid #fff',
              borderRadius: 4,
              fontSize: 12,
              color: quantity >= 0 ? '#4ade80' : '#f87171',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{icon}</span>
            <span>{name}</span>
            <span style={{ fontWeight: 'bold' }}>
              {sign}{quantity}
            </span>
          </div>
        );
      })}
    </div>
  );
}
