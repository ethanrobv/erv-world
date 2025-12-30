import { IslandTerrain } from './IslandTerrain';
import { WaterBody } from './WaterBody';
import { SkySystem } from '../core/SkySystem';

/**
 * MAIN LEVEL: "The Archipelago"
 * * Contains:
 * - Dynamic Sky & Lighting (SkySystem)
 * - Physics Geometry (IslandTerrain)
 * - Fluid Volumes (WaterBody)
 * * This component is purely compositional. Logic resides in the sub-components.
 */
export const Level = () => {
    return (
        <>
            {/* ATMOSPHERE */ }
            <SkySystem/>

            {/* PHYSICAL WORLD */ }
            <IslandTerrain/>

            {/* FLUIDS */ }
            <WaterBody/>
        </>
    );
};
