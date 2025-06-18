import { type JSX } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import AboutPage from "./pages/AboutPage.tsx";
import HomePage from "./pages/HomePage.tsx";
import MusicPage from "./pages/MusicPage.tsx";
import TypingPage from "./pages/TypingPage.tsx";


function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={"/"} element={<HomePage />} />
        <Route path={"/about"} element={<AboutPage />} />
        <Route path={"/misc/typing"} element={<TypingPage />} />
        <Route path={"/misc/music"} element={<MusicPage />} />
        <Route path={"*"} element={<span>501: not yet implemented</span>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
