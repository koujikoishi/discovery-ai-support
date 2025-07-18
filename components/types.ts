export interface ChatMessageProps {
  role: "user" | "assistant" | "thinking";
  content: string | { answer: string };
}

export interface RelatedQuestionsProps {
  questions: string[];
  onSelect: (question: string) => void;
}
