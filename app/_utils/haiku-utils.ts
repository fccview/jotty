import { WORDS } from "@/app/_consts/wordsArray";

/**
 * Ok I am aware this is absolutely unhinged but I think it's so much fun I couldn't help myself.
 * After all is only used in the 404 page.
 */

export const generateHaiku = () => {
  const getRandomWord = () => WORDS[Math.floor(Math.random() * WORDS.length)];
  
  const lineStructure = [
    Math.floor(Math.random() * 3) + 2,
    Math.floor(Math.random() * 4) + 4,
    Math.floor(Math.random() * 3) + 2
  ];

  const poem = lineStructure.map(wordCount => {
    const line = Array(wordCount).fill(0).map(() => getRandomWord()).join(' ');
    const punc = Math.random() > 0.8 ? (Math.random() > 0.5 ? ',' : '.') : '';
    return line.charAt(0).toUpperCase() + line.slice(1) + punc;
  }).join('\n');

  return poem;
};
