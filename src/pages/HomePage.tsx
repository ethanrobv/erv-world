import React from "react";

import { ContentWindow, Footer, Navbar } from "../components";
import styles from "../styles/HomePage.module.css";


const HomePage: React.FC = () => {
  // https://patorjk.com/software/taag/#p=display&f=ANSI%20Shadow&t=ERV%20.%20WORLD%0A
  const homePageArt =
`███████╗██████╗ ██╗   ██╗           ██╗    ██╗ ██████╗ ██████╗ ██╗     ██████╗ 
██╔════╝██╔══██╗██║   ██║           ██║    ██║██╔═══██╗██╔══██╗██║     ██╔══██╗
█████╗  ██████╔╝██║   ██║           ██║ █╗ ██║██║   ██║██████╔╝██║     ██║  ██║
██╔══╝  ██╔══██╗╚██╗ ██╔╝           ██║███╗██║██║   ██║██╔══██╗██║     ██║  ██║
███████╗██║  ██║ ╚████╔╝     ██╗    ╚███╔███╔╝╚██████╔╝██║  ██║███████╗██████╔╝
╚══════╝╚═╝  ╚═╝  ╚═══╝      ╚═╝     ╚══╝╚══╝  ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═════╝`;
  return (
    <div className={styles.homePageContainer}>
      <Navbar />
      <ContentWindow>
        <div className={styles.asciiArtDisplay}>{homePageArt}</div>
      </ContentWindow>
      <Footer />
    </div>
  );
}

export default HomePage;
