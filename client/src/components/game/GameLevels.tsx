import { useMemo } from 'react';
import { useThemeColor } from '../../hooks/useThemeColor';
import {
    Floor,
    SoftBlock,
    SimpleBottle,
    PortalDoor,
    Bartender,
    AlleySmoker,
    Bench,
    CardboardBox,
    Dumpster
} from './GameAssets';

/* -------------------------------------------------------------------------- */
/* BAR LEVEL SCENE                                                            */
/* -------------------------------------------------------------------------- */

export const BarLevel = ({ isDoorOpen }: { isDoorOpen: boolean, playerRef?: any }) => {
    // Theme & Config
    const surfaceColor = useThemeColor('--bg-surface-highlight');
    const woodColor = useThemeColor('--border-base');
    const legColor = useThemeColor('--text-muted');
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

                {/* Stools */ }
                { [-2, 0, 2].map((xOffset, i) => (
                    <group key={ i } position={ [xOffset, 0, -0.6] }>
                        <SoftBlock args={ [0.5, 0.1, 0.5] } color={ woodColor } position={ [0, 0.9, 0] }/>
                        <SoftBlock args={ [0.1, 0.9, 0.1] } color={ legColor } position={ [0, 0.45, 0] }/>
                        <SoftBlock args={ [0.3, 0.05, 0.3] } color={ legColor } position={ [0, 0.1, 0] }/>
                    </group>
                )) }
            </group>

            {/* Characters */ }
            <Bartender position={ [-4, 0, -2.8] } rotation={ [0, 0, 0] }/>

            {/* Environment: Walls & Shelves */ }
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

            {/* Exits */ }
            <PortalDoor position={ [6, 0, -3.9] } label='EXIT' isOpen={ isDoorOpen }/>
        </group>
    );
};

/* -------------------------------------------------------------------------- */
/* ALLEY LEVEL SCENE                                                          */
/* -------------------------------------------------------------------------- */

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
