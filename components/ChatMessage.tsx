'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessageProps } from './types';

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  const isBot = role === 'assistant';

  // contentがオブジェクトならcontent.answerを取り出す（Markdown想定）
  const displayContent =
    typeof content === 'string'
      ? content
      : typeof content === 'object' && content.answer
      ? content.answer
      : JSON.stringify(content); // 万が一のためのfallback

  return (
    <div
      className={`flex items-start gap-2 mb-3 ${isBot ? '' : 'justify-end'}`}
    >
      {isBot && (
        <img
          src="/boticon.svg"
          alt="Bot icon"
          className="w-6 h-6 mr-2"
        />
      )}

      <div
        className={`px-4 py-2 rounded-lg text-sm max-w-[80%] whitespace-pre-wrap ${
          isBot
            ? 'bg-neutral-800 text-white'
            : 'bg-blue-600 text-white'
        }`}
      >
        <ReactMarkdown>{displayContent}</ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatMessage;
