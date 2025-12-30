import { useRef, useState, useEffect } from 'react';
import type { RapierRigidBody } from '@react-three/rapier';
import { GameCanvas } from '../game/core/GameCanvas';
import { Level } from '../game/levels/Level';
import { Player } from '../game/entities/Player';
import { CameraRig } from '../game/core/CameraRig';
import { MainMenu } from './MainMenu';
import { PlayerManager } from '../game/core/PlayerManager';
import { NetworkSync } from '../game/core/NetworkSync';
import { WorldClock } from '../game/core/WorldClock';
import { ThemeSync } from '../game/core/ThemeSync';
import { GameHUD } from './GameHUD';

export const World = () => {
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
                className='relative w-full h-[80vh] aspect-video border-4 border-accent rounded-xl bg-panel shadow-2xl flex flex-col items-center justify-center overflow-hidden transition-all duration-500'
            >
                {/* 1. GAME LAYER */ }
                <div className="absolute inset-0 z-0">
                    <GameCanvas>
                        {/* GLOBAL STATE SYSTEMS */ }
                        <NetworkSync/>
                        <WorldClock/>
                        <ThemeSync/>

                        {/* ENVIRONMENT */ }
                        <Level/>

                        {/* ENTITIES */ }
                        <Player
                            physicsRef={ playerRef }
                            cameraRotationRef={ cameraRotationRef }
                        />

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
                { !isMenuOpen && <GameHUD/> }
            </div>
        </div>
    );
};

export default World;
