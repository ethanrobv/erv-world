'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/stores/useGameStore';
import PlayerList from './PlayerList';
import SolarSystemMap from './Minimap';
import ConnectionModal from './ConnectionModal';
import DraggableWidget from './DraggableWidget';
import SessionInfo from "@/components/widgets/fishing/hud/SessionInfo";

/**
 * Main HUD container.
 * Manages the floating windows for the game UI.
 * Handles the visibility state between the Main Menu (ConnectionModal) and the Game HUD.
 */
export default function HudLayout() {
    const hasGameStarted = useGameStore(s => s.hasGameStarted);
    const [mounted, setMounted] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });

    useEffect(() => {
        setMounted(true);
        // Initialize with actual window size
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight
        });

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!mounted) return null;

    return (
        <>
            {/* Main Menu / Lobby Modal */ }
            {/* It handles its own internal logic to hide once the game starts */ }
            <ConnectionModal/>

            {/* In-Game HUD Layer */ }
            {/* Only visible once the player has initialized the session */ }
            { hasGameStarted && (
                <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden">

                    {/* Widget 1: Crew List (Top Left) */ }
                    <DraggableWidget title="Crew" defaultPosition={ { x: 50, y: 50 } }>
                        <PlayerList/>
                    </DraggableWidget>

                    {/* Widget 2: Navigation (Bottom Right) */ }
                    <DraggableWidget
                        title="Nav Map"
                        defaultPosition={ { x: dimensions.width - 320, y: dimensions.height - 400 } }
                    >
                        <SolarSystemMap/>
                    </DraggableWidget>

                    {/* Widget 3: Status (Bottom Left) */ }
                    <DraggableWidget
                        title="Uplink"
                        defaultPosition={ { x: 50, y: dimensions.height - 250 } }
                    >
                        <div className="space-y-3 min-w-[200px]">
                            <SessionInfo/>

                            <div className="border-t border-gray-700 pt-2 space-y-1">
                                <div className="text-[10px] text-gray-500 font-mono pt-1 text-center">
                                    [WASD] MOVE • [SPACE] FISH
                                </div>
                            </div>
                        </div>
                    </DraggableWidget>
                </div>
            ) }
        </>
    );
}
