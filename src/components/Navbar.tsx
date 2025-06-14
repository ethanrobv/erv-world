import React from "react";
import { useNavigate } from "react-router-dom";

import NavButton from "./NavbarButton.tsx";
import DropdownNavButton from "./DropdownNavButton.tsx";
import type { NavButtonType } from "../types/ButtonTypes.ts";
import styles from "../styles/Navbar.module.css";


export const Navbar: React.FC = () => {
  const navigate = useNavigate();

  const routeMap = {
    // base
    Home: "/",
    About: "/about",

    // misc
    Typing: "/misc/typing",
    Music: "/misc/music",
  } as const;

  const handleNavButtonOrDropdownClick = (routeString: keyof typeof routeMap) => {
    const route = routeMap[routeString];
    if (route) {
      navigate(route);
    }
  };

  const navButtons: NavButtonType[] = [
    {
      id: "home-nav-button",
      label: "Home",
      onClick: () => handleNavButtonOrDropdownClick("Home"),
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
          onClick: () => handleNavButtonOrDropdownClick("Music"),
        },
        {
          id: "misc-nav-button-dropdown-typing",
          label: "Typing",
          onClick: () => handleNavButtonOrDropdownClick("Typing"),
        },
      ],
    },
    {
      id: "about-nav-button",
      label: "About",
      onClick: () => handleNavButtonOrDropdownClick("About"),
      type: "base",
    },
  ];

  return (
    <nav className={styles.navBar}>
      {navButtons.map((btn) => {
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
