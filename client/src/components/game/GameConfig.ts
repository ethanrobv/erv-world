import React from "react";
import type { DataConnection } from "peerjs";

export const MOVEMENT_SPEED = 7;
export const ROTATION_SPEED = 12;

export const FADE_OUT_DURATION = 400;
export const FADE_IN_DURATION = 400;

export type GameState = 'menu' | 'playing';
export type SceneType = 'bar' | 'alley';
export type PlayerPose = 'idle' | 'sit' | 'fishing';

export type Card = {
    suit: '♠' | '♥' | '♣' | '♦';
    rank: string;
    value: number;
    isHidden?: boolean;
};

// --- ACTIVITY SYSTEM TYPES ---

export type ActivityType = 'blackjack' | 'fishing';

// 1. BLACKJACK STATE (Unchanged logic, just specific type)
export type BJSeatState = {
    peerId: string | null;
    hand: Card[];
    bet: number;
    status: 'empty' | 'betting' | 'playing' | 'stand' | 'bust' | 'won' | 'lost' | 'push' | 'blackjack' | 'waiting';
};

export interface BJGameState {
    type: 'blackjack';
    phase: 'idle' | 'betting' | 'dealing' | 'playing' | 'dealerTurn' | 'payout';
    dealerHand: Card[];
    seats: BJSeatState[];
    activeSeatIndex: number;
    timer: number;
}

// 2. FISHING STATE (Refactored for Multiplayer)
export type FishType = {
    id: string;
    name: string;
    baseWeight: number;
    stdDev: number;
    rarity: number;
    conditions: { time?: 'day' | 'night'; weather?: 'clear' | 'rain' };
};

export type CatchRecord = { count: number; maxWeight: number };

// New: Individual Fishing Seat
export type FishingSeat = {
    peerId: string;
    phase: 'idle' | 'casting' | 'waiting' | 'bitten' | 'reeling' | 'caught' | 'lost';
    timer: number;       // Individual bite/reel timer
    biteStrength: number; // Individual bobber physics
    lastCatch: { fishId: string; weight: number } | null;
};

export interface FishingState {
    type: 'fishing';
    // Global Stats (Shared)
    catchLog: Record<string, CatchRecord>;
    env: { isDay: boolean; isRaining: boolean };
    // Participants
    seats: FishingSeat[];
}

// 3. COMPOSITE WORLD STATE
// This allows both activities to run concurrently
export interface ActivityState {
    blackjack: BJGameState;
    fishing: FishingState;
}

export type RemotePlayerState = {
    pos: [number, number, number];
    rot: number;
    pose: PlayerPose;
    interaction: string | null;
    scene: SceneType;
    isFading?: boolean;
    lastSeen?: number;
    name?: string;
    activity?: { type: ActivityType; phase: string };
    meta?: any;
};

export type Barrier = {
    readonly x: readonly [number, number];
    readonly z: readonly [number, number];
};

export type PortalDef = {
    position: [number, number, number];
    targetScene: SceneType;
    spawnPosition: [number, number, number];
    spawnRotation: number;
};

export type InteractionBehavior =
    | {
    type: 'station';
    anchorPosition: [number, number, number];
    anchorRotation: number;
    exitPosition: [number, number, number];
    pose: PlayerPose;
    exitLabel?: string;
}
    | {
    type: 'seat';
    seatIndex: number;
    activity: ActivityType;
    anchorPosition: [number, number, number];
    anchorRotation: number;
    exitPosition: [number, number, number];
}
    | {
    type: 'trigger';
    autoReset?: boolean;
};

export type Interactable = {
    id: string;
    type: string;
    label: string;
    position: [number, number, number];
    rotation?: [number, number, number];
    interactionRadius: number;
    behavior?: InteractionBehavior;
    [key: string]: any;
};

export type LevelData = {
    barriers: Barrier[];
    portals: PortalDef[];
    interactables: Interactable[];
    staticProps?: Interactable[];
    waterZones?: { x: number[], z: number[] }[];
};

export type ActivityContext = {
    peerId: string | null;
    isHost: boolean;
    money: number;
    setMoney: React.Dispatch<React.SetStateAction<number>>;
    addAlert: (msg: string) => void;
    gameAssets: React.RefObject<any>;
    // Updated: Dispatch now implies targeting the strategy that called it
    dispatch: (action: string, payload?: any) => void;
    connections: DataConnection[];
};

export interface ActivityStrategy<T> {
    reducer: (
        prev: T,
        action: string,
        payload: any,
        assets: React.RefObject<any>
    ) => T;

    onAction?: (
        action: string,
        payload: any,
        ctx: ActivityContext
    ) => boolean;

    onStateChange?: (
        prev: T,
        current: T,
        ctx: ActivityContext
    ) => void;

    onTick?: (
        state: T,
        ctx: ActivityContext
    ) => void;

    onMount?: (
        state: T, // Receives global state to extract its slice if needed
        ctx: ActivityContext
    ) => T;
}
