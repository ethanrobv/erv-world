import React, { useMemo } from 'react';
import { useThemeColor } from '../../hooks/useThemeColor';
import { getAssetComponent } from './assets/AssetRegistry';
import { LEVELS } from './LevelData';
import type { Card, LevelData } from './GameConfig';
import * as Env from './assets/Environment.tsx';
import * as Chars from './assets/Characters.tsx';

// Scene Builder (Generic Renderer)

const SceneBuilder = ({
                          data,
                          extraProps = {}
                      }: {
    data: LevelData;
    extraProps?: Record<string, any>
}) => {
    // Combine interactables and static props into one render list
    const allObjects = useMemo(() => {
        return [...(data.interactables || []), ...(data.staticProps || [])];
    }, [data]);

    return (
        <>
            {/* Render Exits */ }
            { data.portals.map((portal, i) => (
                <Env.PortalDoor
                    key={ `portal-${ i }` }
                    position={ portal.position }
                    label={ portal.targetScene.toUpperCase() === 'ALLEY' ? 'EXIT' : 'DOOR' }
                    isOpen={ extraProps.isDoorOpen }
                />
            )) }

            {/* Render Assets from Registry */ }
            { allObjects.map((obj) => {
                const Component = getAssetComponent(obj.type);
                if (!Component) return null;

                // Combine:
                // 1. Static properties from LevelData
                // 2. Runtime extraProps matching the object ID (e.g. fire state)
                const runtimeProps = extraProps[obj.id] || {};

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

// Level Components

export const BarLevel = React.memo(({
                                        isDoorOpen,
                                        dealerHand = []
                                    }: {
    isDoorOpen: boolean;
    dealerHand?: Card[]
}) => {
    const neonPink = useThemeColor('--game-neon-main') || '#db2777';
    const sunColor = useThemeColor('--game-sun-color') || '#fff7ed';

    // Lighting State
    const isNight = sunColor === '#000000' || sunColor === '#000000' || sunColor === 'rgb(0, 0, 0)';
    const isDay = !isNight;
    const sunIntensity = isDay ? 1.5 : 0;
    const ambientIntensity = isDay ? 0.7 : 0;
    const lampIntensity = isDay ? 5 : 80;
    const standingLampIntensity = isDay ? 5 : 100;

    // Dynamic props to inject into SceneBuilder assets
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

            {/* Static Architecture (Unique to level, not worth registry overhead) */ }
            <Env.BarBackWall position={ [0, 0, -4] } isDay={ isDay }/>
            <Env.BarCounter position={ [-4, 0, 0] }/>
            <Env.NeonSign text='BAR' position={ [-4.5, 5, -4.125] } color={ neonPink }/>

            {/* Specialized Game Logic Entities */ }
            <group>
                <Env.BlackjackTable position={ [3, 0, 2.5] }/>
                <Chars.DealerNPC position={ [3, 0, 0.5] } hand={ dealerHand }/>
            </group>

            {/* Data Driven Assets */ }
            <SceneBuilder data={ LEVELS.bar } extraProps={ dynamicProps }/>
        </group>
    );
});

export const AlleyLevel = React.memo(({
                                          isDoorOpen,
                                          isFireLit
                                      }: {
    isDoorOpen: boolean;
    isFireLit: boolean
}) => {
    const sunColor = useThemeColor('--game-sun-color') || '#fff7ed';
    const isNight = sunColor === '#000000' || sunColor === '#000000' || sunColor === 'rgb(0, 0, 0)';
    const isDay = !isNight;
    const isRaining = !isDay;

    const dynamicProps = useMemo(() => ({
        isDoorOpen,
        'trash-fire': { isOn: isFireLit }
    }), [isDoorOpen, isFireLit]);

    // Calculate Water Props from Data
    // This ensures the visual water matches the logical zone used by FootSplashes
    const waterZone = LEVELS.alley.waterZones?.[0]; // Assuming 1 main body of water
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

            {/* Architecture */ }
            <Env.AlleyArchitecture position={ [0, 0, -10] }/>

            {/* Render Water & Floor */ }
            { waterProps && (
                <>
                    {/* The Floor underneath to hide the grass and add depth */ }
                    <Env.LakeFloor
                        position={ waterProps.position }
                        width={ waterProps.width }
                        length={ waterProps.length }
                    />
                    {/* The Water Surface */ }
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
