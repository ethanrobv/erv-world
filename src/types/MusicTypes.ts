import type { ICommonButtonProps, IDropdownItem } from "./CommonTypes.ts";
import React from "react";


export interface IMusicKeyData {
  rowIndex: number;
  colIndex: number;
  type: number;
  active: boolean;
}

export interface IMusicKeyProps extends IMusicKeyData {
  onToggle: (rowIndex: number, colIndex: number) => void;
}

export interface IMusicGridProps {
  numCols: number;
  musicKeys: IMusicKeyData[];
  currentCol: number;
  handleToggleKey: (rowIndex: number, colIndex: number) => void;
}

export interface IMusicDropdownItem extends IDropdownItem {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface IDropdownMusicInstrumentButtonProps extends ICommonButtonProps {
  rowIndex: number;
  items: IMusicDropdownItem[];
  isOpen?: boolean,
  onToggleDropdown?: () => void;
}

export interface IMusicKeyRowControlProps {
  rowIndex: number;
  selectedInstrument: string,
  onInstrumentChange: (rowNumber: number, selectedInstrument: string) => void;
}
