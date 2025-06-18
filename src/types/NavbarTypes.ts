import React from "react";

import type { ICommonButtonProps, IDropdownItem } from "./CommonTypes.ts";


export interface INavButton extends ICommonButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type: "base";
}

export interface IDropdownNavButton extends ICommonButtonProps {
  type: "dropdown";
  items: IDropdownItem[];
  isOpen?: boolean,
  onToggleDropdown?: () => void;
}

export type NavButtonType = INavButton | IDropdownNavButton;
