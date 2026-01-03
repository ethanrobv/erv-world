import { BasePlanetScene } from './BasePlanetScene';

/**
 * Scene representing the Earth environment.
 * Uses the 'map_earth' asset key.
 */
export class EarthScene extends BasePlanetScene {
    constructor() {
        super('EarthScene');
    }

    /**
     * Returns the unique ID for this planet.
     */
    protected get planetId(): string {
        return 'earth';
    }
}
