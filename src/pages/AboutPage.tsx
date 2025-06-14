import React from "react";

import { ContentWindow, Footer, Navbar } from "../components";
import style from "../styles/AboutPage.module.css";


const AboutPage: React.FC = () => {
  return (
    <div className={style.aboutPageContainer}>
      <Navbar />
      <ContentWindow>

        <div>
          <code><a href={"https://github.com/ethanrobv/erv-world"} target={"_blank"}>source code</a></code>
        </div>
      </ContentWindow>
      <Footer />
    </div>
  );
}

export default AboutPage;
