import React, { type JSX, useState, useEffect, useMemo } from "react";

import { ContentWindow } from "../";
import MusicKeyGrid from "./MusicKeyGrid";
import MusicKeyRowControl from "./MusicKeyRowControl";
import { useDrumMachine } from "../../hooks/useDrumMachine";
import type { IMusicKeyData } from "../../types/MusicTypes";
import styles from "../../styles/MusicGrid.module.css";


const MusicApp: React.FC = (): JSX.Element => {
  const numCols = 32;
  const numRows = 3;

  const [musicKeys, setMusicKeys] = useState<IMusicKeyData[]>([]);
  const [currentCol, setCurrentCol] = useState<number>(-1);
  const [rowInstruments, setRowInstruments] = useState<string[]>([]);

  useEffect((): void => {
    const initialInstruments: string[] = ["kick", "snare", "piano"];
    setRowInstruments(initialInstruments.slice(0, numRows));

    const keys: IMusicKeyData[] = [];
    for (let i = 0; i < numRows; i++) {
      for (let j = 0; j < numCols; j++) {
        keys.push({ active: false, rowIndex: i, colIndex: j, type: i });
      }
    }
    setMusicKeys(keys);
  }, [numRows, numCols]);

  const handleToggleKey: (rowIndex: number, colIndex:number) => void = (rowIndex: number, colIndex: number): void => {
    setMusicKeys((prev: IMusicKeyData[]): IMusicKeyData[] =>
      prev.map((key: IMusicKeyData): IMusicKeyData =>
        key.rowIndex === rowIndex && key.colIndex === colIndex ?
          { ...key, active: !key.active } :
          key
      )
    );
  };

  const handleInstrumentChange: (rowIndex: number, instrument: string) => void = (rowIndex: number, instrument: string): void => {
    setRowInstruments((prev: string[]): string[] =>
      prev.map((inst: string, index: number): string => (index === rowIndex ? instrument : inst))
    );
  };

  const notesForPlayer: string[][] = useMemo((): string[][] => {
    const notes: string[][] = Array(numCols).fill(0).map((): never[] => []);
    for (const key of musicKeys) {
      if (key.active) {
        const instrument = rowInstruments[key.rowIndex];
        if (instrument) {
          notes[key.colIndex].push(instrument);
        }
      }
    }
    return notes;
  }, [musicKeys, rowInstruments, numCols]);

  const { isPlaying, togglePlayback, isLoaded } = useDrumMachine({
    notes: notesForPlayer,
    onStepChange: setCurrentCol,
  });

  return (
    <>
      <div className={styles.musicGrid}>
        <div className={styles.controllerContainer}>
          {rowInstruments.map((instrument: string, rowIndex: number): JSX.Element => (
            <MusicKeyRowControl
              key={rowIndex}
              rowIndex={rowIndex}
              selectedInstrument={instrument}
              onInstrumentChange={handleInstrumentChange}
            />
          ))}
        </div>

        <MusicKeyGrid
          numCols={numCols}
          musicKeys={musicKeys}
          currentCol={currentCol}
          handleToggleKey={handleToggleKey}
        />
      </div>
    <ContentWindow className={styles.innerContentWindow}>
      <button
        className={styles.playStopButton}
        onClick={togglePlayback}
        disabled={!isLoaded}
      >
        {isLoaded ? (isPlaying ? "⏹" : "⏵") : "loading..."}
      </button>
    </ContentWindow>
    </>
  );
};

export default MusicApp;
