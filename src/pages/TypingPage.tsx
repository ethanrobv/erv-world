import React, { type JSX } from "react";

import { ContentWindow, Footer, Navbar, TypingApp } from "../components";
import styles from "../styles/TypingPage.module.css";


const TypingPage: React.FC = (): JSX.Element => {

  return (
    <div className={styles.typingPageContainer}>
      <Navbar />
      <ContentWindow>
        <TypingApp />
      </ContentWindow>
      <Footer />
    </div>
  );
};

export default TypingPage;
