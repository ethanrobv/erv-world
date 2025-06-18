import React, { type JSX, useState } from "react";

import type { IMusicInstrumentDropdownButton } from "../../types/MusicTypes.ts";
import styles from "../../styles/MusicKeyRowController.module.css";


const MusicKeyRowControl: React.FC = (): JSX.Element => {
  const instrumentMap = {
    BassDrum:
  };
  const [instrument, setInstrument] = useState<
  return (
    <div className={styles.musicKeyRowController}>

    </div>
  );
};

export default MusicKeyRowControl;
