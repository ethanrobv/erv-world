import { useState } from 'react';
import { useNetworkStore } from '../store/networkStore';
import { networkManager } from '../network/NetworkManager';

interface MainMenuProps {
    /** Called when the user wants to close the menu and return to the game. */
    onResume: () => void;
}

/**
 * The primary overlay interface for Multiplayer Session Management.
 * Visible when the game is paused (unfocused/ESC).
 */
export const MainMenu = ({ onResume }: MainMenuProps) => {
    // Global State
    const { roomCode, role, isConnectedToSignal, peers } = useNetworkStore();

    // Local UI State
    const [joinInput, setJoinInput] = useState('');
    const [isCopying, setIsCopying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Sync input with store if needed, or just keep local
    const handleCreateRoom = async () => {
        setIsLoading(true);
        // Generate a random 4-char code for UX (Real app might get this from server)
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        await networkManager.createRoom(code);
        setIsLoading(false);
    };

    const handleJoinRoom = () => {
        if (!joinInput) return;
        setIsLoading(true);
        networkManager.joinRoom(joinInput.toUpperCase());
        setIsLoading(false);
    };

    const copyCodeToClipboard = () => {
        if (roomCode) {
            navigator.clipboard.writeText(roomCode);
            setIsCopying(true);
            setTimeout(() => setIsCopying(false), 2000);
        }
    };

    return (
        // [UPDATED] Lighter backdrop (bg-black/20) for better visibility of the game behind
        <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] transition-all duration-300">
            <div
                className="w-full max-w-md bg-panel/95 border-2 border-accent rounded-xl shadow-2xl p-6 flex flex-col gap-6 relative overflow-hidden backdrop-blur-md">

                {/* HEADER */ }
                <div className="text-center border-b border-muted/20 pb-4">
                    <h2 className="text-2xl font-black text-primary tracking-wider uppercase">
                        Game Paused
                    </h2>
                    <p className="text-muted text-sm mt-1">
                        { isConnectedToSignal ? 'Connected to Signal Server' : 'Offline Mode' }
                    </p>
                </div>

                {/* CONTENT: SWITCH BASED ON ROLE */ }
                <div className="flex flex-col gap-4">

                    {/* SCENARIO A: NOT IN A LOBBY */ }
                    { role === 'NONE' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={ handleCreateRoom }
                                    disabled={ isLoading || !isConnectedToSignal }
                                    className="flex flex-col items-center justify-center p-4 bg-main hover:bg-accent/10 border border-muted/30 hover:border-accent rounded-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {/* [UPDATED] Removed Emoji */ }
                                    <span className="font-bold text-primary">Host Game</span>
                                </button>

                                <div className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        placeholder="CODE"
                                        maxLength={ 4 }
                                        value={ joinInput }
                                        onChange={ (e) => setJoinInput(e.target.value.toUpperCase()) }
                                        className="w-full p-2 bg-main border border-muted/30 rounded text-center font-mono text-lg text-primary focus:border-accent outline-none"
                                    />
                                    <button
                                        onClick={ handleJoinRoom }
                                        disabled={ isLoading || !isConnectedToSignal || joinInput.length < 4 }
                                        className="flex-1 bg-primary text-main font-bold rounded py-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Join
                                    </button>
                                </div>
                            </div>
                        </>
                    ) }

                    {/* SCENARIO B: IN A LOBBY */ }
                    { role !== 'NONE' && (
                        <div className="flex flex-col gap-4 bg-main/50 p-4 rounded border border-accent/30">
                            <div className="flex justify-between items-center">
                                <span className="text-muted font-medium">Lobby Code:</span>
                                <button
                                    onClick={ copyCodeToClipboard }
                                    className="font-mono text-2xl font-bold text-accent hover:text-primary transition-colors cursor-pointer flex items-center gap-2"
                                    title="Click to Copy"
                                >
                                    { roomCode }
                                    <span className="text-xs bg-accent text-main px-2 py-0.5 rounded opacity-80">
                                        { isCopying ? 'COPIED' : 'COPY' }
                                    </span>
                                </button>
                            </div>

                            <div className="h-px bg-muted/20 w-full"/>

                            <div className="flex justify-between items-center">
                                <span className="text-muted">Status:</span>
                                <span className="font-bold text-primary">
                                    { role === 'HOST' ? 'Hosting' : 'Client' }
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-muted">Peers:</span>
                                <span className="font-bold text-accent">
                                    { peers.length } connected
                                </span>
                            </div>
                        </div>
                    ) }

                </div>

                {/* FOOTER ACTION */ }
                <button
                    onClick={ onResume }
                    className="w-full py-3 mt-2 bg-accent hover:bg-accent/90 text-white font-bold tracking-widest uppercase rounded shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                    Resume Game
                </button>

            </div>
        </div>
    );
};
