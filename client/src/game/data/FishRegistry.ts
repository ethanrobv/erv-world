export interface Fish {
    id: string;
    name: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
    xp: number;
    description: string;
}

export const FISH_TABLE: Record<string, Fish> = {
    'bass': { id: 'bass', name: 'Pixel Bass', rarity: 'common', xp: 10, description: 'A standard freshwater friend.' },
    'trout': {
        id: 'trout',
        name: 'Glitch Trout',
        rarity: 'uncommon',
        xp: 25,
        description: 'It shimmers with artifacts.'
    },
    'void_carp': {
        id: 'void_carp',
        name: 'Void Carp',
        rarity: 'rare',
        xp: 100,
        description: 'Stares back at you from the empty div.'
    },
    'cyber_shark': {
        id: 'cyber_shark',
        name: 'Cyber Shark',
        rarity: 'legendary',
        xp: 500,
        description: 'Apex predator of the local network.'
    }
};
