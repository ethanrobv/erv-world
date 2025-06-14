import React from "react";
import type { ContentWindowProps } from "../types/ContentWindowTypes.ts";
import styles from "../styles/ContentWindow.module.css";


const ContentWindow: React.FC<ContentWindowProps> = ({
    children,
    className,
  }) => {

  return (
    <div className={`${styles.contentWindow} ${className} || ""`}>
      {children}
    </div>
  );
};

export default ContentWindow;
