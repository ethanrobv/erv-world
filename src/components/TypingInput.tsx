import React, { useCallback, useRef, useState } from "react";

import type { ITypingInputProps } from "../types/TypingComponentTypes.ts";
import styles from "../styles/TypingInput.module.css";


const TypingInput: React.FC<ITypingInputProps> = ({
    className,
    onChange,
    onSpaceBar,
    textInputRef: textInputRef,
  }) => {
  const internalDivRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      internalDivRef.current = node;
      if (typeof textInputRef === "function") {
        textInputRef(node);
      } else if (textInputRef) {
        textInputRef.current = node;
      }
    },
    [textInputRef]
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLDivElement>) => {
    const newValue: string = event.target.textContent || "";
    onChange(newValue);
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 120);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
    }
    if (event.key === " ") {
      event.preventDefault();
      const r: boolean = onSpaceBar();
      if (r && internalDivRef.current) {
        internalDivRef.current.textContent = "";
      }
      setIsTyping(false);
    }
  };

  return (
    <div className={styles.centerContainer}>
      <div
        contentEditable="true"
        suppressContentEditableWarning={true}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`${styles.textAreaField} ${className || ""} ${isTyping ? styles.typingEffect : ""}`}
        spellCheck={false}
        autoCapitalize={"off"}
        autoCorrect={"off"}
        ref={setRefs}
      />
    </div>
  );
};

export default TypingInput;
