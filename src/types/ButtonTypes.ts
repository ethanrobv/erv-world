import React from "react";

interface ICommonNavButtonProps {
  id: string;
  label: string;
  isDisabled?: boolean;
  className?: string;
}

export interface INavButton extends ICommonNavButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type: "base";
}

export interface IDropdownItem {
  id: string;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface IDropdownNavButton extends ICommonNavButtonProps {
  type: "dropdown";
  items: IDropdownItem[];
  isOpen?: boolean,
  onToggleDropdown?: () => void;
}

export type NavButtonType = INavButton | IDropdownNavButton;
