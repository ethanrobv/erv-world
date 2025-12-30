import { useRef, useState, useEffect } from 'react';
import type { RapierRigidBody } from '@react-three/rapier';
import { useTheme } from '../context/ThemeContext';
import { GameCanvas } from '../game/core/GameCanvas';
import { Level } from '../game/levels/Level';
import { Player } from '../game/entities/Player';
import { CameraRig } from '../game/core/CameraRig';
import { MainMenu } from './MainMenu';
import { PlayerManager } from '../game/core/PlayerManager';
import { NetworkSync } from '../game/core/NetworkSync';

/**
 * Container component for the game widget.
 * Manages the "Game State" vs "UI State" transition via Pointer Lock events.
 */
const World = () => {
    const { time, weather } = useTheme();

    // --- SHARED REFS ---
    const playerRef = useRef<RapierRigidBody>(null);
    const cameraRotationRef = useRef<number>(0);
    const canvasRef = useRef<HTMLDivElement>(null);

    // --- UI STATE ---
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    /**
     * POINTER LOCK MANAGER
     */
    useEffect(() => {
        const handleLockChange = () => {
            if (document.pointerLockElement) {
                setIsMenuOpen(false);
            } else {
                setIsMenuOpen(true);
            }
        };

        document.addEventListener('pointerlockchange', handleLockChange);
        return () => {
            document.removeEventListener('pointerlockchange', handleLockChange);
        };
    }, []);

    const handleResume = () => {
        const canvas = document.querySelector('canvas');
        canvas?.requestPointerLock();
    };

    return (
        <div className='w-full h-full flex flex-col items-center justify-center'>
            <div
                ref={ canvasRef }
                // [UPDATED] Increased size: h-[85vh] takes up most of the screen, w-full fills the container.
                className='relative w-full h-[85vh] border-4 border-accent rounded-xl bg-panel shadow-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-500'
            >
                {/* 1. GAME LAYER */ }
                <div className="absolute inset-0 z-0">
                    <GameCanvas>
                        {/* SYSTEM: INTERPOLATION TICK */ }
                        <NetworkSync/>

                        {/* ENVIRONMENT */ }
                        <Level/>

                        {/* ENTITIES */ }
                        <Player
                            physicsRef={ playerRef }
                            cameraRotationRef={ cameraRotationRef }
                        />

                        {/* RENDER REMOTE PLAYERS */ }
                        <PlayerManager/>

                        {/* SYSTEMS */ }
                        <CameraRig
                            targetRef={ playerRef }
                            rotationRef={ cameraRotationRef }
                        />
                    </GameCanvas>
                </div>

                {/* 2. MENU OVERLAY */ }
                { isMenuOpen && (
                    <MainMenu onResume={ handleResume }/>
                ) }

                {/* 3. HUD LAYER */ }
                { !isMenuOpen && (
                    <div
                        className="absolute top-0 w-full p-4 pointer-events-none flex justify-between items-start z-10">
                        <div>
                            <h1 className='text-2xl font-black text-primary tracking-widest uppercase opacity-80 drop-shadow-md'>
                                ERV World
                            </h1>
                        </div>

                        <div className='flex flex-col gap-2 items-end'>
                            <div className='flex gap-2 text-muted font-mono text-xs'>
                                <span className='px-2 py-1 bg-black/40 backdrop-blur-md rounded border border-white/10'>
                                    { time }
                                </span>
                                <span className='px-2 py-1 bg-black/40 backdrop-blur-md rounded border border-white/10'>
                                    { weather }
                                </span>
                            </div>
                            <div className='text-xs text-accent font-bold opacity-50'>
                                Press ESC for Menu
                            </div>
                        </div>
                    </div>
                ) }
            </div>
        </div>
    );
};

export default World;
