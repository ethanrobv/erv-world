import React, { type JSX, type RefObject, useEffect, useState, useRef } from "react";

import { ContentWindow } from "../index.ts";
import TypingInput from "./TypingInput.tsx";
import TypingWordDisplay from "./TypingWordDisplay.tsx";


const TypingApp: React.FC = (): JSX.Element => {
  const [isLoading, setIsLoading] = useState(true);
  const [words, setWords] = useState<string[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const inputRef: RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);

  useEffect((): void => {
    const fetchWords: () => Promise<void> = async (): Promise<void> => {
      try {
        const response: Response = await fetch("/assets/words_alpha.txt");
        const text: string = await response.text();
        const splitWords: string[] = text
          .split("\n")
          .map((word: string): string => word.trim())
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
    if (isLoading){
      void fetchWords();
    } else if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  const handleInputChange: (value: string) => void = (value: string): void => {
    setUserInput(value);
  };

  const handleSpaceBar: () => boolean = (): boolean => {
    if (userInput.trim() === words[currentWordIndex]) {
      setCurrentWordIndex((prevIndex: number): number => prevIndex + 1);
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

export default TypingApp;
