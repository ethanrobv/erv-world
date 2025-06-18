import React, { type JSX } from "react";

import type { INavButtonProps } from "../../types/NavbarTypes.ts";
import styles from "../../styles/NavButtons.module.css"


const NavButton: React.FC<INavButtonProps> = ({
    id,
    label,
    onClick,
    isDisabled,
    className
  }: INavButtonProps): JSX.Element => {
  return (
    <button
      id={id}
      onClick={onClick}
      disabled={isDisabled}
      className={`${styles.navButton} ${className || ""}`}
    >
      {label}
    </button>
  )
};

export default NavButton;
