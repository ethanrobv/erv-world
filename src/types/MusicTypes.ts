import type { ICommonButtonProps, IDropdownItem } from "./CommonTypes.ts";


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
  numRows: number;
  numCols: number;
}

export interface IMusicInstrumentDropdownButton extends ICommonButtonProps {
  items: IDropdownItem[];
  isOpen?: boolean,
  onToggleDropdown?: () => void;
  placeholder: string;
}
