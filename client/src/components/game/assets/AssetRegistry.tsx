import React from 'react';
import * as Env from './Environment';
import * as Chars from './Characters';

// Standard prop signature for scene objects
type PropComponent = React.ComponentType<{
    position: [number, number, number];
    rotation?: [number, number, number];
    [key: string]: unknown;
}>;

export const ASSET_MAP: Record<string, PropComponent> = {
    // Furniture & Environment
    'stool': Env.BarStool,
    'chair-bj': Env.BlackjackChair,
    'bench': Env.Bench,
    'dumpster': Env.Dumpster,
    'box': Env.CardboardBox,
    'street-light': Env.StreetLight,
    'lamp-standing': Env.StandingLamp,
    'lamp-hanging': Env.HangingLamp,
    'fire-trash': Env.TrashCanFire,
    'reed': Env.ReedPlant,

    // NPCs
    'npc-bartender': Chars.Bartender,
    'npc-smoker': Chars.AlleySmoker,
    'npc-dealer': Chars.DealerNPC,
};

export const getAssetComponent = (type: string): PropComponent | null => {
    return ASSET_MAP[type] || null;
};
