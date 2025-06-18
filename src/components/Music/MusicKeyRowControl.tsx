import React, { type JSX } from "react";

import type { IMusicKeyRowControlProps, IDropdownMusicInstrumentButtonProps } from "../../types/MusicTypes.ts";
import styles from "../../styles/MusicKeyRowController.module.css";
import DropdownMusicInstrumentButton from "./DropdownMusicInstrumentButton.tsx";


const MusicKeyRowControl: React.FC<IMusicKeyRowControlProps> = ({
    rowIndex,
    selectedInstrument,
    onInstrumentChange,
  }: IMusicKeyRowControlProps): JSX.Element => {
  //const instrumentOptions: string[] = ["kick", "snare", "piano"];
  const musicInstrumentDropdown: IDropdownMusicInstrumentButtonProps = {
    id: `row-${rowIndex}-instrument-dropdown`,
    rowIndex: rowIndex,
    label: selectedInstrument,
    items: [
      {
        id: `row-${rowIndex}-instrument-dropdown-item-kick`,
        label: "kick",
        onClick: (): void => handleChangeInstrument("kick")
      },
      {
        id: `row-${rowIndex}-instrument-dropdown-item-snare`,
        label: "snare",
        onClick: (): void => handleChangeInstrument("snare")
      },
      {
        id: `row-${rowIndex}-instrument-dropdown-item-piano`,
        label: "piano",
        onClick: (): void => handleChangeInstrument("piano")
      },
    ]
  }

  const handleChangeInstrument: (instrument: string) => void = (instrument: string): void => {
    onInstrumentChange(rowIndex, instrument);
  }

  return (
    <div className={styles.musicKeyRowController}>
      <DropdownMusicInstrumentButton
        {...musicInstrumentDropdown}
      />
    </div>
  );
};

export default MusicKeyRowControl;
