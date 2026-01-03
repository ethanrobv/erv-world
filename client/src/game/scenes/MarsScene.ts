import { BasePlanetScene } from './BasePlanetScene';

/**
 * Scene representing the Mars environment.
 * Uses the 'map_mars' asset key.
 */
export class MarsScene extends BasePlanetScene {
    constructor() {
        super('MarsScene');
    }

    /**
     * Returns the unique ID for this planet.
     */
    protected get planetId(): string {
        return 'mars';
    }
}
