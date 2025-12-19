/**
 * 对元素应用震动动画效果
 * @param element 要震动的DOM元素
 * @param duration 震动持续时间（毫秒），默认300ms
 */
export function applyShakeEffect(element: HTMLElement, duration: number = 300): void {
  // 创建震动动画的keyframes
  const keyframes = [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(-2px)' },
    { transform: 'translateX(2px)' },
    { transform: 'translateX(0)' },
  ];

  const options: KeyframeAnimationOptions = {
    duration,
    easing: 'ease-in-out',
    fill: 'forwards',
  };

  element.animate(keyframes, options);
}
