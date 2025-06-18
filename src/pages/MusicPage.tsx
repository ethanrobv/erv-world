import React, { type JSX } from "react";

import { ContentWindow, Footer, MusicApp, Navbar } from "../components";


const MusicPage: React.FC = (): JSX.Element => {
  return (
    <div>
      <Navbar />
      <ContentWindow>
        <MusicApp />
      </ContentWindow>
      <Footer />
    </div>
  );
}

export default MusicPage;
