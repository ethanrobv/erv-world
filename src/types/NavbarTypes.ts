import React from "react";

import type { ICommonButtonProps, IDropdownItem } from "./CommonTypes.ts";


export interface INavButtonProps extends ICommonButtonProps {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type: "base";
}

export interface NavDropdownItem extends IDropdownItem {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface IDropdownNavButtonProps extends ICommonButtonProps {
  type: "dropdown";
  items: NavDropdownItem[];
  isOpen?: boolean,
  onToggleDropdown?: () => void;
}

export type NavButtonType = INavButtonProps | IDropdownNavButtonProps;
