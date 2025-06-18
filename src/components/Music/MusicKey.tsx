import React, { type JSX } from "react";

import type { IMusicKeyProps } from "../../types/MusicTypes.ts";
import styles from "../../styles/MusicKey.module.css";


const MusicKey: React.FC<IMusicKeyProps> = ({
    rowIndex,
    colIndex,
    active,
    onToggle,
  }: IMusicKeyProps): JSX.Element => {

  const handleOnClick: () => void = (): void => {
    onToggle(rowIndex, colIndex);
  };

  const classNames: string[] = [styles.musicKeyButton];
  if (active) {
    classNames.push(styles.active);
  }
  const className: string = classNames.join(" ");

  return (
    <div className={styles.musicKeyContainer}>
      <button
        className={className}
        onClick={handleOnClick}
      />
    </div>
  );
}

export default MusicKey;
