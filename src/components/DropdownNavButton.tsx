import React, { type JSX, type RefObject, useEffect, useRef, useState } from "react";

import type { IDropdownItem, IDropdownNavButton } from "../types/ButtonTypes.ts";
import styles from "../styles/NavButtons.module.css";


const DropdownNavButton: React.FC<IDropdownNavButton> = ({
    id,
    label,
    isDisabled,
    className,
    items,
    isOpen: initialIsOpen = false,
    onToggleDropdown,
  }: IDropdownNavButton): JSX.Element => {
  const [internalIsOpen, setInternalIsOpen] = useState(initialIsOpen);

  const handleToggle: () => void = (): void => {
    if (onToggleDropdown) {
      onToggleDropdown();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };

  const currentIsOpen: boolean = onToggleDropdown ? initialIsOpen : internalIsOpen;
  const buttonRef: RefObject<HTMLButtonElement | null> = useRef<HTMLButtonElement>(null);
  const dropdownMenuRef: RefObject<HTMLUListElement | null> = useRef<HTMLUListElement>(null);

  useEffect((): () => void => {
    const handleClickOutside: (event: MouseEvent) => void = (event: MouseEvent): void => {
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

    return (): void => {
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
          {items.map((item: IDropdownItem): JSX.Element => (
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
