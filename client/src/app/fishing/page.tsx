'use client';

import dynamic from 'next/dynamic';
import { useGameStore } from '@/lib/stores/useGameStore';

// Dynamic import with SSR disabled for the Phaser Game Engine.
// We provide a loading state to handle the asynchronous bundle load.
const GameCanvas = dynamic(
    () => import('@/components/widgets/fishing/GameCanvas'),
    {
        ssr: false,
        loading: () => (
            <div className="absolute inset-0 bg-black text-blue-500 font-mono flex items-center justify-center">
                INITIALIZING ENGINE...
            </div>
        )
    }
);

// Dynamic import for the HUD Layout to ensure client-side rendering conventions.
const HudLayout = dynamic(
    () => import('@/components/widgets/fishing/hud/HudLayout'),
    { ssr: false }
);

export default function FishingPage() {
    // Subscribe to the store to track if the lobby phase is complete.
    const hasGameStarted = useGameStore(s => s.hasGameStarted);

    return (
        <main className="relative w-full h-screen bg-black overflow-hidden select-none">
            {/* The HUD Layout contains the ConnectionModal (Main Menu).
               It is always rendered so the user can interact with the Lobby.
            */ }
            <HudLayout/>

            {/* The Game Engine is NOT mounted until the user clicks Start/Join */ }
            { hasGameStarted && (
                <div className="absolute inset-0 z-0">
                    <GameCanvas/>
                </div>
            ) }

            {/* Background Texture for Main Menu (only visible during the Lobby phase) */ }
            { !hasGameStarted && (
                <div
                    className="absolute inset-0 z-[-1] opacity-20 pointer-events-none"
                    style={ {
                        backgroundImage: 'radial-gradient(circle at center, #1e3a8a 0%, #000000 70%)'
                    } }
                />
            ) }
        </main>
    );
}
