import React from "react";

export interface ICommonButtonProps {
  id: string;
  label: string;
  isDisabled?: boolean;
  className?: string;
}

export interface IDropdownItem {
  id: string;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
