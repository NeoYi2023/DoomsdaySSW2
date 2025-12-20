import { useMemo } from 'react';
import type { Quest, QuestReward } from '../types/gameTypes';
import { getText } from '../core/LanguageManager';

export interface QuestPanelProps {
  quests: Quest[];
  onCompleteQuest: (questId: string) => void;
  onClaimReward: (questId: string) => void;
}

export function QuestPanel({ quests, onCompleteQuest, onClaimReward }: QuestPanelProps) {
  const acceptedQuests = useMemo(() => {
    return quests.filter(
      (q) => q.status === 'Accepted' || q.status === 'Completed' || q.status === 'RewardClaimed',
    );
  }, [quests]);

  if (acceptedQuests.length === 0) {
    return null; // 没有任务时不显示面板
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        width: 320,
        maxHeight: '80vh',
        overflowY: 'auto',
        backgroundColor: '#1a1a1a',
        border: '1px solid #555',
        borderRadius: 8,
        padding: 12,
        zIndex: 1000,
        color: '#fff',
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 'bold' }}>任务</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {acceptedQuests.map((quest) => (
          <QuestCard
            key={quest.questId}
            quest={quest}
            onComplete={onCompleteQuest}
            onClaimReward={onClaimReward}
          />
        ))}
      </div>
    </div>
  );
}

interface QuestCardProps {
  quest: Quest;
  onComplete: (questId: string) => void;
  onClaimReward: (questId: string) => void;
}

function QuestCard({ quest, onComplete, onClaimReward }: QuestCardProps) {
  const { completionCondition, status } = quest;
  const isCompleted = status === 'Completed' || status === 'RewardClaimed';
  const canComplete = status === 'Accepted' && completionCondition.currentValue >= completionCondition.targetValue;
  const canClaimReward = status === 'Completed';

  // 格式化完成条件显示文本
  const getConditionText = (): string => {
    const { type, targetId, currentValue, targetValue } = completionCondition;
    const current = Math.min(currentValue, targetValue); // 不超过目标值

    switch (type) {
      case 'CollectResource':
        return `收集 ${getText(targetId)} ${current}/${targetValue}`;
      case 'DefeatMonster':
        return `击败 ${getText(targetId)} ${current}/${targetValue}`;
      case 'CompleteExploration':
        return `完成 ${getText(targetId)} ${current}/${targetValue} 次`;
      case 'BuildFacility':
        return `建设 ${getText(targetId)} ${current}/${targetValue} 个`;
      case 'ReachRound':
        return `达到第 ${targetValue} 回合 (当前: ${current})`;
      default:
        return `${current}/${targetValue}`;
    }
  };

  // 格式化奖励显示文本
  const getRewardText = (reward: QuestReward): string => {
    const parts: string[] = [];
    if (reward.resources.length > 0) {
      const resourceTexts = reward.resources.map(
        (r) => `${getText(r.resourceId)} x${r.quantity}`,
      );
      parts.push(...resourceTexts);
    }
    if (reward.items.length > 0) {
      const itemTexts = reward.items.map((i) => `${getText(i.itemId)} x${i.quantity}`);
      parts.push(...itemTexts);
    }
    if (reward.experience) {
      parts.push(`经验 x${reward.experience}`);
    }
    return parts.length > 0 ? parts.join(', ') : '无奖励';
  };

  return (
    <div
      style={{
        backgroundColor: isCompleted ? '#2a4a2a' : '#2a2a2a',
        border: isCompleted ? '1px solid #4a8a4a' : '1px solid #555',
        borderRadius: 4,
        padding: 10,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 4, fontSize: 13 }}>
          {getText(quest.config.名称Key)}
        </div>
        {quest.config.描述Key && (
          <div style={{ color: '#aaa', fontSize: 11, marginBottom: 6 }}>
            {getText(quest.config.描述Key)}
          </div>
        )}
        <div style={{ color: '#ccc', fontSize: 11 }}>{getConditionText()}</div>
      </div>

      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {canComplete && (
          <button
            onClick={() => onComplete(quest.questId)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#4a8a4a',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            完成任务
          </button>
        )}

        {canClaimReward && (
          <button
            onClick={() => onClaimReward(quest.questId)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#8a6a4a',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 11,
            }}
          >
            领取奖励
          </button>
        )}

        {status === 'RewardClaimed' && (
          <div style={{ color: '#8a8a8a', fontSize: 10, fontStyle: 'italic' }}>
            奖励: {getRewardText(quest.reward)}
          </div>
        )}
      </div>
    </div>
  );
}

