import { createSignal, Show, type Component, createMemo } from 'solid-js';

import { audioEngine, audioLoadError, initializeAudio, isAudioReady } from './core/audio/audio-context';
import { inputManager } from './core/audio/input-manager';
import { project, ProjectActions } from './store/project';

import { ArrangementView } from './components/ArrangementView/ArrangementView';
import { DeviceRack } from './components/DeviceRack/DeviceRack';
import { PianoRoll } from './components/PianoRoll/PianoRoll';
import { TransportBar } from './components/TransportBar';
import { VirtualKeyboard } from './components/VirtualKeyboard/VirtualKeyboard';
import { Window } from './components/Window';

/**
 * The main entry point for the Digital Audio Workstation application.
 * Orchestrates the initialization of the audio engine, scheduler, and input systems.
 * Manages the high-level layout of floating windows and global transport controls.
 */
const DawApp: Component = () => {
    const [loadStatus, setLoadStatus] = createSignal('');

    /**
     * Derives the window title for the Piano Roll based on selection.
     */
    const pianoRollTitle = createMemo(() => {
        if (!project.selectedClipId) return 'Piano Roll';
        const clip = project.clips[project.selectedClipId];
        return clip ? `Piano Roll - ${clip.name}` : 'Piano Roll';
    });

    /**
     * Initializes the WebAssembly audio engine and subsystem dependencies.
     * Must be triggered by a user interaction to satisfy browser autoplay policies.
     */
    const handleInit = async () => {
        setLoadStatus('Initializing Audio Engine...');

        await initializeAudio();

        if (isAudioReady()) {
            try {
                setLoadStatus('Connecting Input...');
                await inputManager.init();

                setLoadStatus('Starting Scheduler...');

                // Initialize a default track if the project is empty
                if (project.tracks.length === 0) {
                    ProjectActions.addTrack();
                }
            } catch (e) {
                console.error('Subsystem Initialization Failed:', e);
            }
        }

        setLoadStatus('');
    };

    /**
     * Handles parameter changes from the Device Rack and routes them to the Audio Engine.
     */
    const handleParamChange = (channelIdx: number, paramId: number, val: number) => {
        if (!isAudioReady()) return;

        const track = project.tracks.find((t) => t.channelIndex === channelIdx);
        if (!track) return;

        // Route System Parameters (90+) vs Plugin Parameters
        if (paramId >= 90) {
            if (paramId === 99) ProjectActions.updateTrackParam(track.id, 'volume', val);
            if (paramId === 98) ProjectActions.updateTrackParam(track.id, 'pan', val);
            audioEngine.sendParam(channelIdx, paramId, val);
        } else {
            ProjectActions.updatePluginParam(track.id, paramId, val);
            audioEngine.sendParam(channelIdx, paramId, val);
        }
    };

    return (
        <div class="bg-bg-base text-[#eee] font-sans overflow-hidden relative selection:bg-blue-500 selection:text-white h-screen w-screen">
            {/* Initialization Overlay */}
            <Show when={!isAudioReady()}>
                <div class="absolute inset-0 z-9999 bg-[#050505] flex flex-col items-center justify-center">
                    <div class="p-8 border border-[#333] bg-[#111] rounded-lg shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full">
                        <Show
                            when={!audioLoadError()}
                            fallback={
                                <div class="text-red-500 font-mono text-xs bg-red-900/20 p-3 rounded border border-red-900 w-full text-center">
                                    {audioLoadError()}
                                </div>
                            }
                        >
                            <button
                                class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-[0_4px_12px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider text-xs"
                                onClick={handleInit}
                                disabled={loadStatus() !== ''}
                            >
                                {loadStatus() || 'Initialize Audio'}
                            </button>
                        </Show>
                    </div>
                </div>
            </Show>

            <TransportBar />

            {/* Desktop Surface */}
            <div class="absolute inset-0 top-18 bg-[#111] z-0">
                <div
                    class="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{
                        'background-image':
                            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                        'background-size': '40px 40px',
                    }}
                ></div>

                <Window id="arrangement">
                    <ArrangementView />
                </Window>

                <Window id="pianoRoll" title={pianoRollTitle()}>
                    <PianoRoll clipId={project.selectedClipId} />
                </Window>

                <Window id="deviceRack">
                    <DeviceRack onParamChange={handleParamChange} />
                </Window>

                <Window id="keyboard">
                    <VirtualKeyboard />
                </Window>
            </div>
        </div>
    );
};

export default DawApp;
