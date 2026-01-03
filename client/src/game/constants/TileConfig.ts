/**
 * Global mapping of Tile Names to Sprite Sheet Indices.
 * Based on tiles.png (128x128, 32px grid):
 * Index 0: (0,0)   - Transparent/Air
 * Index 1: (32,0)  - Green (Earth Ground)
 * Index 2: (64,0)  - Blue (Water)
 * Index 3: (96,0)  - Red (Mars Ground)
 */
export const TILE_IDS = {
    AIR: 0,
    GRASS_A: 1,
    GRASS_B: 2,
    GRASS_C: 3,
    WATER_A: 4,
    WATER_B: 5,
    WATER_C: 6,
    WATER_D: 7,
    MARS_GROUND_A: 8,
    MARS_GROUND_B: 9,
} as const;

// Helper to check if a tile is water
export const isWater = (index: number) => {
    return index > 3 && index < 8;
}
