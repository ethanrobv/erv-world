import React, { type JSX } from "react";

import type { IContentWindowProps } from "../../types/ContentWindowTypes.ts";
import styles from "../../styles/ContentWindow.module.css";


const ContentWindow: React.FC<IContentWindowProps> = ({
    children,
    className,
  }: IContentWindowProps): JSX.Element => {

  return (
    <div className={`${styles.contentWindow} ${className} || ""`}>
      {children}
    </div>
  );
};

export default ContentWindow;
