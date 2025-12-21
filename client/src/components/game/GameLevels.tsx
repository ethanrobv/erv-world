import { useMemo } from 'react';
import { useThemeColor } from '../../hooks/useThemeColor';
import { SCENE_DATA } from './GameConfig';
import type { Card } from './GameConfig';
import {
    Floor,
    SoftBlock,
    SimpleBottle,
    PortalDoor,
    Bartender,
    AlleySmoker,
    Bench,
    CardboardBox,
    Dumpster,
    BlackjackTable,
    DealerNPC,
    StreetLight,
    StandingLamp,
    HangingLamp,
    NeonSign,
    WindowUnit, SceneRain, TrashCanFire
} from './assets';

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type BaseProps = {
    position: [number, number, number];
    rotation?: [number, number, number];
};

/* -------------------------------------------------------------------------- */
/* SHARED COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

const BarStool = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const woodColor = useThemeColor('--game-wood');
    const legColor = useThemeColor('--game-metal');

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [0.45, 0.1, 0.45] } color={ woodColor } position={ [0, 0.8, 0] }/>
            <SoftBlock args={ [0.08, 0.8, 0.08] } color={ legColor } position={ [0, 0.4, 0] }/>
            <SoftBlock args={ [0.4, 0.05, 0.4] } color={ legColor } position={ [0, 0.025, 0] }/>
        </group>
    );
};

const BlackjackChair = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const woodColor = useThemeColor('--game-wood');
    const cushionColor = useThemeColor('--text-muted');
    const legColor = useThemeColor('--game-metal');

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [0.6, 0.1, 0.6] } color={ cushionColor } position={ [0, 0.5, 0] }/>
            <SoftBlock args={ [0.6, 0.6, 0.1] } color={ woodColor } position={ [0, 0.8, -0.25] }/>
            <SoftBlock args={ [0.08, 0.5, 0.08] } color={ legColor } position={ [-0.25, 0.25, -0.25] }/>
            <SoftBlock args={ [0.08, 0.5, 0.08] } color={ legColor } position={ [0.25, 0.25, -0.25] }/>
            <SoftBlock args={ [0.08, 0.5, 0.08] } color={ legColor } position={ [-0.25, 0.25, 0.25] }/>
            <SoftBlock args={ [0.08, 0.5, 0.08] } color={ legColor } position={ [0.25, 0.25, 0.25] }/>
        </group>
    );
};

/* -------------------------------------------------------------------------- */
/* BAR LEVEL SCENE                                                            */
/* -------------------------------------------------------------------------- */

export const BarLevel = ({
                             isDoorOpen,
                             dealerHand = []
                         }: {
    isDoorOpen: boolean;
    dealerHand?: Card[];
}) => {
    const surfaceColor = useThemeColor('--bg-surface-highlight');
    const woodColor = useThemeColor('--game-wood');
    const wallColor = useThemeColor('--bg-page');
    const shelfColor = useThemeColor('--bg-surface-highlight');
    const neonPink = useThemeColor('--game-neon-main');
    // const neonBlue = useThemeColor('--game-neon-alt');
    const sunColor = useThemeColor('--game-sun-color');
    const palette = [
        useThemeColor('--game-accent'),
        useThemeColor('--brand-primary'),
        useThemeColor('--text-main')
    ];

    const barHeight = 1.3;
    const barThickness = 0.6;

    // --- DAY/NIGHT LOGIC ---
    // If sun color is black, it's night. Otherwise, it's day.
    const isNight = sunColor === '#000000' || sunColor === '#000' || sunColor === 'rgb(0, 0, 0)';
    const isDay = !isNight;

    // Dim interior lights during the day
    const lampIntensity = isDay ? 5 : 80;
    const standingLampIntensity = isDay ? 5 : 100;

    const { bottomRow, topRow } = useMemo(() => {
        const generateRow = (count: number, widthSpread: number) =>
            new Array(count).fill(0).map((_, i) => ({
                id: Math.random(),
                x: -(widthSpread / 2) + (widthSpread / count) / 2 + i * (widthSpread / count),
                colorIndex: Math.floor(Math.random() * 3),
                height: 0.3 + Math.random() * 0.4,
                width: 0.15 + Math.random() * 0.1
            }));
        return { bottomRow: generateRow(6, 2.4), topRow: generateRow(4, 1.5) };
    }, []);

    const interactables = SCENE_DATA.bar.interactables || [];
    const portals = SCENE_DATA.bar.portals;

    return (
        <group>
            <Floor/>

            {/* --- LIGHTING --- */ }
            { isDay && (
                <>
                    {/* Global Ambient Fill (Simulates light bouncing everywhere) */ }
                    <ambientLight intensity={ 0.7 } color={ sunColor }/>

                    {/* The Sun: Directional light from OUTSIDE the room, casting shadows inward */ }
                    <directionalLight
                        position={ [10, 10, -20] } // Behind the back wall, to the right
                        target-position={ [0, 0, 0] }
                        intensity={ 1.5 }
                        color={ sunColor }
                        castShadow
                        shadow-bias={ -0.0005 }
                    />
                </>
            ) }

            <HangingLamp position={ [1, 5, 1] } intensity={ lampIntensity }/>
            <HangingLamp position={ [5, 5, 1] } intensity={ lampIntensity }/>
            <StandingLamp position={ [-5, 0, 5] } rotation={ [0, 0.5, 0] } intensity={ standingLampIntensity }/>

            {/* DECOR */ }

            {/* Signs */ }
            <NeonSign
                text='BAR'
                position={ [-4.5, 5, -4.125] } // Moved above shelves
                rotation={ [0, 0, 0] }
                color={ neonPink }
            />

            {/* GEOMETRY */ }

            {/* Back Wall & Window */ }
            <group position={ [0, 0, -4] }>

                {/* --- WALL WITH WINDOW CUTOUT --- */ }
                {/* 1. Bottom Section */ }
                <SoftBlock args={ [80, 2.4, 1] } color={ wallColor } position={ [0, 1.2, -0.6] }/>
                {/* 2. Top Section */ }
                <SoftBlock args={ [80, 3.4, 1] } color={ wallColor } position={ [0, 6.3, -0.6] }/>
                {/* 3. Left of Window */ }
                <SoftBlock args={ [37.9, 2.2, 1] } color={ wallColor } position={ [-21.05, 3.5, -0.6] }/>
                {/* 4. Right of Window */ }
                <SoftBlock args={ [37.9, 2.2, 1] } color={ wallColor } position={ [21.05, 3.5, -0.6] }/>

                {/* Window Unit (Mounted in the hole) */ }
                <WindowUnit position={ [0, 3.5, -0.05] } isDay={ isDay }/>

                {/* Shelves (Moved Left to x=-6 to clear window) */ }
                <group position={ [-4, 0, 0] }>
                    <SoftBlock args={ [2.5, 0.1, 0.25] } color={ shelfColor } position={ [0, 2.2, 0] }/>
                    { bottomRow.map((b) => (
                        <SimpleBottle
                            key={ b.id }
                            width={ b.width }
                            height={ b.height }
                            color={ palette[b.colorIndex] || '#fff' }
                            position={ [b.x, 2.25 + b.height / 2, 0] }
                        />
                    )) }
                    <SoftBlock args={ [2.5, 0.1, 0.25] } color={ shelfColor } position={ [0, 3.2, 0] }/>
                    { topRow.map((b) => (
                        <SimpleBottle
                            key={ b.id }
                            width={ b.width }
                            height={ b.height }
                            color={ palette[b.colorIndex] || '#fff' }
                            position={ [b.x, 3.25 + b.height / 2, 0] }
                        />
                    )) }
                </group>
            </group>

            {/* Bar Counter Structure (Left Side) */ }
            <group position={ [-4, 0, 0] }>
                <group position={ [0, 0, -1.5] }>
                    <SoftBlock args={ [6, barHeight, barThickness] } color={ surfaceColor }
                               position={ [0, barHeight / 2, 0] }/>
                    <SoftBlock args={ [6.2, 0.15, barThickness + 0.2] } color={ woodColor }
                               position={ [0, barHeight + 0.075, 0] }/>
                </group>
                <group position={ [-2.7, 0, -2.8] }>
                    <SoftBlock args={ [barThickness, barHeight, 2.5] } color={ surfaceColor }
                               position={ [0, barHeight / 2, 0] }/>
                    <SoftBlock args={ [barThickness + 0.2, 0.15, 2.7] } color={ woodColor }
                               position={ [0, barHeight + 0.075, -0.1] }/>
                </group>
                <group position={ [2.7, 0, -2.125] }>
                    <SoftBlock args={ [barThickness, barHeight, 1.25] } color={ surfaceColor }
                               position={ [0, barHeight / 2, 0] }/>
                    <SoftBlock args={ [barThickness + 0.2, 0.15, 1.25] } color={ woodColor }
                               position={ [0, barHeight + 0.075, 0] }/>
                </group>
            </group>

            { interactables.filter(i => i.id.startsWith('stool')).map((stool) => (
                <BarStool
                    key={ stool.id }
                    position={ stool.position }
                    rotation={ [0, stool.behavior.type === 'station' ? stool.behavior.anchorRotation : 0, 0] }
                />
            )) }

            <Bartender position={ [-4, 0, -2.8] } rotation={ [0, 0, 0] }/>

            <group>
                <BlackjackTable position={ [3, 0, 2.5] } rotation={ [0, 0, 0] }/>
                <DealerNPC position={ [3, 0, 0.5] } rotation={ [0, 0, 0] } hand={ dealerHand }/>
                { interactables.filter((i) => i.behavior.type === 'seat').map((seat) => (
                    <BlackjackChair
                        key={ seat.id }
                        position={ seat.position }
                        rotation={ [0, seat.behavior.type === 'seat' ? seat.behavior.anchorRotation : 0, 0] }
                    />
                )) }
            </group>

            { portals.map((portal, index) => (
                <PortalDoor
                    key={ index }
                    position={ portal.position }
                    label={ portal.targetScene.toUpperCase() === 'ALLEY' ? 'EXIT' : 'DOOR' }
                    isOpen={ isDoorOpen }
                />
            )) }
        </group>
    );
};

/* -------------------------------------------------------------------------- */
/* ALLEY LEVEL SCENE                                                          */
/* -------------------------------------------------------------------------- */

export const AlleyLevel = ({ isDoorOpen, isFireLit }: { isDoorOpen: boolean; isFireLit: boolean }) => {
    const wallColor = useThemeColor('--bg-surface');
    const sunColor = useThemeColor('--game-sun-color');
    const interactables = SCENE_DATA.alley.interactables || [];
    const portals = SCENE_DATA.alley.portals;
    const benchData = interactables.find(i => i.id === 'alley-bench');

    // Day/Night check for rain
    const isNight = sunColor === '#000000' || sunColor === '#000' || sunColor === 'rgb(0, 0, 0)';
    const isDay = !isNight;

    return (
        <group>
            <Floor useGrass/>

            {/* SCENE RAIN (Night Only) */ }
            { !isDay && <SceneRain/> }

            <directionalLight
                position={ [10, 20, 5] }
                intensity={ 1.0 }
                color={ sunColor }
                castShadow
                shadow-bias={ -0.0005 }
            />
            <ambientLight intensity={ 0.3 } color={ sunColor }/>

            <StreetLight position={ [-10, 0, 3.5] } rotation={ [0, 0, 0] }/>
            <StreetLight position={ [-2, 0, 3.5] } rotation={ [0, 0, 0] }/>
            <StreetLight position={ [6, 0, 3.5] } rotation={ [0, 0, 0] }/>
            <StreetLight position={ [14, 0, 3.5] } rotation={ [0, 0, 0] }/>

            <SoftBlock args={ [40, 0.4, 3] } color='#555' position={ [0, 0.2, 3.5] }/>
            <SoftBlock args={ [40, 0.2, 5] } color='#222' position={ [0, 0.1, 7.5] }/>

            <Dumpster position={ [-5, 0, -8] } rotation={ [0, 0.2, 0] }/>
            <CardboardBox position={ [-1.5, 0.4, -8] } rotation={ [0, 0.5, 0] } size={ 0.8 }/>
            <CardboardBox position={ [-1.5, 1.1, -7.9] } rotation={ [0, 0.2, 0] } size={ 0.6 }/>

            <TrashCanFire position={ [-5, 0, -2.5] } isOn={ isFireLit }/>

            <group position={ [0, 0, -10] }>
                <SoftBlock args={ [80, 12, 1] } color={ wallColor } position={ [0, 6, -0.6] }/>
            </group>

            { benchData && (
                <Bench position={ benchData.position } rotation={ [0, 0, 0] }/>
            ) }

            <AlleySmoker position={ [1.3, 0.45, -9] } rotation={ [0, 0, 0] }/>

            { portals.map((portal, index) => (
                <PortalDoor
                    key={ index }
                    position={ portal.position }
                    label='BAR'
                    isOpen={ isDoorOpen }
                />
            )) }
        </group>
    );
};
