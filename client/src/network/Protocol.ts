/**
 * Lightweight tuple representation of 3D coordinates [x, y, z].
 */
export type Vector3 = [number, number, number];

/**
 * Lightweight tuple representation of a Quaternion [x, y, z, w].
 */
export type Quaternion = [number, number, number, number];

/**
 * Network message type constants.
 * Mapped to integers to minimize binary payload size.
 */
export const PacketType = {
    // Handshake (Reliable)
    JOIN_REQUEST: 0,
    WORLD_SNAPSHOT: 1,
    LOBBY_STATE: 9, // Syncs Lobby info (like Heir ID) to all peers

    // Game Loop (Unreliable/High Frequency)
    PLAYER_UPDATE: 2,
    OBJECT_UPDATE: 3,
    WORLD_TICK: 4,

    // Events (Reliable)
    GLOBAL_STATE: 5,
    INTERACTION_REQUEST: 6,
    INTERACTION_RESPONSE: 7,
    OBJECT_CLAIM: 8,
    DISCONNECT: 10, // Polite signal that a peer is leaving intentionally
} as const;

export const InteractionType = {
    PHYSICS_CLAIM: 0, // Requesting authority over a RigidBody
    LOGIC_REQUEST: 1  // Requesting a game state change (e.g. Minigame Join)
} as const;

export type InteractionType = typeof InteractionType[keyof typeof InteractionType];

// --- PAYLOADS ---

export interface JoinRequestPayload {
    clientId: string;
    username: string;
}

export interface PlayerState {
    id: string;
    username: string;
    p: Vector3;
    q: Quaternion;
}

export interface WorldSnapshotPayload {
    gameTime: number;
    weather: number;
    season: number;
    players: PlayerState[];
}

/**
 * Sent by the Host to inform clients of lobby hierarchy changes.
 */
export interface LobbyStatePayload {
    /** The Socket ID of the designated backup host (Heir). */
    heirId: string | null;
}

/**
 * High-frequency update of player state.
 * Variable names are single-letter to reduce bandwidth overhead.
 */
export interface PlayerUpdatePayload {
    /** The Socket ID of the player. */
    id: string;
    /** Position [x, y, z] */
    p: Vector3;
    /** Rotation Quaternion [x, y, z, w] */
    q: Quaternion;
    /** Linear Velocity [x, y, z] */
    v: Vector3;
    /** Animation State ID (0=Idle, 1=Run, 2=Jump, 3=Fall) */
    a: number;
}

/**
 * High-frequency update of a physics object.
 */
export interface ObjectUpdatePayload {
    id: string;
    p: Vector3;
    q: Quaternion;
    v: Vector3;
}

export interface WorldTickPayload {
    t: number;
    p: PlayerUpdatePayload[];
    o: ObjectUpdatePayload[];
}

export interface GlobalStatePayload {
    type: number; // 0=WEATHER, 1=TIME, 2=SEASON
    val: number;
}

export interface InteractionRequestPayload {
    netId: string;
    type: InteractionType;
    data?: Record<string, unknown>;
}

export interface ObjectClaimPayload {
    netId: string;
    ownerId: string;
}

// --- PACKET UNION ---

export type GamePacket =
    | { t: typeof PacketType.JOIN_REQUEST; d: JoinRequestPayload }
    | { t: typeof PacketType.WORLD_SNAPSHOT; d: WorldSnapshotPayload }
    | { t: typeof PacketType.LOBBY_STATE; d: LobbyStatePayload }
    | { t: typeof PacketType.PLAYER_UPDATE; d: PlayerUpdatePayload }
    | { t: typeof PacketType.OBJECT_UPDATE; d: ObjectUpdatePayload }
    | { t: typeof PacketType.WORLD_TICK; d: WorldTickPayload }
    | { t: typeof PacketType.GLOBAL_STATE; d: GlobalStatePayload }
    | { t: typeof PacketType.INTERACTION_REQUEST; d: InteractionRequestPayload }
    | { t: typeof PacketType.OBJECT_CLAIM; d: ObjectClaimPayload }
    | { t: typeof PacketType.DISCONNECT; d: null };
