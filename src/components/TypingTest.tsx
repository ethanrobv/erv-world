import React, { useEffect, useState, useRef } from "react";

import { ContentWindow } from "./";
import TypingInput from "./TypingInput.tsx";
import TypingWordDisplay from "./TypingWordDisplay.tsx";


const TypingTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWords = async () => {
      try {
        const response: Response = await fetch("/words_alpha.txt");
        const text: string = await response.text();
        const splitWords: string[] = text
          .split("\n")
          .map(word => word.trim())
          .filter(Boolean);
        for (let i: number = splitWords.length - 1; i > 0; i--) {
          const j: number = Math.floor(Math.random() * (i + 1));
          [splitWords[i], splitWords[j]] = [splitWords[j], splitWords[i]];
        }
        setWords(splitWords);
      } catch (error) {
        console.log("Failed to fetch word list from file:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchWords();
  }, []);

  const handleInputChange = (value: string) => {
    setUserInput(value);
  };

  const handleSpaceBar = () => {
    if (userInput.trim() === words[currentWordIndex]) {
      setCurrentWordIndex(prevIndex => prevIndex + 1);
      setUserInput("");
      return true;
    } else {
      return false;
    }
  };

  if (isLoading) {
    return (
      <div>
        <ContentWindow>
          Loading...
        </ContentWindow>
      </div>
    );
  }

  const previousWord: string = currentWordIndex > 0 ? words[currentWordIndex - 1] : "";
  const currentWord: string = words[currentWordIndex];
  const nextWord: string = currentWordIndex < words.length - 1 ? words[currentWordIndex + 1] : "";

  return (
    <div>
      <ContentWindow>
        <TypingWordDisplay
          previousWord={previousWord}
          currentWord={currentWord}
          nextWord={nextWord}
        />
      </ContentWindow>
      <TypingInput
        value={userInput}
        onChange={handleInputChange}
        onSpaceBar={handleSpaceBar}
        textInputRef={inputRef}
      />
    </div>
  );
};

export default TypingTest;
