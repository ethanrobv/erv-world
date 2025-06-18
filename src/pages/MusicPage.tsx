import React, { type JSX } from "react";

import { ContentWindow, Footer, MusicApp, Navbar } from "../components";
import styles from "../styles/MusicPage.module.css"


const MusicPage: React.FC = (): JSX.Element => {
  return (
    <div className={styles.musicPageContainer}>
      <Navbar />
      <ContentWindow>
        <MusicApp />
      </ContentWindow>
      <Footer />
    </div>
  );
}

export default MusicPage;
