import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage.tsx";
import AboutPage from "./pages/AboutPage.tsx";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={"/"} element={<HomePage />} />
        <Route path={"/about"} element={<AboutPage />} />
        <Route path={"*"} element={<span>501: not yet implemented</span>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
