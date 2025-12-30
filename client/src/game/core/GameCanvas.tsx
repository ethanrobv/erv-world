import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import React, { Suspense } from 'react';
import { Perf } from 'r3f-perf';

interface GameCanvasProps {
    children: React.ReactNode;
}

/**
 * The "Stage" of the application.
 * Wraps all 3D content, initializing WebGL and Physics.
 */
export const GameCanvas = ({ children }: GameCanvasProps) => {
    // Check environment for debug flag
    const isDebug = import.meta.env.VITE_PHYSICS_DEBUG === 'true';

    return (
        <div className="h-full w-full bg-black">
            <Canvas
                shadows
                dpr={ [1, 2] }
                camera={ { position: [0, 5, 10], fov: 50 } }
                performance={ { min: 0.5 } }
            >
                {/* Debug HUD */ }
                { isDebug && <Perf position="top-left"/> }

                <Suspense fallback={ null }>
                    <Physics
                        gravity={ [0, -9.81, 0] }
                        debug={ isDebug }
                        paused={ false }
                        timeStep="vary"
                    >
                        {/* GLOBAL LIGHTING */ }
                        <ambientLight intensity={ 0.5 }/>
                        <directionalLight
                            position={ [10, 10, 5] }
                            intensity={ 1 }
                            castShadow
                            shadow-mapSize={ [1024, 1024] }
                        />

                        {/* GAME CONTENT INJECTED HERE */ }
                        { children }

                    </Physics>
                </Suspense>
            </Canvas>
        </div>
    );
};
