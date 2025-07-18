type ChatHeaderProps = {
  onReset: () => void;
  resetButtonClassName?: string; // ← 追加
};

export default function ChatHeader({ onReset, resetButtonClassName = '' }: ChatHeaderProps) {
  return (
    <div className="flex justify-between items-center p-4 border-b border-gray-800">
      <h2 className="text-base font-bold">Discovery AI Support</h2>
      <button
        onClick={onReset}
        className={`text-white hover:text-gray-300 transition ${resetButtonClassName}`}
      >
        🗑️ 会話をリセット
      </button>
    </div>
  );
}
