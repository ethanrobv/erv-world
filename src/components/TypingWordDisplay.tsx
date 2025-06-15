import React from "react";

import type { ITypingWordDisplayProps } from "../types/TypingComponentTypes.ts";
import styles from "../styles/TypingWordDisplay.module.css";


const TypingWordDisplay: React.FC<ITypingWordDisplayProps> = ({
  previousWord,
  currentWord,
  nextWord,
  }) => {
  return (
    <div className={styles.wordDisplayContainer}>
      <span className={styles.prevWord}>{previousWord}</span>
      <span className={styles.currentWord}>{currentWord}</span>
      <span className={styles.nextWord}>{nextWord}</span>
    </div>
  );
};

export default TypingWordDisplay;
