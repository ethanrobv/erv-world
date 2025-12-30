import { useGameStore } from '../../store/gameStore';
import { networkManager } from '../../network/NetworkManager';
import { RemotePlayer } from '../entities/RemotePlayer';

/**
 * Orchestrates the rendering of all remote players.
 */
export const PlayerManager = () => {
    // We subscribe to the list of known players (metadata)
    // Note: This relies on the WorldSnapshot or Peer Join events populating this list.
    // If you are using simple-peer tracking, we can also use useNetworkStore.peers
    const players = useGameStore((state) => state.players);
    const localId = networkManager.getSocketId();

    return (
        <>
            { players.map((player) => {
                if (player.id === localId) return null; // Don't render self

                return (
                    <RemotePlayer
                        key={ player.id }
                        id={ player.id }
                    />
                );
            }) }
        </>
    );
};
