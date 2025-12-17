import { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Pixelation } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useThemeColor } from '../hooks/useThemeColor';

import {
    type GameState,
    type SceneType,
    type PortalDef,
    SCENE_DATA,
    FADE_IN_DURATION,
    FADE_OUT_DURATION
} from './game/GameConfig';
import { BarLevel, AlleyLevel } from './game/GameLevels';
import { Player } from './game/Player';
import { MainMenu, TransitionOverlay, InteractionPrompt } from './game/GameUI';

export default function Game() {
    const [gameState, setGameState] = useState<GameState>('menu');
    const [currentScene, setCurrentScene] = useState<SceneType>('bar');
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isInputLocked, setIsInputLocked] = useState(false);
    const [playerSpawn, setPlayerSpawn] = useState<{ pos: [number, number, number], rot: number }>({
        pos: [0, 0, 0],
        rot: 0
    });
    const [interactionLabel, setInteractionLabel] = useState<string | null>(null);

    const playerRef = useRef<THREE.Group>(null);

    const handlePortalEnter = useCallback((portal: PortalDef) => {
        if (isTransitioning) return;

        setIsTransitioning(true);
        setIsInputLocked(true);
        setInteractionLabel(null); // Clear UI on exit

        setTimeout(() => {
            setCurrentScene(portal.targetScene);
            setPlayerSpawn({ pos: portal.spawnPosition, rot: portal.spawnRotation });
            setTimeout(() => setIsTransitioning(false), 100);

            setTimeout(() => {
                setIsInputLocked(false);
            }, FADE_IN_DURATION);

        }, FADE_OUT_DURATION);
    }, [isTransitioning]);

    const barriers = SCENE_DATA[currentScene].barriers;
    const portals = SCENE_DATA[currentScene].portals;
    const interactables = SCENE_DATA[currentScene].interactables || [];
    const isDoorOpen = isTransitioning;

    return (
        <div style={ { width: '100%', height: '100%', position: 'relative', overflow: 'hidden' } }>
            <TransitionOverlay isActive={ isTransitioning }/>

            {/* NEW: Interaction UI */ }
            <InteractionPrompt label={ interactionLabel }/>

            { gameState === 'menu' && <MainMenu onStart={ () => setGameState('playing') }/> }

            <Canvas shadows dpr={ [1, 2] }>
                <color attach='background' args={ [useThemeColor('--bg-page')] }/>
                <PerspectiveCamera makeDefault position={ [0, 12, 16] } fov={ 40 } near={ 0.1 } far={ 200 }
                                   onUpdate={ c => c.lookAt(0, 0, 0) }/>

                <ambientLight intensity={ 0.4 }/>
                <hemisphereLight intensity={ 0.3 } groundColor='#444'/>
                <directionalLight position={ [10, 20, 10] } intensity={ 1.2 } castShadow shadow-mapSize={ [1024, 1024] }
                                  shadow-bias={ -0.0001 }>
                    <orthographicCamera attach='shadow-camera' args={ [-20, 20, 20, -20] }/>
                </directionalLight>
                <pointLight position={ [-10, 5, -5] } intensity={ 0.5 } color='#ccccff'/>

                { currentScene === 'bar' ?
                    <BarLevel isDoorOpen={ isDoorOpen } playerRef={ playerRef }/> :
                    <AlleyLevel isDoorOpen={ isDoorOpen }/> }

                <Player
                    key={ currentScene }
                    playerRef={ playerRef }
                    isPlaying={ gameState === 'playing' }
                    inputLocked={ isInputLocked }
                    initialPos={ playerSpawn.pos }
                    initialRot={ playerSpawn.rot }
                    barriers={ barriers }
                    portals={ portals }
                    interactables={ interactables }
                    onPortalEnter={ handlePortalEnter }
                    // NEW: Pass setter
                    onInteractChange={ setInteractionLabel }
                />

                <EffectComposer enableNormalPass={ false }>
                    <Pixelation granularity={ 1 }/>
                    <Bloom luminanceThreshold={ 1 } mipmapBlur intensity={ 1.2 } radius={ 0.5 }/>
                </EffectComposer>
            </Canvas>
        </div>
    );
}
