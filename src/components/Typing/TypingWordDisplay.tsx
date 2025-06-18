import React, { type JSX } from "react";

import type { ITypingWordDisplayProps } from "../../types/TypingTypes.ts";
import styles from "../../styles/TypingWordDisplay.module.css";


const TypingWordDisplay: React.FC<ITypingWordDisplayProps> = ({
  previousWord,
  currentWord,
  nextWord,
  }: ITypingWordDisplayProps): JSX.Element => {
  return (
    <div className={styles.wordDisplayContainer}>
      <span className={styles.prevWord}>{previousWord}</span>
      <span className={styles.currentWord}>{currentWord}</span>
      <span className={styles.nextWord}>{nextWord}</span>
    </div>
  );
};

export default TypingWordDisplay;
