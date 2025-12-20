import { useMemo } from 'react';
import { useThemeColor } from '../../hooks/useThemeColor';
import type { Card } from './GameConfig.ts';
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
    DealerNPC
} from './GameAssets';

/* -------------------------------------------------------------------------- */
/* SHARED COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

const BarStool = ({ position, rotation = [0, 0, 0] }: {
    position: [number, number, number],
    rotation?: [number, number, number]
}) => {
    const woodColor = useThemeColor('--border-base');
    const legColor = useThemeColor('--text-muted');

    return (
        <group position={ position } rotation={ rotation }>
            {/* [!code change] Restored Taller Height (0.8) */ }
            <SoftBlock args={ [0.45, 0.1, 0.45] } color={ woodColor } position={ [0, 0.8, 0] }/>
            <SoftBlock args={ [0.08, 0.8, 0.08] } color={ legColor } position={ [0, 0.4, 0] }/>
            <SoftBlock args={ [0.4, 0.05, 0.4] } color={ legColor } position={ [0, 0.025, 0] }/>
        </group>
    );
};

const BlackjackChair = ({ position, rotation = [0, 0, 0] }: {
    position: [number, number, number],
    rotation?: [number, number, number]
}) => {
    const woodColor = useThemeColor('--border-base');
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

export const BarLevel = ({ isDoorOpen, dealerHand = [] }: {
    isDoorOpen: boolean,
    playerRef?: any,
    dealerHand?: Card[]
}) => {
    // Theme & Config
    const surfaceColor = useThemeColor('--bg-surface-highlight');
    const woodColor = useThemeColor('--border-base');
    const wallColor = useThemeColor('--bg-page');
    const shelfColor = useThemeColor('--bg-surface-highlight');
    const palette = [
        useThemeColor('--brand-primary'),
        useThemeColor('--text-main'),
        useThemeColor('--border-base')
    ];

    const barHeight = 1.3;
    const barThickness = 0.6;

    // Procedural Bottle Generation
    const { bottomRow, topRow } = useMemo(() => {
        const generateRow = (count: number, widthSpread: number) => new Array(count).fill(0).map((_, i) => ({
            id: Math.random(),
            x: -(widthSpread / 2) + (widthSpread / count) / 2 + (i * (widthSpread / count)),
            colorIndex: Math.floor(Math.random() * 3),
            height: 0.3 + Math.random() * 0.4,
            width: 0.15 + Math.random() * 0.1
        }));
        return { bottomRow: generateRow(8, 5), topRow: generateRow(6, 4) };
    }, []);

    return (
        <group>
            <Floor/>

            {/* Architecture: Bar Structure & Counter */ }
            <group position={ [-4, 0, 0] }>
                {/* Front Section */ }
                <group position={ [0, 0, -1.5] }>
                    <SoftBlock args={ [6, barHeight, barThickness] } color={ surfaceColor }
                               position={ [0, barHeight / 2, 0] }/>
                    <SoftBlock args={ [6.2, 0.15, barThickness + 0.2] } color={ woodColor }
                               position={ [0, barHeight + 0.075, 0] }/>
                </group>

                {/* Left Section */ }
                <group position={ [-2.7, 0, -2.8] }>
                    <SoftBlock args={ [barThickness, barHeight, 2.5] } color={ surfaceColor }
                               position={ [0, barHeight / 2, 0] }/>
                    <SoftBlock args={ [barThickness + 0.2, 0.15, 2.7] } color={ woodColor }
                               position={ [0, barHeight + 0.075, -0.1] }/>
                </group>

                {/* Right Section */ }
                <group position={ [2.7, 0, -2.125] }>
                    <SoftBlock args={ [barThickness, barHeight, 1.25] } color={ surfaceColor }
                               position={ [0, barHeight / 2, 0] }/>
                    <SoftBlock args={ [barThickness + 0.2, 0.15, 1.25] } color={ woodColor }
                               position={ [0, barHeight + 0.075, 0] }/>
                </group>

                {/* Bar Stools */ }
                { [-2, 0, 2].map((xOffset, i) => (
                    <BarStool key={ i } position={ [xOffset, 0, -0.6] }/>
                )) }
            </group>

            {/* Characters */ }
            <Bartender position={ [-4, 0, -2.8] } rotation={ [0, 0, 0] }/>

            {/* Blackjack Area */ }
            <group position={ [3, 0, 2.5] }>
                <BlackjackTable position={ [0, 0, 0] } rotation={ [0, 0, 0] }/>
                <DealerNPC position={ [0, 0, -2.0] } rotation={ [0, 0, 0] } hand={ dealerHand }/>

                <BlackjackChair position={ [-3.8, 0, 0] } rotation={ [0, Math.PI / 2, 0] }/>
                <BlackjackChair position={ [-2.0, 0, 1.8] } rotation={ [0, Math.PI, 0] }/>
                <BlackjackChair position={ [0.0, 0, 1.8] } rotation={ [0, Math.PI, 0] }/>
                <BlackjackChair position={ [2.0, 0, 1.8] } rotation={ [0, Math.PI, 0] }/>
                <BlackjackChair position={ [3.8, 0, 0] } rotation={ [0, -Math.PI / 2, 0] }/>
            </group>

            {/* Environment: Walls & Shelves */ }
            <group position={ [0, 0, -4] }>
                <SoftBlock args={ [80, 8, 1] } color={ wallColor } position={ [0, 4, -0.6] }/>

                <group position={ [-4, 0, 0] }>
                    {/* Bottom Shelf at 2.2 */ }
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

                    {/* Top Shelf at 3.2 */ }
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

            {/* Exits */ }
            <PortalDoor position={ [6, 0, -3.9] } label='EXIT' isOpen={ isDoorOpen }/>
        </group>
    );
};

export const AlleyLevel = ({ isDoorOpen }: { isDoorOpen: boolean }) => {
    const wallColor = useThemeColor('--bg-surface');

    return (
        <group>
            <Floor colorOverride='#1a1a1a'/>

            {/* Architecture: Walls & Boundaries */ }
            <group position={ [0, 0, -4] }>
                <SoftBlock args={ [80, 12, 1] } color={ wallColor } position={ [0, 6, -0.6] }/>
                <SoftBlock args={ [0.3, 12, 0.3] } color='#333' position={ [-4, 6, 0] }/>
                <SoftBlock args={ [0.3, 12, 0.3] } color='#333' position={ [-5, 6, 0] }/>
            </group>

            {/* Props: Clutter & Furniture */ }
            <Dumpster position={ [-5, 0, -2] } rotation={ [0, 0.2, 0] }/>
            <CardboardBox position={ [-3, 0.4, -2.5] } rotation={ [0, 0.5, 0] } size={ 0.8 }/>
            <CardboardBox position={ [-3, 1.1, -2.5] } rotation={ [0, 0.2, 0] } size={ 0.6 }/>
            <Bench position={ [1.5, 0, -3.6] } rotation={ [0, 0, 0] }/>

            {/* Characters */ }
            <AlleySmoker position={ [1.0, 0.45, -3.6] } rotation={ [0, 0, 0] }/>

            {/* Exits */ }
            <PortalDoor position={ [6, 0, -3.9] } label='BAR' isOpen={ isDoorOpen }/>
        </group>
    );
};
