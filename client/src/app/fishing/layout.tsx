import React from "react";

export default function FishingLayout({
                                          children,
                                      }: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative w-screen h-screen overflow-hidden bg-black">
            { children }
        </div>
    );
}
