import React, { type JSX, useEffect, useState } from "react";

import MusicKey from "./MusicKey.tsx";
import type { IMusicGridProps, IMusicKeyData,  } from "../../types/MusicTypes.ts";
import styles from "../../styles/MusicKeyGrid.module.css";


const MusicKeyGrid: React.FC<IMusicGridProps> = ({
    numCols,
    numRows,
  }: IMusicGridProps): JSX.Element => {
  const [musicKeys, setMusicKeys] = useState<IMusicKeyData[]>([]);

  useEffect((): void => {
    const setUpKeys: () => void = (): void => {
      const keys: IMusicKeyData[] = [];
      for (let i: number = 0; i < numRows; i++) {
        for (let j: number = 0; j < numCols; j++) {
          keys.push({
            active: false,
            rowIndex: i,
            colIndex: j,
            type: i,
          })
        }
      }
      setMusicKeys(keys);
    };

    setUpKeys();
  }, [numCols, numRows]);

  const frValue: () => number = (): number => {
    // we get 4/5 fr of the parent grid
    switch (numCols) {
      case 32:
        return 0.048;
      case 16: default:
        return 0.096;
    }
  };

  const handleToggleKey: (rowIndex: number, colindex: number) => void = (rowIndex: number, colIndex: number): void => {
    setMusicKeys(((prevKeys: IMusicKeyData[]): IMusicKeyData[] => {
      return prevKeys.map((key: IMusicKeyData): IMusicKeyData => {
        if (key.rowIndex == rowIndex && key.colIndex == colIndex) {
          return { ...key, active: !key.active };
        }
        return key;
      });
    }));
  };

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${numCols}, minmax(1rem, ${frValue()}fr))`,
  };

  return (
    <div className={styles.musicKeyGrid} style={gridStyle}>
      {musicKeys.map((key: IMusicKeyData): JSX.Element => {
        return (
          <MusicKey
            onToggle={handleToggleKey}
            {...key}
          />
        );
      })}
    </div>
  );
}

export default MusicKeyGrid;
