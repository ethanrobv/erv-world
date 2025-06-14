import React from "react";
import type { INavButton } from "../types/ButtonTypes.ts";
import styles from "../styles/NavButtons.module.css"


const NavButton: React.FC<INavButton> = ({
    id,
    label,
    onClick,
    isDisabled,
    className
  }: INavButton) => {
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
