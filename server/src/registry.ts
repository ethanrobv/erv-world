import { Room } from './types';

/**
 * In-memory storage for active game rooms.
 * Key: Room ID, Value: Room object
 */
const activeRooms = new Map<string, Room>();

/**
 * Registry service for managing ephemeral game rooms.
 */
export const Registry = {
    /**
     * Adds a new room to the registry.
     */
    addRoom: (room: Room): void => {
        activeRooms.set(room.id, room);
    },

    /**
     * Removes a room from the registry.
     */
    removeRoom: (roomId: string): boolean => {
        return activeRooms.delete(roomId);
    },

    /**
     * Returns all currently active rooms.
     */
    listRooms: (): Room[] => {
        return Array.from(activeRooms.values());
    },

    /**
     * Finds a room ID associated with a specific Host Peer ID.
     * Essential for cleaning up rooms when a host disconnects.
     */
    findRoomByHostId: (hostPeerId: string): string | undefined => {
        for (const [roomId, room] of activeRooms.entries()) {
            if (room.hostPeerId === hostPeerId) {
                return roomId;
            }
        }
        return undefined;
    },
};
