import React from "react";

import styles from "../styles/Footer.module.css";


const Footer: React.FC = () => {
  return(
    <div className={styles.footerContainer}>
      <footer>
        <p>&copy; {new Date().getFullYear()} - Authored by Ethan Vincent</p>
      </footer>
    </div>
  );
}

export default Footer;
