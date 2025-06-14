import React from "react";

import Navbar from "../components/Navbar.tsx";
import ContentWindow from "../components/ContentWindow.tsx";
import styles from "../styles/HomePage.module.css";


const HomePage: React.FC = () => {
  return (
    <div className={styles.homePageContainer}>
      <Navbar />
      <ContentWindow>
        Testing
      </ContentWindow>
    </div>
  );
}

export default HomePage;
