import { Scene } from 'phaser';
import { TILE_IDS } from '../../constants/TileConfig';

/**
 * Procedurally generates map layouts deterministically based on a seed.
 * Refactored to allow static access for UI/Minimap generation and handle
 * multi-variant tile randomization.
 */
export class MapGenerator {
    private readonly seed: string;

    constructor(_scene: Scene, seed: string) {
        this.seed = seed;
    }

    /**
     * Helper to create a seeded RNG independent of a Scene context.
     * Useful for the Minimap component to generate the exact same map data as the game.
     */
    public static createRNG(seed: string): Phaser.Math.RandomDataGenerator {
        return new Phaser.Math.RandomDataGenerator([seed]);
    }

    /**
     * Generates the raw 2D array of tile IDs.
     * Can be called statically by the UI (Minimap) or via instance by the Game (Scene).
     *
     * @param seed - The session seed ensures identical results across clients.
     * @param width - Map width in tiles.
     * @param height - Map height in tiles.
     * @param type - The biome type determines which tile palette to use.
     */
    public static generateData(seed: string, width: number, height: number, type: 'earth' | 'mars'): number[][] {
        const rng = MapGenerator.createRNG(seed);

        // Define palette options based on the biome
        const earthTiles = [TILE_IDS.GRASS_A, TILE_IDS.GRASS_B, TILE_IDS.GRASS_C];
        const marsTiles = [TILE_IDS.MARS_GROUND_A, TILE_IDS.MARS_GROUND_B];
        const waterTiles = [TILE_IDS.WATER_A, TILE_IDS.WATER_B, TILE_IDS.WATER_C, TILE_IDS.WATER_D];

        const basePalette = type === 'earth' ? earthTiles : marsTiles;

        // Initialize grid with random base tiles from the selected palette
        const mapData: number[][] = Array.from({ length: height }, () => {
            return Array.from({ length: width }, () => rng.pick(basePalette));
        });

        // Generate organic water features
        const featureCount = rng.between(3, 6);

        for (let i = 0; i < featureCount; i++) {
            const cx = rng.between(5, width - 5);
            const cy = rng.between(5, height - 5);
            const radius = rng.between(2, 5);

            // Carve the pool
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const distance = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                    // Add deterministic noise to the radius for organic shapes
                    const noise = rng.realInRange(-0.5, 0.5);

                    if (distance < radius + noise) {
                        // Pick a random water texture for visual variety
                        mapData[y][x] = rng.pick(waterTiles);
                    }
                }
            }
        }

        return mapData;
    }

    /**
     * Instance wrapper for the Phaser Scene to use.
     * Delegates logic to the static method to ensure shared behavior with the Minimap.
     */
    public generateMap(width: number, height: number, type: 'earth' | 'mars'): number[][] {
        console.log(`[MapGenerator] Generating map for ${ type } with seed "${ this.seed }"`);
        return MapGenerator.generateData(this.seed, width, height, type);
    }
}
