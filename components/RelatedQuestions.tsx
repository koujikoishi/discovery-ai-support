type Props = {
  questions: string[];
  onSelect: (question: string) => void;
  title?: string;
};

export default function RelatedQuestions({ questions, onSelect, title }: Props) {
  if (!questions || questions.length === 0) return null;

  return (
    <div>
      {title && (
        <div className="text-sm text-gray-400 mb-2">{title}</div>
      )}
      <div className="flex flex-wrap gap-2">
        {questions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(q)}
            className="text-sm bg-neutral-800 hover:bg-neutral-700 text-white px-3 py-1 rounded-lg transition"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
