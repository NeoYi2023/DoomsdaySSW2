import type { ResourceConfigEntry } from '../types/configTypes';
import { getText } from '../core/LanguageManager';

/**
 * 获取资源的图标显示
 * 如果配置表中有图标字段，则使用；否则使用emoji占位符
 */
export function getResourceIcon(resourceId: string, resourceConfig?: ResourceConfigEntry): string {
  // 如果配置表中有图标字段，优先使用
  if (resourceConfig && (resourceConfig as any).图标) {
    return (resourceConfig as any).图标;
  }

  // 根据资源ID返回对应的emoji占位符
  const iconMap: Record<string, string> = {
    resource_food: '🍞',
    resource_water: '💧',
    resource_metal: '⚙️',
    resource_electronics: '🔌',
    resource_tech_point: '⚡',
  };

  return iconMap[resourceId] || '📦';
}

/**
 * 获取资源的显示名称
 */
export function getResourceName(resourceId: string, resourceConfig?: ResourceConfigEntry): string {
  if (resourceConfig) {
    const nameKey = (resourceConfig as any).名称Key || resourceConfig.ID;
    return getText(nameKey);
  }
  return resourceId;
}
