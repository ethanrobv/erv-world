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
    Ground
} from './GameAssets';

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
    const woodColor = useThemeColor('--game-wood'); // Updated to use game-wood
    const legColor = useThemeColor('--game-metal'); // Updated to use game-metal

    return (
        <group position={ position } rotation={ rotation }>
            <SoftBlock args={ [0.45, 0.1, 0.45] } color={ woodColor } position={ [0, 0.8, 0] }/>
            <SoftBlock args={ [0.08, 0.8, 0.08] } color={ legColor } position={ [0, 0.4, 0] }/>
            <SoftBlock args={ [0.4, 0.05, 0.4] } color={ legColor } position={ [0, 0.025, 0] }/>
        </group>
    );
};

const BlackjackChair = ({ position, rotation = [0, 0, 0] }: BaseProps) => {
    const woodColor = useThemeColor('--game-wood'); // Updated to use game-wood
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
    // Theme & Config
    const surfaceColor = useThemeColor('--bg-surface-highlight');
    const woodColor = useThemeColor('--game-wood'); // Using semantic game-wood
    const wallColor = useThemeColor('--bg-page');
    const shelfColor = useThemeColor('--bg-surface-highlight');
    const palette = [
        useThemeColor('--game-accent'), // Using semantic accent
        useThemeColor('--brand-primary'),
        useThemeColor('--text-main')
    ];

    const barHeight = 1.3;
    const barThickness = 0.6;

    // Procedural Bottle Generation
    const { bottomRow, topRow } = useMemo(() => {
        const generateRow = (count: number, widthSpread: number) =>
            new Array(count).fill(0).map((_, i) => ({
                id: Math.random(),
                x: -(widthSpread / 2) + (widthSpread / count) / 2 + i * (widthSpread / count),
                colorIndex: Math.floor(Math.random() * 3),
                height: 0.3 + Math.random() * 0.4,
                width: 0.15 + Math.random() * 0.1
            }));
        return { bottomRow: generateRow(8, 5), topRow: generateRow(6, 4) };
    }, []);

    const interactables = SCENE_DATA.bar.interactables || [];
    const portals = SCENE_DATA.bar.portals;

    return (
        <group>
            <Floor/>

            {/* STATIC ARCHITECTURE */ }
            <group position={ [-4, 0, 0] }>
                {/* Front Section */ }
                <group position={ [0, 0, -1.5] }>
                    <SoftBlock
                        args={ [6, barHeight, barThickness] }
                        color={ surfaceColor }
                        position={ [0, barHeight / 2, 0] }
                    />
                    <SoftBlock
                        args={ [6.2, 0.15, barThickness + 0.2] }
                        color={ woodColor }
                        position={ [0, barHeight + 0.075, 0] }
                    />
                </group>

                {/* Left Section */ }
                <group position={ [-2.7, 0, -2.8] }>
                    <SoftBlock
                        args={ [barThickness, barHeight, 2.5] }
                        color={ surfaceColor }
                        position={ [0, barHeight / 2, 0] }
                    />
                    <SoftBlock
                        args={ [barThickness + 0.2, 0.15, 2.7] }
                        color={ woodColor }
                        position={ [0, barHeight + 0.075, -0.1] }
                    />
                </group>

                {/* Right Section */ }
                <group position={ [2.7, 0, -2.125] }>
                    <SoftBlock
                        args={ [barThickness, barHeight, 1.25] }
                        color={ surfaceColor }
                        position={ [0, barHeight / 2, 0] }
                    />
                    <SoftBlock
                        args={ [barThickness + 0.2, 0.15, 1.25] }
                        color={ woodColor }
                        position={ [0, barHeight + 0.075, 0] }
                    />
                </group>
            </group>

            { interactables
                .filter(i => i.id.startsWith('stool'))
                .map((stool) => (
                    <BarStool
                        key={ stool.id }
                        position={ stool.position }
                        rotation={ [0, stool.behavior.type === 'station' ? stool.behavior.anchorRotation : 0, 0] }
                    />
                )) }

            <Bartender position={ [-4, 0, -2.8] } rotation={ [0, 0, 0] }/>

            {/* BLACKJACK AREA */ }
            <group>
                <BlackjackTable position={ [3, 0, 2.5] } rotation={ [0, 0, 0] }/>
                <DealerNPC position={ [3, 0, 0.5] } rotation={ [0, 0, 0] } hand={ dealerHand }/>

                { interactables
                    .filter((i) => i.behavior.type === 'seat')
                    .map((seat) => (
                        <BlackjackChair
                            key={ seat.id }
                            position={ seat.position }
                            rotation={ [
                                0,
                                seat.behavior.type === 'seat' ? seat.behavior.anchorRotation : 0,
                                0
                            ] }
                        />
                    )) }
            </group>

            {/* ENVIRONMENT DECOR */ }
            <group position={ [0, 0, -4] }>
                <SoftBlock args={ [80, 8, 1] } color={ wallColor } position={ [0, 4, -0.6] }/>

                <group position={ [-4, 0, 0] }>
                    <SoftBlock args={ [5.5, 0.1, 0.4] } color={ shelfColor } position={ [0, 2.2, 0] }/>
                    { bottomRow.map((b) => (
                        <SimpleBottle
                            key={ b.id }
                            width={ b.width }
                            height={ b.height }
                            color={ palette[b.colorIndex] || '#fff' }
                            position={ [b.x, 2.25 + b.height / 2, 0] }
                        />
                    )) }

                    <SoftBlock args={ [5.5, 0.1, 0.4] } color={ shelfColor } position={ [0, 3.2, 0] }/>
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

export const AlleyLevel = ({ isDoorOpen }: { isDoorOpen: boolean }) => {
    const wallColor = useThemeColor('--bg-surface');
    const interactables = SCENE_DATA.alley.interactables || [];
    const portals = SCENE_DATA.alley.portals;

    const benchData = interactables.find(i => i.id === 'alley-bench');

    return (
        <group>
            {/* Updated to use semantic grass toggle for the alleyway */ }
            <Ground useGrass/>

            {/* Architecture: Walls & Boundaries */ }
            <group position={ [0, 0, -4] }>
                <SoftBlock args={ [80, 12, 1] } color={ wallColor } position={ [0, 6, -0.6] }/>
                <SoftBlock args={ [0.3, 12, 0.3] } color='#333' position={ [-4, 6, 0] }/>
                <SoftBlock args={ [0.3, 12, 0.3] } color='#333' position={ [-5, 6, 0] }/>
            </group>

            {/* Props: Clutter */ }
            <Dumpster position={ [-5, 0, -2] } rotation={ [0, 0.2, 0] }/>
            <CardboardBox position={ [-3, 0.4, -2.5] } rotation={ [0, 0.5, 0] } size={ 0.8 }/>
            <CardboardBox position={ [-3, 1.1, -2.5] } rotation={ [0, 0.2, 0] } size={ 0.6 }/>

            { benchData && (
                <Bench position={ benchData.position } rotation={ [0, 0, 0] }/>
            ) }

            <AlleySmoker position={ [1.3, 0.45, -3.6] } rotation={ [0, 0, 0] }/>

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
