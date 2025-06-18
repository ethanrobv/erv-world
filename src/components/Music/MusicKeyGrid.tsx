import React, { type JSX } from "react";
import MusicKey from "./MusicKey.tsx";
import type { IMusicKeyData, IMusicGridProps } from "../../types/MusicTypes.ts";
import styles from "../../styles/MusicKeyGrid.module.css";


const MusicKeyGrid: React.FC<IMusicGridProps> = ({
     numCols,
     musicKeys,
     currentCol,
     handleToggleKey,
   }: IMusicGridProps): JSX.Element => {
  const frValue: () => number = (): number => {
    switch (numCols) {
      case 32:
        return 0.048;
      case 16:
      default:
        return 0.096;
    }
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${numCols}, minmax(1rem, ${frValue()}fr))`,
  };

  return (
    <div className={styles.musicKeyGrid} style={gridStyle}>
      {musicKeys.map((key: IMusicKeyData): JSX.Element => {
        const isPlaying: boolean = key.colIndex === currentCol;
        const wrapperClassName: string = isPlaying ? styles.playingColumn : "";
        return (
          <div key={`${key.rowIndex}-${key.colIndex}`} className={wrapperClassName}>
            <MusicKey
              active={key.active}
              type={key.rowIndex}
              rowIndex={key.rowIndex}
              colIndex={key.colIndex}
              onToggle={handleToggleKey}
            />
          </div>
        );
      })}
    </div>
  );
};

export default MusicKeyGrid;
