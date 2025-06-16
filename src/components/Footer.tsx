import React, { type JSX } from "react";

import styles from "../styles/Footer.module.css";


const Footer: React.FC = (): JSX.Element => {
  return(
    <div className={styles.footerContainer}>
      <footer>
        <p>&copy; {new Date().getFullYear()} - Authored by Ethan Vincent</p>
      </footer>
    </div>
  );
}

export default Footer;
