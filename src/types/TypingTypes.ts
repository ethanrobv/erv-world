import React from "react";


export interface ITypingInputProps {
  className?: string;
  onChange: (value: string) => void;
  onSpaceBar: () => boolean;
  textInputRef?: React.Ref<HTMLDivElement>;
  value: string;
}

export interface ITypingWordDisplayProps {
  previousWord: string;
  currentWord: string;
  nextWord: string;
}
