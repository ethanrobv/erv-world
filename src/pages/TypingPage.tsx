import React, { type JSX } from "react";

import { ContentWindow, Footer, Navbar, TypingTest } from "../components";
import styles from "../styles/TypingPage.module.css";


const TypingPage: React.FC = (): JSX.Element => {

  return (
    <div className={styles.typingPageContainer}>
      <Navbar />
      <ContentWindow>
        <TypingTest />
      </ContentWindow>
      <Footer />
    </div>
  );
};

export default TypingPage;
