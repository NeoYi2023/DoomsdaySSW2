import { useState, useEffect } from 'react';
import type { Chapter } from '../types/gameTypes';
import { getText } from '../core/LanguageManager';

export interface ChapterStoryPanelProps {
  chapter: Chapter;
  onContinue: () => void;
}

export function ChapterStoryPanel({ chapter, onContinue }: ChapterStoryPanelProps) {
  const [isVisible, setIsVisible] = useState(true);

  // 解析剧情文本（支持多段文本，以换行符或特殊标记分隔）
  const parseStoryText = (storyKey: string): string[] => {
    const text = getText(storyKey);
    // 如果文本包含多个段落标记（如 \n\n 或 |），则分割
    if (text.includes('|')) {
      return text.split('|').map((s) => s.trim()).filter((s) => s.length > 0);
    }
    // 如果包含双换行符，则分割
    if (text.includes('\n\n')) {
      return text.split('\n\n').map((s) => s.trim()).filter((s) => s.length > 0);
    }
    // 否则作为单段文本
    return [text];
  };

  const storyParagraphs = parseStoryText(chapter.config.剧情Key);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        fontFamily: 'monospace',
        color: '#fff',
      }}
      onClick={(e) => {
        // 点击背景区域也可以关闭
        if (e.target === e.currentTarget) {
          setIsVisible(false);
          onContinue();
        }
      }}
    >
      <div
        style={{
          maxWidth: 800,
          width: '100%',
          backgroundColor: '#1a1a1a',
          border: '2px solid #555',
          borderRadius: 8,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 章节标题 */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            textAlign: 'center',
            color: '#ffd700',
            marginBottom: 8,
          }}
        >
          {getText(chapter.config.名称Key)}
        </div>

        {/* 剧情文本 */}
        <div
          style={{
            fontSize: 16,
            lineHeight: 1.8,
            color: '#ddd',
            whiteSpace: 'pre-wrap',
            textAlign: 'left',
            maxHeight: '60vh',
            overflowY: 'auto',
            padding: '0 8px',
          }}
        >
          {storyParagraphs.map((paragraph, index) => (
            <div key={index} style={{ marginBottom: index < storyParagraphs.length - 1 ? 16 : 0 }}>
              {paragraph}
            </div>
          ))}
        </div>

        {/* 继续按钮 */}
        <button
          onClick={() => {
            setIsVisible(false);
            onContinue();
          }}
          style={{
            padding: '12px 24px',
            fontSize: 16,
            backgroundColor: '#4a8a4a',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            alignSelf: 'center',
            marginTop: 8,
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#5a9a5a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4a8a4a';
          }}
        >
          继续
        </button>
      </div>
    </div>
  );
}

