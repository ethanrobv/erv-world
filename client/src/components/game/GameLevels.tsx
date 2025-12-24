import React, { useMemo } from 'react';
import { useThemeColor } from '../../hooks/useThemeColor';
import { getAssetComponent } from './assets/AssetRegistry';
import { LEVELS } from './LevelData';
import type { Card, LevelData } from './GameConfig';
import * as Env from './assets/Environment.tsx';
import * as Chars from './assets/Characters.tsx';

// --- Types ---

interface SceneBuilderProps {
    data: LevelData;
    extraProps?: Record<string, unknown>;
}

interface LevelProps {
    isDoorOpen: boolean;
}

interface BarLevelProps extends LevelProps {
    dealerHand?: Card[];
}

interface AlleyLevelProps extends LevelProps {
    isFireLit: boolean;
}

/**
 * Generic Scene Renderer.
 * Combines interactables and static props from LevelData and renders them
 * using the AssetRegistry.
 */
const SceneBuilder = ({ data, extraProps = {} }: SceneBuilderProps) => {
    // Optimization: Combine lists once per level data change
    const allObjects = useMemo(() => {
        return [...(data.interactables || []), ...(data.staticProps || [])];
    }, [data]);

    return (
        <>
            {/* Render Exits/Portals */ }
            { data.portals.map((portal, i) => (
                <Env.PortalDoor
                    key={ `portal-${ i }` }
                    position={ portal.position }
                    label={ portal.targetScene.toUpperCase() === 'ALLEY' ? 'EXIT' : 'BAR' }
                    isOpen={ !!extraProps.isDoorOpen }
                />
            )) }

            {/* Render Objects */ }
            { allObjects.map((obj) => {
                const Component = getAssetComponent(obj.type);
                if (!Component) return null;

                // Merge static data with runtime state (e.g. fire on/off)
                const runtimeProps = (extraProps[obj.id] as Record<string, unknown>) || {};

                return (
                    <Component
                        key={ obj.id }
                        { ...obj }
                        { ...runtimeProps }
                    />
                );
            }) }
        </>
    );
};

/**
 * The Bar Level.
 * Contains the Blackjack mini-game and indoor lighting logic.
 */
export const BarLevel = React.memo(({ isDoorOpen, dealerHand = [] }: BarLevelProps) => {
    const neonPink = useThemeColor('--game-neon-main') || '#db2777';
    const sunColor = useThemeColor('--game-sun-color') || '#fff7ed';

    // Day/Night Cycle Logic
    const isNight = sunColor === '#000000' || sunColor === 'rgb(0, 0, 0)';
    const isDay = !isNight;

    // Lighting Params
    const sunIntensity = isDay ? 1.5 : 0;
    const ambientIntensity = isDay ? 0.7 : 0;
    const lampIntensity = isDay ? 5 : 80;
    const standingLampIntensity = isDay ? 5 : 100;

    const dynamicProps = useMemo(() => ({
        isDoorOpen,
        'lamp-1': { intensity: lampIntensity },
        'lamp-2': { intensity: lampIntensity },
        'lamp-stand': { intensity: standingLampIntensity },
    }), [isDoorOpen, lampIntensity, standingLampIntensity]);

    return (
        <group>
            <Env.WoodFloor/>

            {/* Environment Lighting */ }
            <group>
                <ambientLight intensity={ ambientIntensity } color={ sunColor }/>
                <directionalLight position={ [10, 10, -20] } intensity={ sunIntensity } color={ sunColor } castShadow/>
            </group>

            {/* Static Architecture */ }
            <Env.BarBackWall position={ [0, 0, -4] } isDay={ isDay }/>
            <Env.BarCounter position={ [-4, 0, 0] }/>
            <Env.NeonSign text='BAR' position={ [-4.5, 5, -4.125] } color={ neonPink }/>

            {/* Game Logic Entities */ }
            <group>
                <Env.BlackjackTable position={ [3, 0, 2.5] }/>
                <Chars.DealerNPC position={ [3, 0, 0.5] } hand={ dealerHand }/>
            </group>

            <SceneBuilder data={ LEVELS.bar } extraProps={ dynamicProps }/>
        </group>
    );
});

/**
 * The Alley Level.
 * Contains the Fishing activity and outdoor environment logic.
 */
export const AlleyLevel = React.memo(({ isDoorOpen, isFireLit }: AlleyLevelProps) => {
    const sunColor = useThemeColor('--game-sun-color') || '#fff7ed';
    const isNight = sunColor === '#000000' || sunColor === 'rgb(0, 0, 0)';
    const isDay = !isNight;
    const isRaining = !isDay; // Simple weather logic: Night = Rain

    const dynamicProps = useMemo(() => ({
        isDoorOpen,
        'trash-fire': { isOn: isFireLit }
    }), [isDoorOpen, isFireLit]);

    // Calculate visual water plane to match logical water zone
    const waterZone = LEVELS.alley.waterZones?.[0];
    const waterProps = useMemo(() => {
        if (!waterZone) return null;
        const width = waterZone.x[1] - waterZone.x[0];
        const length = waterZone.z[1] - waterZone.z[0];
        const centerX = (waterZone.x[0] + waterZone.x[1]) / 2;
        const centerZ = (waterZone.z[0] + waterZone.z[1]) / 2;
        return { position: [centerX, 0.1, centerZ] as [number, number, number], width, length };
    }, [waterZone]);

    return (
        <group>
            <Env.GrassFloor/>

            <group visible={ isRaining }>
                <Env.SceneRain/>
            </group>

            <directionalLight position={ [10, 20, 5] } intensity={ 1.0 } color={ sunColor } castShadow/>
            <ambientLight intensity={ 0.3 } color={ sunColor }/>

            <Env.AlleyArchitecture position={ [0, 0, -10] }/>

            { waterProps && (
                <>
                    <Env.LakeFloor
                        position={ waterProps.position }
                        width={ waterProps.width }
                        length={ waterProps.length }
                    />
                    <Env.LakeWater
                        position={ waterProps.position }
                        width={ waterProps.width }
                        length={ waterProps.length }
                        isRaining={ isRaining }
                    />
                </>
            ) }

            <SceneBuilder data={ LEVELS.alley } extraProps={ dynamicProps }/>
        </group>
    );
});
