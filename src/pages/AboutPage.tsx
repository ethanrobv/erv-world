import React, { type JSX } from "react";

import { ContentWindow, Footer, Navbar } from "../components";
import styles from "../styles/AboutPage.module.css";


const AboutPage: React.FC = (): JSX.Element => {
  return (
    <div className={styles.aboutPageContainer}>
      <Navbar />
      <ContentWindow>
        <div className={styles.bodyText}>
          <a href={"https://github.com/ethanrobv/erv-world"} target={"_blank"}>source code</a>
        </div>
      </ContentWindow>
      <Footer />
    </div>
  );
}

export default AboutPage;
