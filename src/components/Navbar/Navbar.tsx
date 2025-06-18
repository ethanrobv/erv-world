import React, { type JSX } from "react";
import { type NavigateFunction, useNavigate } from "react-router-dom";

import NavButton from "./NavbarButton.tsx";
import DropdownNavButton from "./DropdownNavButton.tsx";
import type { NavButtonType } from "../../types/NavbarTypes.ts";
import styles from "../../styles/Navbar.module.css";


export const Navbar: React.FC = (): JSX.Element => {
  const navigate: NavigateFunction = useNavigate();

  const routeMap = {
    // base
    Home: "/",
    About: "/about",

    // misc
    Typing: "/misc/typing",
    Music: "/misc/music",
  } as const;

  const navButtons: NavButtonType[] = [
    {
      id: "home-nav-button",
      label: "Home",
      onClick: (): void => handleNavButtonOrDropdownClick("Home"),
      type: "base",
    },
    {
      id: "misc-nav-button",
      label: "Misc.",
      type: "dropdown",
      items: [
        {
          id: "misc-nav-button-dropdown-music",
          label: "Music",
          onClick: (): void => handleNavButtonOrDropdownClick("Music"),
        },
        {
          id: "misc-nav-button-dropdown-typing",
          label: "Typing",
          onClick: (): void => handleNavButtonOrDropdownClick("Typing"),
        },
      ],
    },
    {
      id: "about-nav-button",
      label: "About",
      onClick: (): void => handleNavButtonOrDropdownClick("About"),
      type: "base",
    },
  ];

  const handleNavButtonOrDropdownClick: (routeString: keyof typeof routeMap) => void = (routeString: keyof typeof routeMap): void => {
    const route: (
      "/" | "/about" | "/misc/typing" | "/misc/music"
      ) = routeMap[routeString];
    if (route) {
      navigate(route);
    }
  };

  return (
    <nav className={styles.navBar}>
      {navButtons.map((btn: NavButtonType): (JSX.Element | undefined) => {
        if (btn.type === "base") {
          return (
            <NavButton
              key={btn.id}
              {...btn}
            />
          );
        }
        if (btn.type == "dropdown") {
          return (
            <DropdownNavButton
              key={btn.id}
              {...btn}
            />
          );
        }
      })}
    </nav>
  );
};

export default Navbar;
