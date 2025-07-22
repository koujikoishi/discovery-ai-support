// utils/getSmalltalkResponse.js

const getSmalltalkResponse = (message) => {
  const lower = message.toLowerCase();

  if (lower.includes('こんにちは') || lower.includes('はじめまして')) {
    return 'こんにちは！今日も良い一日になりますように ☀️';
  }
  if (lower.includes('元気') || lower.includes('調子')) {
    return 'ありがとうございます！元気に稼働中です💪';
  }
  if (lower.includes('好き') || lower.includes('すごい')) {
    return 'そう言っていただけて嬉しいです☺️';
  }

  const fallback = [
    'そうなんですね！他に知りたいことがあれば聞いてくださいね！',
    'ありがとうございます〜！何かお困りごとはありますか？',
    'ちょっと照れますね…😳 ご質問あればどうぞ！',
  ];
  return fallback[Math.floor(Math.random() * fallback.length)];
};

export default getSmalltalkResponse;
