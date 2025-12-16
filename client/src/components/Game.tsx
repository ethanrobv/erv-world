import { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Text, Grid, RoundedBox } from '@react-three/drei';
import { EffectComposer, Bloom, Pixelation } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useThemeColor } from '../hooks/useThemeColor';

// --- CONFIGURATION ---
const MOVEMENT_SPEED = 6;
const ROTATION_SPEED = 12;

// --- 0. HELPERS ---

// Replaced "OutlinedBox" with "SoftBlock"
// Uses RoundedBox for a "premium retro" toy-like feel that catches light
const SoftBlock = ({
                       args,
                       color,
                       position,
                       rotation,
                       opacity = 1,
                       transparent = false
                   }: {
    args: [number, number, number],
    color: string,
    position?: [number, number, number],
    rotation?: [number, number, number],
    opacity?: number,
    transparent?: boolean
}) => {
    return (
        <RoundedBox
            args={ args }
            radius={ 0.05 } // Subtle rounding
            smoothness={ 4 }
            position={ position }
            rotation={ rotation }
            castShadow
            receiveShadow
        >
            <meshStandardMaterial
                color={ color }
                opacity={ opacity }
                transparent={ transparent }
                roughness={ 0.4 } // Slightly shiny, like plastic
                metalness={ 0.1 }
            />
        </RoundedBox>
    );
};

const SimpleBottle = ({ position, width, height, color }: any) => {
    return (
        <mesh position={ position } castShadow>
            <boxGeometry args={ [width, height, width] }/>
            {/* Bottles are slightly more glossy/glass-like */ }
            <meshStandardMaterial
                color={ color }
                transparent
                opacity={ 0.8 }
                roughness={ 0.2 }
                metalness={ 0.1 }
            />
        </mesh>
    );
};

// --- 1. ASSETS (Visuals) ---

const Floor = () => {
    const floorColor = useThemeColor('--bg-surface');
    const gridColor = useThemeColor('--bg-surface-highlight');

    return (
        <group position={ [0, -0.01, 0] }>
            <mesh rotation={ [-Math.PI / 2, 0, 0] } receiveShadow>
                <planeGeometry args={ [100, 100] }/>
                <meshStandardMaterial color={ floorColor } roughness={ 1 }/>
            </mesh>

            <Grid
                position={ [0, 0.01, 0] }
                args={ [60, 60] }
                cellSize={ 1 }
                cellThickness={ 1 }
                cellColor={ gridColor }
                sectionSize={ 5 }
                sectionThickness={ 1.5 }
                sectionColor={ gridColor }
                fadeDistance={ 40 }
                fadeStrength={ 1.5 }
                infiniteGrid
            />
        </group>
    );
}

const BarCounter = () => {
    const surfaceColor = useThemeColor('--bg-surface-highlight');
    const woodColor = useThemeColor('--border-base');
    const legColor = useThemeColor('--text-muted');

    return (
        <group position={ [0, 0, 2] }>
            {/* Counter Body */ }
            <SoftBlock args={ [14, 1.5, 1] } color={ surfaceColor } position={ [0, 0.75, 0] }/>
            {/* Counter Top */ }
            <SoftBlock args={ [14.5, 0.2, 1.2] } color={ woodColor } position={ [0, 1.5, 0] }/>

            {/* Stools */ }
            { [-4, -1.5, 1.5, 4].map((x, i) => (
                <group key={ i } position={ [x, 0, 1.2] }>
                    <SoftBlock args={ [0.6, 0.15, 0.6] } color={ woodColor } position={ [0, 1.2, 0] }/>
                    <SoftBlock args={ [0.15, 1.2, 0.15] } color={ legColor } position={ [0, 0.6, 0] }/>
                    <SoftBlock args={ [0.4, 0.05, 0.4] } color={ legColor } position={ [0, 0.025, 0] }/>
                </group>
            )) }
        </group>
    );
};

const BackWallDecor = () => {
    const c1 = useThemeColor('--brand-primary');
    const c2 = useThemeColor('--text-main');
    const c3 = useThemeColor('--border-base');
    const wallColor = useThemeColor('--bg-page');
    const shelfColor = useThemeColor('--bg-surface-highlight');

    const palette = [c1, c2, c3];

    const { bottomRow, topRow } = useMemo(() => {
        const generateRow = (count: number, widthSpread: number) => {
            return new Array(count).fill(0).map((_, i) => {
                const step = widthSpread / count;
                const startX = -(widthSpread / 2) + step / 2;
                return {
                    id: Math.random(),
                    x: startX + (i * step),
                    colorIndex: Math.floor(Math.random() * 3),
                    height: 0.3 + Math.random() * 0.4,
                    width: 0.15 + Math.random() * 0.1
                };
            });
        };

        return {
            bottomRow: generateRow(12, 10),
            topRow: generateRow(8, 7)
        };
    }, []);

    return (
        <group position={ [0, 0, -4] }>
            {/* Main Wall */ }
            <SoftBlock args={ [80, 8, 1] } color={ wallColor } position={ [0, 4, -0.6] }/>

            {/* Shelf Area */ }
            <group position={ [-2, 0, 0] }>
                {/* Bottom Shelf */ }
                <SoftBlock args={ [12, 0.1, 0.5] } color={ shelfColor } position={ [0, 2, 0] }/>
                { bottomRow.map((b) => (
                    <SimpleBottle
                        key={ b.id }
                        width={ b.width }
                        height={ b.height }
                        color={ palette[b.colorIndex] || '#fff' }
                        position={ [b.x, 2.05 + b.height / 2, 0] }
                    />
                )) }

                {/* Top Shelf */ }
                <SoftBlock args={ [12, 0.1, 0.5] } color={ shelfColor } position={ [0, 3.5, 0] }/>
                { topRow.map((b) => (
                    <SimpleBottle
                        key={ b.id }
                        width={ b.width }
                        height={ b.height }
                        color={ palette[b.colorIndex] || '#fff' }
                        position={ [b.x, 3.55 + b.height / 2, 0] }
                    />
                )) }
            </group>
        </group>
    );
};

const ShopDoor = () => {
    const doorColor = useThemeColor('--bg-surface');
    const frameColor = useThemeColor('--text-muted');
    const textColor = useThemeColor('--brand-primary');

    return (
        <group position={ [6, 0, -3.9] }>
            <SoftBlock args={ [2.4, 3.4, 0.2] } color={ frameColor } position={ [0, 1.7, 0] }/>
            <SoftBlock args={ [2.0, 3.0, 0.1] } color={ doorColor } position={ [0, 1.6, 0.1] }/>
            <SoftBlock args={ [0.1, 0.4, 0.2] } color={ textColor } position={ [0.8, 1.5, 0.2] }/>

            <group position={ [0, 3.8, 0.2] }>
                <SoftBlock args={ [1.6, 0.6, 0.1] } color={ useThemeColor('--bg-surface-highlight') }/>

                <Text
                    position={ [0, 0, 0.06] }
                    fontSize={ 0.35 }
                    font="https://fonts.gstatic.com/s/roboto/v18/KFOmCnqEu92Fr1Mu4mxM.woff"
                    anchorX="center"
                    anchorY="middle"
                >
                    EXIT
                    <meshStandardMaterial
                        color={ textColor }
                        emissive={ textColor }
                        emissiveIntensity={ 4 }
                        toneMapped={ false }
                    />
                </Text>
            </group>
        </group>
    );
};

// --- 2. PLAYER & LOGIC ---

const Player = ({ isPlaying }: { isPlaying: boolean }) => {
    const groupRef = useRef<THREE.Group>(null);
    const visualsRef = useRef<THREE.Group>(null);
    const keys = useRef<{ [key: string]: boolean }>({});
    const targetRotation = useRef(0);

    const primaryColor = useThemeColor('--brand-primary');
    const shirtColor = useThemeColor('--bg-surface-highlight');
    const headColor = useThemeColor('--border-base');

    useEffect(() => {
        const handleDown = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = true;
        const handleUp = (e: KeyboardEvent) => keys.current[e.key.toLowerCase()] = false;
        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        return () => {
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
        };
    }, []);

    const checkCollision = (newX: number, newZ: number) => {
        const hitBar = newX > -7.5 && newX < 7.5 && newZ > 1.2 && newZ < 2.8;
        const hitWall = newZ < -3.5 && !(newX > 4.8 && newX < 7.2);
        return hitBar || hitWall;
    };

    useFrame((state, delta) => {
        if (!groupRef.current || !visualsRef.current) return;
        if (!isPlaying) return;

        let dx = 0;
        let dz = 0;

        if (keys.current['w']) dz -= 1;
        if (keys.current['s']) dz += 1;
        if (keys.current['a']) dx -= 1;
        if (keys.current['d']) dx += 1;

        const isMoving = dx !== 0 || dz !== 0;

        if (isMoving) {
            const length = Math.sqrt(dx * dx + dz * dz);
            dx /= length;
            dz /= length;

            const nextX = groupRef.current.position.x + dx * MOVEMENT_SPEED * delta;
            const nextZ = groupRef.current.position.z + dz * MOVEMENT_SPEED * delta;

            if (!checkCollision(nextX, groupRef.current.position.z)) {
                groupRef.current.position.x = nextX;
            }
            if (!checkCollision(groupRef.current.position.x, nextZ)) {
                groupRef.current.position.z = nextZ;
            }

            targetRotation.current = Math.atan2(dx, dz);
        }

        let angleDiff = targetRotation.current - visualsRef.current.rotation.y;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        visualsRef.current.rotation.y += angleDiff * ROTATION_SPEED * delta;

        if (isMoving) {
            const time = state.clock.elapsedTime * 15;
            visualsRef.current.rotation.z = Math.sin(time) * 0.05;
            visualsRef.current.position.y = (Math.sin(time * 2) + 1) * 0.05;
        } else {
            visualsRef.current.rotation.z = THREE.MathUtils.lerp(visualsRef.current.rotation.z, 0, 0.1);
            visualsRef.current.position.y = THREE.MathUtils.lerp(visualsRef.current.position.y, 0, 0.1);
        }
    });

    return (
        <group ref={ groupRef }>
            <group ref={ visualsRef }>
                {/* Head */ }
                <SoftBlock args={ [0.5, 0.5, 0.5] } color={ headColor } position={ [0, 1.45, 0] }/>
                {/* Eyes/Glasses */ }
                <mesh position={ [0, 1.45, 0.26] } castShadow>
                    <planeGeometry args={ [0.4, 0.1] }/>
                    <meshStandardMaterial color={ primaryColor } emissive={ primaryColor } emissiveIntensity={ 0.5 }/>
                </mesh>
                {/* Body */ }
                <SoftBlock args={ [0.6, 0.7, 0.4] } color={ shirtColor } position={ [0, 0.85, 0] }/>
            </group>
            {/* Simple blob shadow for player */ }
            <mesh position={ [0, 0.02, 0] } rotation={ [-Math.PI / 2, 0, 0] } receiveShadow>
                <circleGeometry args={ [0.35, 16] }/>
                <meshBasicMaterial color="#000000" opacity={ 0.3 } transparent/>
            </mesh>
        </group>
    );
};

// --- 3. UI COMPONENTS ---

const MainMenu = ({ onStart }: { onStart: () => void }) => {
    const primary = useThemeColor('--brand-primary');
    const bg = useThemeColor('--bg-page');
    const text = useThemeColor('--text-main');

    return (
        <div style={ {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${ bg }DD`,
            zIndex: 10,
            color: text,
            fontFamily: 'monospace', // Retro font stack
            backdropFilter: 'blur(5px)'
        } }>
            <h1 style={ {
                fontSize: '5rem',
                marginBottom: '20px',
                textTransform: 'uppercase',
                letterSpacing: '5px',
                color: primary,
                textShadow: `4px 4px 0px ${ text }` // Retro block shadow
            } }>
                SHOP SIM
            </h1>
            <button
                onClick={ onStart }
                style={ {
                    padding: '15px 50px',
                    fontSize: '1.5rem',
                    background: primary,
                    color: bg,
                    border: `4px solid ${ text }`, // Thick retro border
                    borderRadius: '0px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    boxShadow: `8px 8px 0px ${ text }`, // Retro button shadow
                    fontFamily: 'monospace'
                } }
            >
                START
            </button>
            <p style={ { marginTop: '30px', opacity: 0.7, fontSize: '0.9rem', color: text } }>WASD TO MOVE</p>
        </div>
    )
}

const SceneBackground = () => {
    const bgColor = useThemeColor('--bg-page');
    return <color attach="background" args={ [bgColor] }/>;
};

// --- 4. MAIN SCENE ---

export default function Game() {
    const [gameState, setGameState] = useState<'menu' | 'playing'>('menu');

    return (
        <div style={ { width: '100%', height: '100%', position: 'relative' } }>

            { gameState === 'menu' && (
                <MainMenu onStart={ () => setGameState('playing') }/>
            ) }

            <Canvas shadows dpr={ [1, 2] }>
                <SceneBackground/>

                <PerspectiveCamera
                    makeDefault
                    position={ [0, 12, 16] }
                    fov={ 40 }
                    near={ 0.1 }
                    far={ 200 }
                    onUpdate={ c => c.lookAt(0, 0, 0) }
                />

                {/* Soft, Warm Lighting Setup */ }
                <ambientLight intensity={ 0.4 }/>
                <hemisphereLight intensity={ 0.3 } groundColor="#444"/>

                {/* Main Sunlight with Shadows */ }
                <directionalLight
                    position={ [10, 20, 10] }
                    intensity={ 1.2 }
                    castShadow
                    shadow-mapSize={ [1024, 1024] }
                    shadow-bias={ -0.0001 }
                >
                    <orthographicCamera attach="shadow-camera" args={ [-20, 20, 20, -20] }/>
                </directionalLight>

                {/* Fill light */ }
                <pointLight position={ [-10, 5, -5] } intensity={ 0.5 } color="#ccccff"/>

                <Floor/>
                <ShopDoor/>
                <BackWallDecor/>
                <BarCounter/>
                <Player isPlaying={ gameState === 'playing' }/>

                {/* Retro Post-Processing Stack */ }
                <EffectComposer enableNormalPass={ false }>
                    {/* Pixelation for that 8-bit/32-bit crunch */ }
                    <Pixelation granularity={ 4 }/>

                    {/* Bloom for the neon signs */ }
                    <Bloom
                        luminanceThreshold={ 1 }
                        mipmapBlur
                        intensity={ 1.2 }
                        radius={ 0.5 }
                    />

                </EffectComposer>
            </Canvas>
        </div>
    );
}
