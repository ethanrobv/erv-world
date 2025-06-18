import React, {type JSX, type RefObject, useEffect, useRef, useState} from "react";

import type { IDropdownMusicInstrumentButtonProps, IMusicDropdownItem } from "../../types/MusicTypes.ts";
import styles from "../../styles/MusicKeyRowController.module.css";


const DropdownMusicInstrumentButton: React.FC<IDropdownMusicInstrumentButtonProps> = ({
    id,
    label,
    isDisabled,
    className,
    items,
    isOpen: initialIsOpen = false,
    onToggleDropdown,
  }: IDropdownMusicInstrumentButtonProps): JSX.Element => {
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
        className={`${styles.instrumentButton} ${styles.dropdownToggle}`}
        ref={buttonRef}
      >
        {label} <span className={styles.arrow}>{currentIsOpen ? '▼' : '▽'}</span>
      </button>
      {currentIsOpen && (
        <ul
          className={styles.instrumentDropdownMenu}
          ref={dropdownMenuRef}
        >
          {items.map((item: IMusicDropdownItem): JSX.Element => (
            <li key={item.id}>
              <button
                onClick={item.onClick}
                className={styles.instrumentDropdownItem}
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

export default DropdownMusicInstrumentButton;
