import React, { type JSX, useEffect } from "react";
import * as Tone from "tone";

import MusicKeyGrid from "./MusicKeyGrid";
import styles from "../../styles/MusicGrid.module.css";


const MusicApp: React.FC = (): JSX.Element => {
  useEffect(() => {
    const startAudioContext = () => {
      if (Tone.)
    }
  })
  return (
    <div className={styles.musicGrid}>
      <div>
        placeholder
      </div>
      <MusicKeyGrid
        numCols={32}
        numRows={4}
      />
    </div>
  );
};

export default MusicApp;
