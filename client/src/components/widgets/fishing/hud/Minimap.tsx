'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '@/lib/stores/useGameStore';
import { NetworkManager } from '@/game/systems/network/NetworkManager';
import { PacketType, PlayerMovePacket } from '@/game/systems/network/PacketTypes';
import { GameEvents } from '@/game/core/GameEvents';
import { MapGenerator } from '@/game/systems/world/MapGenerator';
import { TILE_IDS } from '@/game/constants/TileConfig';

type MapViewMode = 'solar' | 'surface';

interface MapBlip {
    id: string;
    x: number;
    y: number;
    color: string;
    isLocal: boolean;
}

/**
 * Navigation Widget component.
 * Provides two views:
 * 1. Solar System: For warping between planets.
 * 2. Surface: Local minimap showing real-time player positions on the generated terrain.
 */
export default function Minimap() {
    const [viewMode, setViewMode] = useState<MapViewMode>('solar');
    const [blips, setBlips] = useState<Record<string, MapBlip>>({});

    // UI State for the "Holographic" confirmation popup
    const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

    const currentPlanet = useGameStore(s => s.currentPlanet);
    const isHost = useGameStore(s => s.isHost);
    const worldSeed = useGameStore(s => s.worldSeed);

    const blipsRef = useRef<Record<string, MapBlip>>({});
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Hardcoded Map Constants (Must match BasePlanetScene settings)
    const MAP_TILES_W = 25;
    const MAP_TILES_H = 20;
    const TILE_SIZE = 32;
    const MAP_WIDTH = MAP_TILES_W * TILE_SIZE;
    const MAP_HEIGHT = MAP_TILES_H * TILE_SIZE;

    // --- 1. Real-time Player Tracking ---
    useEffect(() => {
        const onLocalMove = (data: { x: number, y: number }) => {
            const id = 'local-player';
            blipsRef.current[id] = { id, x: data.x, y: data.y, color: '#facc15', isLocal: true };
            setBlips({ ...blipsRef.current });
        };

        const onRemoteMove = (pkt: PlayerMovePacket) => {
            if (!pkt.senderId) return;
            blipsRef.current[pkt.senderId] = { id: pkt.senderId, x: pkt.x, y: pkt.y, color: '#4ade80', isLocal: false };
            setBlips({ ...blipsRef.current });
        };

        const onPlayerLeave = (data: { id: string }) => {
            if (blipsRef.current[data.id]) {
                delete blipsRef.current[data.id];
                setBlips({ ...blipsRef.current });
            }
        };

        GameEvents.on('LOCAL_MOVE', onLocalMove);
        GameEvents.on('REMOTE_MOVE', onRemoteMove);
        GameEvents.on('PLAYER_LEAVE', onPlayerLeave);

        return () => {
            GameEvents.off('LOCAL_MOVE', onLocalMove);
            GameEvents.off('REMOTE_MOVE', onRemoteMove);
            GameEvents.off('PLAYER_LEAVE', onPlayerLeave);
        };
    }, []);

    // --- 2. Terrain Rendering ---
    useEffect(() => {
        if (viewMode !== 'surface' || !canvasRef.current || !worldSeed) return;

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Generate map data deterministically using the shared seed
        const mapData = MapGenerator.generateData(
            worldSeed,
            MAP_TILES_W,
            MAP_TILES_H,
            currentPlanet as 'earth' | 'mars'
        );

        // Scale grid to fit canvas resolution
        const canvasW = canvasRef.current.width;
        const canvasH = canvasRef.current.height;
        const tileW = canvasW / MAP_TILES_W;
        const tileH = canvasH / MAP_TILES_H;

        ctx.clearRect(0, 0, canvasW, canvasH);

        for (let y = 0; y < MAP_TILES_H; y++) {
            for (let x = 0; x < MAP_TILES_W; x++) {
                const tileId = mapData[y][x];

                // Determine color based on tile type and planet
                if (tileId >= TILE_IDS.WATER_A && tileId <= TILE_IDS.WATER_D) {
                    ctx.fillStyle = '#1e3a8a'; // Deep Blue
                } else if (currentPlanet === 'mars') {
                    ctx.fillStyle = '#7f1d1d'; // Reddish Brown
                } else {
                    ctx.fillStyle = '#14532d'; // Dark Green
                }

                // Draw tile with slight overlap (+0.5) to prevent sub-pixel gaps
                ctx.fillRect(x * tileW, y * tileH, tileW + 0.5, tileH + 0.5);
            }
        }
    }, [viewMode, worldSeed, currentPlanet]);

    const handlePlanetClick = (planet: string) => {
        if (planet === currentPlanet) return;
        if (!isHost) return;
        setSelectedPlanet(planet);
    };

    const confirmWarp = () => {
        if (!selectedPlanet) return;

        NetworkManager.getInstance().send({
            type: PacketType.WARP_INIT,
            planetId: selectedPlanet
        });

        GameEvents.emit('WARP_COMMAND', { planetId: selectedPlanet });
        useGameStore.getState().setCurrentPlanet(selectedPlanet);

        setSelectedPlanet(null);
    };

    return (
        <div className="flex flex-col gap-2 w-64 select-none">
            {/* Tab Switcher */ }
            <div className="flex border-b border-gray-600 mb-2 bg-black">
                <button
                    tabIndex={ -1 }
                    onClick={ () => setViewMode('solar') }
                    className={ `flex-1 text-[10px] py-1 font-bold transition-colors outline-none focus:outline-none ${ viewMode === 'solar' ? 'bg-cyan-900 text-cyan-100' : 'text-gray-500 hover:text-gray-300' }` }
                >
                    SOLAR SYSTEM
                </button>
                <button
                    tabIndex={ -1 }
                    onClick={ () => setViewMode('surface') }
                    className={ `flex-1 text-[10px] py-1 font-bold transition-colors outline-none focus:outline-none ${ viewMode === 'surface' ? 'bg-cyan-900 text-cyan-100' : 'text-gray-500 hover:text-gray-300' }` }
                >
                    SURFACE SCAN
                </button>
            </div>

            {/* Main Viewport */ }
            <div className="relative w-full aspect-square bg-black border border-gray-600 overflow-hidden group">

                {/* --- SOLAR SYSTEM VIEW --- */ }
                { viewMode === 'solar' && (
                    <div className="w-full h-full relative bg-slate-950">
                        {/* Background Stars */ }
                        <div className="absolute inset-0 opacity-50"
                             style={ {
                                 backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                                 backgroundSize: '50px 50px'
                             } }></div>

                        {/* Sun */ }
                        <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-400 rounded-full shadow-[0_0_50px_rgba(253,224,71,0.5)] z-10 pointer-events-none"></div>

                        {/* Earth Orbit (Pointer Events None to allow clicking through to Mars/Background) */ }
                        <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] border border-blue-900/50 rounded-full animate-[spin_60s_linear_infinite] pointer-events-none">
                            <button
                                tabIndex={ -1 }
                                onClick={ () => handlePlanetClick('earth') }
                                disabled={ !isHost }
                                className={ `
                                    absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full transition-all z-20 pointer-events-auto outline-none focus:outline-none
                                    ${ currentPlanet === 'earth' ? 'bg-blue-400 ring-4 ring-blue-500/30' : 'bg-blue-700 hover:scale-125 hover:bg-blue-400' }
                                    ${ !isHost ? 'cursor-not-allowed opacity-50' : 'cursor-pointer' }
                                ` }
                                style={ { transformOrigin: 'center center' } }
                                title="Earth Sector"
                            />
                        </div>

                        {/* Mars Orbit */ }
                        <div
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] border border-red-900/50 rounded-full animate-[spin_90s_linear_infinite] pointer-events-none">
                            <button
                                tabIndex={ -1 }
                                onClick={ () => handlePlanetClick('mars') }
                                disabled={ !isHost }
                                className={ `
                                    absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-all z-20 pointer-events-auto outline-none focus:outline-none
                                    ${ currentPlanet === 'mars' ? 'bg-red-400 ring-4 ring-red-500/30' : 'bg-red-800 hover:scale-125 hover:bg-red-500' }
                                    ${ !isHost ? 'cursor-not-allowed opacity-50' : 'cursor-pointer' }
                                ` }
                                title="Mars Sector"
                            />
                        </div>
                    </div>
                ) }

                {/* --- SURFACE SCAN VIEW --- */ }
                { viewMode === 'surface' && (
                    <div className="w-full h-full relative bg-black flex items-center justify-center">
                        {/* Aspect Ratio Container
                            Matches Game World Ratio (25/20 = 1.25) to prevent distortion
                        */ }
                        <div className="relative w-full aspect-[1.25] bg-black">
                            <canvas
                                ref={ canvasRef }
                                width={ MAP_TILES_W }
                                height={ MAP_TILES_H }
                                className="absolute inset-0 w-full h-full opacity-80"
                                style={ { imageRendering: 'pixelated' } }
                            />

                            {/* Scanline Overlay */ }
                            <div
                                className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,_rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-20"></div>

                            {/* Player Blips */ }
                            { Object.values(blips).map(blip => (
                                <div
                                    key={ blip.id }
                                    className="absolute w-2 h-2 rounded-full -translate-x-1/2 -translate-y-1/2 z-20 border border-black shadow-sm transition-all duration-75"
                                    style={ {
                                        backgroundColor: blip.color,
                                        left: `${ (blip.x / MAP_WIDTH) * 100 }%`,
                                        top: `${ (blip.y / MAP_HEIGHT) * 100 }%`
                                    } }
                                />
                            )) }
                        </div>
                    </div>
                ) }

                {/* --- HOLOGRAPHIC CONFIRMATION POPUP --- */ }
                { selectedPlanet && (
                    <div
                        className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                        {/* 3D Hologram Effect */ }
                        <div className="relative w-24 h-24 mb-4 perspective-[1000px] pointer-events-none">
                            {/* Inner Rotating Sphere (Wireframe) */ }
                            <div
                                className="w-full h-full rounded-full border-2 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.4)] animate-[spin_10s_linear_infinite] flex items-center justify-center transform-style-3d">
                                {/* Latitude Lines */ }
                                <div
                                    className="absolute w-full h-[70%] border-t border-b border-cyan-400/20 rounded-full"></div>
                                <div
                                    className="absolute w-[70%] h-full border-l border-r border-cyan-400/20 rounded-full"></div>
                                {/* Diagonal Orbit Ring */ }
                                <div
                                    className="absolute w-[120%] h-[120%] border border-cyan-300/40 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
                            </div>
                        </div>

                        <div className="text-center mb-4 space-y-1">
                            <span
                                className="text-[10px] text-cyan-600 font-mono tracking-widest block">DESTINATION</span>
                            <span
                                className="text-xl font-bold text-white uppercase tracking-wider block text-shadow-cyan">
                                { selectedPlanet }
                            </span>
                        </div>

                        <div className="flex gap-2 w-full">
                            <button
                                tabIndex={ -1 }
                                onClick={ () => setSelectedPlanet(null) }
                                className="flex-1 bg-transparent border border-red-500/50 text-red-400 text-[10px] py-2 hover:bg-red-900/20 font-mono outline-none focus:outline-none"
                            >
                                ABORT
                            </button>
                            <button
                                tabIndex={ -1 }
                                onClick={ confirmWarp }
                                className="flex-1 bg-cyan-600/20 border border-cyan-500 text-cyan-300 text-[10px] py-2 hover:bg-cyan-500 hover:text-black font-bold font-mono shadow-[0_0_10px_rgba(34,211,238,0.2)] outline-none focus:outline-none"
                            >
                                WARP
                            </button>
                        </div>
                    </div>
                ) }
            </div>

            {/* Readout Footer */ }
            <div
                className="flex justify-between items-center text-[10px] text-gray-500 font-mono border-t border-gray-700 pt-2">
                <span className="text-yellow-500/80">SECTOR: { currentPlanet.toUpperCase() }</span>
                <span>{ viewMode === 'surface' ? 'LIDAR ACTIVE' : 'ORBITAL LINK' }</span>
            </div>
        </div>
    );
}
