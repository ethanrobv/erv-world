import React, {type JSX, type RefObject, useCallback, useRef, useState} from "react";

import type { ITypingInputProps } from "../../types/TypingTypes.ts";
import styles from "../../styles/TypingInput.module.css";


const TypingInput: React.FC<ITypingInputProps> = ({
    className,
    onChange,
    onSpaceBar,
    textInputRef: textInputRef,
  }: ITypingInputProps): JSX.Element => {
  const internalDivRef: RefObject<HTMLDivElement | null> = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  const setRefs: (node: HTMLDivElement | null) => void = useCallback(
    (node: HTMLDivElement | null): void => {
      internalDivRef.current = node;
      if (typeof textInputRef === "function") {
        textInputRef(node);
      } else if (textInputRef) {
        textInputRef.current = node;
      }
    },
    [textInputRef]
  );

  const handleInputChange: (event: React.ChangeEvent<HTMLDivElement>) => void = (event: React.ChangeEvent<HTMLDivElement>): void => {
    const newValue: string = event.target.textContent || "";
    onChange(newValue);
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 120);
  };

  const handleKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void = (event: React.KeyboardEvent<HTMLDivElement>): void => {
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
        className={`${styles.textInputField} ${className || ""} ${isTyping ? styles.typingEffect : ""}`}
        spellCheck={false}
        autoCapitalize={"off"}
        autoCorrect={"off"}
        ref={setRefs}
      />
    </div>
  );
};

export default TypingInput;
