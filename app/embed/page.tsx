'use client';

import { useState, useEffect, useRef } from 'react';
import ChatMessage from '@/components/ChatMessage';
import RelatedQuestions from '@/components/RelatedQuestions';
import ThinkingDots from '@/components/ThinkingDots';
import ChatHeader from '@/components/ChatHeader';
import { ChatMessageProps } from '@/components/types';
import Image from 'next/image';
import botIcon from '@/public/boticon.svg';

export default function EmbedPage() {
  const [messages, setMessages] = useState<ChatMessageProps[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessageProps[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isFirstVisit) {
      const initialMessage: ChatMessageProps = {
        role: 'assistant',
        content: 'こんにちは。何かお手伝いできることはありますか？',
      };
      setMessages([initialMessage]);
      setChatHistory([initialMessage]);
      setRelatedQuestions([
        'Discovery AIの料金を教えてください',
        'どうやって導入を始めればいいですか？',
        'どのプランが自分に合っていますか？',
      ]);
    }
  }, [isFirstVisit]);

  const handleReset = () => {
    const initialMessage: ChatMessageProps = {
      role: 'assistant',
      content: 'こんにちは。何かお手伝いできることはありますか？',
    };
    setMessages([initialMessage]);
    setChatHistory([initialMessage]);
    setRelatedQuestions([
      'Discovery AIの料金を教えてください',
      'どうやって導入を始めればいいですか？',
      'どのプランが自分に合っていますか？',
    ]);
    setIsFirstVisit(true);
  };

  const sendMessage = async (customInput?: string) => {
    const userMessage = (customInput || input).trim();
    if (!userMessage) return;

    const userMsg: ChatMessageProps = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, userMsg];
    const updatedHistory = [...chatHistory, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:4000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: updatedHistory,
        }),
      });

      const data = await response.json();
      const assistantMsg: ChatMessageProps = {
        role: 'assistant',
        content: data.reply,
      };

      setTimeout(() => {
        setMessages((prev) => [...prev, assistantMsg]);
        setChatHistory(data.updatedHistory || []);
        setRelatedQuestions(data.relatedQuestions || []);
        setIsLoading(false);
        setIsFirstVisit(false);
      }, 600);
    } catch (error) {
      console.error('送信エラー:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="bg-white h-screen flex justify-center py-6 overflow-visible">
      <div className="relative w-full max-w-[420px] mb-15">
        {isOpen && (
          <div className="flex flex-col justify-between w-full bg-black text-white rounded-[24px] shadow-[0_0_30px_rgba(0,0,0,0.5)] h-full">
            <ChatHeader onReset={handleReset} resetButtonClassName="text-[13px]" />

            {/* ▼ 初回はスクロール禁止に切り替え */}
            <div
              className={`flex-1 px-4 pt-10 ${
                isFirstVisit && messages.length === 1
                  ? 'overflow-hidden'
                  : 'overflow-y-auto'
              } space-y-4`}
            >
              {isFirstVisit && messages.length === 1 ? (
                <div className="flex flex-col items-center justify-center text-center h-[500px]">
                  <Image src={botIcon} alt="bot icon" width={32} height={32} className="mb-5" />
                  <p className="text-3xl font-bold mb-2">こんにちは。</p>
                  <p className="text-sm text-gray-400 mb-6">何かお手伝いできることはありますか？</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <ChatMessage key={idx} role={msg.role} content={msg.content} />
                  ))}
                  {isLoading && <ThinkingDots />}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* よくあるご質問 / 関連したご質問 */}
            {relatedQuestions.length > 0 && (
              <div className="px-4 pt-2 pb-4 border-t border-gray-700 bg-black">
                <p className="text-sm text-gray-400 mb-2">
                  {isFirstVisit && messages.length === 1
                    ? 'よくあるご質問'
                    : '関連したご質問'}
                </p>
                <RelatedQuestions
                  questions={relatedQuestions}
                  onSelect={(q) => sendMessage(q)}
                />
              </div>
            )}

            {/* 入力エリア */}
            <div className="p-4 border-t border-gray-800 bg-[#1b1b1b] rounded-b-[24px]">
              <div className="bg-[#2c2c2c] rounded-[24px] flex items-center px-4 h-20">
                <textarea
                  rows={1}
                  className="flex-1 resize-none bg-transparent text-white focus:outline-none text-sm leading-relaxed placeholder-gray-400 py-2 max-h-[120px] overflow-y-auto"
                  placeholder="メッセージを入力..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={input.trim() === ''}
                  className={`ml-2 w-12 h-12 flex items-center justify-center rounded-full text-white text-xl transition-colors ${
                    input.trim() === ''
                      ? 'bg-gray-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  ↑
                </button>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -bottom-4 right-0 translate-y-full mt-4 bg-black text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
        >
          <span className="text-2xl leading-none">{isOpen ? '⌄' : '⌃'}</span>
        </button>
      </div>
    </div>
  );
}
