import React, {useEffect, useRef, useState} from "react";

import type { IDropdownNavButton } from "../types/ButtonTypes.ts";
import styles from "../styles/NavButtons.module.css";


const DropdownNavButton: React.FC<IDropdownNavButton> = ({
    id,
    label,
    isDisabled,
    className,
    items,
    isOpen: initialIsOpen = false,
    onToggleDropdown,
  }: IDropdownNavButton) => {
  const [internalIsOpen, setInternalIsOpen] = useState(initialIsOpen);

  const handleToggle = () => {
    if (onToggleDropdown) {
      onToggleDropdown();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const currentIsOpen = onToggleDropdown ? initialIsOpen : internalIsOpen;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownMenuRef.current &&
          buttonRef.current &&
          !dropdownMenuRef.current.contains(event.target as Node) &&
          !buttonRef.current.contains(event.target as Node)
      ) {
        if (currentIsOpen && onToggleDropdown === undefined) {
          setInternalIsOpen(false);
        } else if (currentIsOpen && onToggleDropdown) {
          onToggleDropdown();
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [currentIsOpen, onToggleDropdown]);

  return (
    <div className={`${styles.dropdownContainer} ${className || ''}`}>
      <button
        id={id}
        onClick={handleToggle}
        disabled={isDisabled}
        className={`${styles.navButton} ${styles.dropdownToggle}`}
        ref={buttonRef}
      >
        {label} <span className={styles.arrow}>{currentIsOpen ? '▼' : '▽'}</span>
      </button>
      {currentIsOpen && (
        <ul
          className={styles.dropdownMenu}
          ref={dropdownMenuRef}
        >
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={item.onClick}
                className={styles.dropdownItem}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DropdownNavButton;
