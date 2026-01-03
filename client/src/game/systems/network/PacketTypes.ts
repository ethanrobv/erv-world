/**
 * Defines the structure of data packets sent over the peer-to-peer network.
 */

export enum PacketType {
    PLAYER_MOVE = 'MOVE',
    WARP_INIT = 'WARP',
    SYNC_REQUEST = 'SYNC_REQ',
    SYNC_RESPONSE = 'SYNC_RES',
    PLAYER_LEAVE = 'LEAVE'
}

export interface BasePacket {
    type: PacketType;
    senderId?: string; // Optional because it is attached automatically by the NetworkManager before sending
}

/**
 * Packet sent when a player moves or updates their animation state.
 * Includes identifying information (username), explicit facing direction,
 * and the current planet ID to allow filtering of cross-planet ghosts.
 */
export interface PlayerMovePacket extends BasePacket {
    type: PacketType.PLAYER_MOVE;
    x: number;
    y: number;
    anim: string;
    direction: 'up' | 'down' | 'left' | 'right';
    planetId: string; // Critical for scene filtering
    username: string;
}

/**
 * Packet sent by the Host to initiate a scene change (warp).
 */
export interface WarpPacket extends BasePacket {
    type: PacketType.WARP_INIT;
    planetId: string;
}

/**
 * Sent by a Client immediately upon connecting.
 * Requests the current world state (Seed, Players, Planet) from the Host.
 */
export interface SyncRequestPacket extends BasePacket {
    type: PacketType.SYNC_REQUEST;
}

/**
 * Sent by the Host in response to a SyncRequest.
 * Contains all data needed to "hydrate" the client's world to match the Host.
 */
export interface SyncResponsePacket extends BasePacket {
    type: PacketType.SYNC_RESPONSE;
    seed: string;
    currentPlanet: string;
    players: {
        id: string;
        username: string;
        x: number;
        y: number;
        anim: string;
        direction: 'up' | 'down' | 'left' | 'right';
        planetId: string;
    }[];
}

/**
 * Sent when a peer disconnects or leaves the session.
 */
export interface PlayerLeavePacket extends BasePacket {
    type: PacketType.PLAYER_LEAVE;
}

export type GamePacket = PlayerMovePacket | WarpPacket | SyncRequestPacket | SyncResponsePacket | PlayerLeavePacket;
