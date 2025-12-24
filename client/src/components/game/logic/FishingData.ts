import type { FishType } from '../GameConfig';

export const FISH_SPECIES: Record<string, FishType> = {
    'old-boot': {
        id: 'old-boot',
        name: 'Old Boot',
        baseWeight: 2.5,
        stdDev: 0.5,
        rarity: 0.8,
        conditions: {} // Caught anytime
    },
    'sunfish': {
        id: 'sunfish',
        name: 'Sunfish',
        baseWeight: 1.2,
        stdDev: 0.4,
        rarity: 0.6,
        conditions: { time: 'day' }
    },
    'neon-tetra': {
        id: 'neon-tetra',
        name: 'Neon Giant',
        baseWeight: 8.5,
        stdDev: 2.0,
        rarity: 0.4,
        conditions: { time: 'night' }
    },
    'rain-trout': {
        id: 'rain-trout',
        name: 'Rain Trout',
        baseWeight: 5.0,
        stdDev: 1.0,
        rarity: 0.5,
        conditions: { weather: 'rain' }
    }
};

// Box-Muller transform for normal distribution
export const generateWeight = (base: number, dev: number): number => {
    const u = 1 - Math.random();
    const v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return parseFloat(Math.max(0.1, base + z * dev).toFixed(2));
};

export const selectFish = (isDay: boolean, isRaining: boolean): { fishId: string; weight: number } => {
    // 1. Filter valid fish
    const validFish = Object.values(FISH_SPECIES).filter(f => {
        if (f.conditions.time) {
            if (f.conditions.time === 'day' && !isDay) return false;
            if (f.conditions.time === 'night' && isDay) return false;
        }
        if (f.conditions.weather) {
            if (f.conditions.weather === 'rain' && !isRaining) return false;
            if (f.conditions.weather === 'clear' && isRaining) return false;
        }
        return true;
    });

    // 2. Weighted Random Selection
    const totalRarity = validFish.reduce((sum, f) => sum + f.rarity, 0);
    let random = Math.random() * totalRarity;
    let selected = validFish[0] || FISH_SPECIES['old-boot'];

    for (const fish of validFish) {
        random -= fish.rarity;
        if (random <= 0) {
            selected = fish;
            break;
        }
    }

    return {
        fishId: selected.id,
        weight: generateWeight(selected.baseWeight, selected.stdDev)
    };
};
