import { type Component, Show, createSignal, For, onCleanup } from 'solid-js';
import { project, setProject, ProjectActions } from '../store/project';
import { windowStore, WindowActions } from '../store/window-manager';
import { currentChord } from '../core/audio/input-manager';
import { DragValue } from '../../../shared/ui/DragValue';
import { history } from '../core/logic/history';

const GRID_OPTIONS = [
    { label: '1/4', value: 1.0 },
    { label: '1/4T', value: 2 / 3 },
    { label: '1/8', value: 0.5 },
    { label: '1/8T', value: 1 / 3 },
    { label: '1/16', value: 0.25 },
    { label: '1/16T', value: 1 / 6 },
    { label: '1/32', value: 0.125 },
];

const ROOT_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CONTAINER_HEIGHT = 'h-10';
const VALUE_TEXT_CLASS = 'text-[#e5e5e5] font-mono font-bold text-[16px] leading-none';
const LABEL_TEXT_CLASS =
    'text-[10px] font-bold text-[#555] group-hover:text-[#888] tracking-widest uppercase select-none transition-colors leading-none';

/**
 * Formats a beat position into MM:SS.ms format based on current tempo.
 */
const formatTime = (beats: number, tempo: number): string => {
    if (tempo <= 0) return '00:00.00';
    const totalSeconds = beats / (tempo / 60);
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    const ms = Math.floor((totalSeconds % 1) * 100);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(m)}:${pad(s)}.${pad(ms)}`;
};

/**
 * A UI container for transport values with a label underneath.
 */
const DisplayBlock: Component<{
    label: string;
    width: string;
    border?: boolean;
    zIndex?: string;
    children: any;
    className?: string;
}> = (props) => (
    <div
        class={`flex flex-col justify-center h-full relative group hover:bg-[#1a1a1a] transition-colors shrink-0 
        ${props.width} 
        ${props.border ? 'border-r border-[#222]' : ''} 
        ${props.zIndex || 'z-0'} 
        ${props.className || ''}`}
    >
        <div class="h-6 w-full flex items-end justify-center relative pb-0.5">{props.children}</div>
        <div class="h-3 w-full flex items-start justify-center mt-0.5">
            <span class={LABEL_TEXT_CLASS}>{props.label}</span>
        </div>
    </div>
);

interface DropdownProps {
    value: string;
    options: { label: string; value: any }[];
    onSelect: (val: any) => void;
    title?: string;
    widthClass?: string;
    align?: 'center' | 'end';
    buttonClass?: string;
}

/**
 * A generic dropdown menu component.
 */
const Dropdown: Component<DropdownProps> = (props) => {
    const [isOpen, setIsOpen] = createSignal(false);
    const [ref, setRef] = createSignal<HTMLDivElement>();

    const toggle = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(!isOpen());
    };

    const handleSelect = (val: any) => {
        props.onSelect(val);
        setIsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
        const el = ref();
        if (isOpen() && el && !el.contains(e.target as Node)) {
            setIsOpen(false);
        }
    };

    window.addEventListener('mousedown', handleClickOutside);
    onCleanup(() => window.removeEventListener('mousedown', handleClickOutside));

    const alignClass = props.align === 'center' ? 'items-center' : 'items-end';

    return (
        <div class={`relative flex ${alignClass} justify-center h-full ${props.widthClass || 'w-full'}`} ref={setRef}>
            <button
                class={`flex ${alignClass} justify-center w-full h-full transition-colors tabular-nums rounded-sm ${props.buttonClass || ''}`}
                onClick={toggle}
                title={props.title}
            >
                {props.value}
            </button>

            <Show when={isOpen()}>
                <div class="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-24 bg-[#1a1a1a] border border-[#333] rounded shadow-xl z-1000 max-h-60 overflow-y-auto py-1">
                    <For each={props.options}>
                        {(opt) => (
                            <button
                                class="w-full text-left px-3 py-1.5 text-xs font-bold text-neutral-400 hover:text-white hover:bg-[#2a2a2a] transition-colors flex items-center justify-between"
                                onClick={() => handleSelect(opt.value)}
                            >
                                <span>{opt.label}</span>
                                <Show when={opt.label === props.value}>
                                    <div class="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                </Show>
                            </button>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
};

const IconStop = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
);
const IconPlay = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
    </svg>
);
const IconPause = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
);
const IconRecord = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="9" />
    </svg>
);
const IconGrid = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 20H4v-4h4v4zm0-6H4v-4h4v4zm0-6H4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4zm6 12h-4v-4h4v4zm0-6h-4v-4h4v4zm0-6h-4V4h4v4z" />
    </svg>
);
const IconMetronome = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l-9.5 19h19L12 2zm0 3.8l6.1 12.2H5.9L12 5.8zM11 10h2v5h-2v-5zm0 7h2v2h-2v-2z" />
    </svg>
);

const getWindowBtnClass = (isOpen: boolean) =>
    `h-full px-4 text-xs font-bold uppercase tracking-wider rounded-sm transition-all border flex items-center justify-center 
    ${
        isOpen
            ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
            : 'text-neutral-400 border-transparent hover:text-white hover:bg-[#2a2a2a]'
    }`;

/**
 * The main playback control bar.
 */
export const TransportBar: Component = () => {
    const currentGridLabel = () =>
        GRID_OPTIONS.find((opt) => Math.abs(opt.value - project.view.gridSize) < 0.001)?.label || '1/16';

    const cycleScale = () => {
        const isMajor = project.transport.keySignature.scale === 'Major';
        ProjectActions.setKeySignature(project.transport.keySignature.root, isMajor ? 'Minor' : 'Major');
    };

    const toggleMetronome = () => {
        const current = project.transport.metronome;
        ProjectActions.setMetronome(!current.isActive, current.volume);
    };

    const currentBar = () => Math.floor(project.transport.position / project.transport.timeSignature.numerator) + 1;
    const currentBeat = () => Math.floor(project.transport.position % project.transport.timeSignature.numerator) + 1;
    const currentSixteenth = () => Math.floor(((project.transport.position % 1) * 4) % 4) + 1;

    // -- Transaction Wrappers for Drag Operations --

    const handleTempoDragStart = () => {
        const startVal = project.transport.tempo;
        // Start a transaction to group all subsequent drag updates
        history.beginTransaction('Change Tempo', () => ProjectActions.setTempo(startVal));
    };

    const handleTempoDragEnd = () => {
        const endVal = project.transport.tempo;
        // Commit the final value
        history.commitTransaction(() => ProjectActions.setTempo(endVal));
    };

    const handleNumDragStart = () => {
        const startVal = project.transport.timeSignature.numerator;
        const den = project.transport.timeSignature.denominator;
        history.beginTransaction('Change Time Sig Numerator', () => ProjectActions.setTimeSignature(startVal, den));
    };

    const handleNumDragEnd = () => {
        const endVal = project.transport.timeSignature.numerator;
        const den = project.transport.timeSignature.denominator;
        history.commitTransaction(() => ProjectActions.setTimeSignature(endVal, den));
    };

    const handleDenDragStart = () => {
        const num = project.transport.timeSignature.numerator;
        const startVal = project.transport.timeSignature.denominator;
        history.beginTransaction('Change Time Sig Denominator', () => ProjectActions.setTimeSignature(num, startVal));
    };

    const handleDenDragEnd = () => {
        const num = project.transport.timeSignature.numerator;
        const endVal = project.transport.timeSignature.denominator;
        history.commitTransaction(() => ProjectActions.setTimeSignature(num, endVal));
    };

    return (
        <div class="h-16 bg-[#141414] border-b border-[#050505] flex items-center justify-between px-6 shrink-0 z-100 select-none relative min-w-200">
            <div class="flex items-center gap-6 shrink-0">
                {/* Transport Controls */}
                <div
                    class={`flex items-center bg-[#0a0a0a] rounded p-0.5 gap-0.5 border border-[#222] ${CONTAINER_HEIGHT}`}
                >
                    <button
                        class="w-10 h-full flex items-center justify-center rounded-sm hover:bg-[#222] text-neutral-400 hover:text-white transition-colors"
                        onClick={() => ProjectActions.stop()}
                        title="Stop"
                    >
                        <IconStop />
                    </button>
                    <button
                        class={`w-12 h-full flex items-center justify-center rounded-sm transition-all ${
                            project.transport.isPlaying
                                ? 'bg-[#15803d] text-white'
                                : 'bg-transparent text-neutral-200 hover:bg-[#2a2a2a] hover:text-white'
                        }`}
                        onClick={() => ProjectActions.togglePlay()}
                        title="Play"
                    >
                        <Show when={project.transport.isPlaying} fallback={<IconPlay />}>
                            <IconPause />
                        </Show>
                    </button>
                    <button
                        class={`w-10 h-full flex items-center justify-center rounded-sm transition-all ${
                            project.transport.isRecording
                                ? 'bg-[#b91c1c] text-white animate-pulse'
                                : 'text-neutral-400 hover:text-red-500 hover:bg-[#222]'
                        }`}
                        onClick={() => ProjectActions.toggleRecord()}
                        title="Record"
                    >
                        <IconRecord />
                    </button>
                </div>

                {/* Grid & Metronome */}
                <div class="flex items-center gap-2">
                    <div
                        class={`flex items-center bg-[#0a0a0a] rounded border border-[#222] ${CONTAINER_HEIGHT} relative`}
                    >
                        <button
                            class={`h-full w-10 flex items-center justify-center rounded-l-sm transition-colors border-r border-[#222] ${
                                project.view.snapToGrid
                                    ? 'text-blue-400 bg-blue-900/10'
                                    : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                            onClick={() => ProjectActions.toggleSnap()}
                            title="Toggle Snap"
                        >
                            <IconGrid />
                        </button>
                        <div class="h-full flex items-center">
                            <Dropdown
                                value={currentGridLabel()}
                                options={GRID_OPTIONS}
                                onSelect={(val) => setProject('view', 'gridSize', val)}
                                title="Grid Size"
                                widthClass="w-14"
                                align="center"
                                buttonClass="text-xs font-bold text-neutral-400 hover:text-white"
                            />
                        </div>
                    </div>

                    <button
                        class={`h-10 w-10 flex items-center justify-center rounded border transition-colors ${
                            project.transport.metronome.isActive
                                ? 'border-yellow-600/50 bg-yellow-600/10 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]'
                                : 'border-[#222] bg-[#0a0a0a] text-neutral-500 hover:text-white hover:border-[#333]'
                        }`}
                        onClick={toggleMetronome}
                        title="Toggle Metronome"
                    >
                        <IconMetronome />
                    </button>
                </div>
            </div>

            <div class="flex-1"></div>

            {/* Main Display */}
            <div
                class={`flex items-center bg-[#0a0a0a] border border-[#222] rounded ${CONTAINER_HEIGHT} shrink-0 mx-4`}
            >
                <DisplayBlock label="TEMPO" width="w-24" border>
                    <DragValue
                        value={project.transport.tempo}
                        onChange={ProjectActions.setTempo}
                        onDragStart={handleTempoDragStart}
                        onDragEnd={handleTempoDragEnd}
                        min={20}
                        max={999}
                        format={(v) => Math.round(v).toString()}
                        className={VALUE_TEXT_CLASS}
                    />
                </DisplayBlock>

                <DisplayBlock label="SIGNATURE" width="w-24" border>
                    <div class="flex items-end gap-0.5">
                        <DragValue
                            value={project.transport.timeSignature.numerator}
                            onChange={(v) =>
                                ProjectActions.setTimeSignature(v, project.transport.timeSignature.denominator)
                            }
                            onDragStart={handleNumDragStart}
                            onDragEnd={handleNumDragEnd}
                            min={1}
                            max={32}
                            className={`${VALUE_TEXT_CLASS} text-blue-300 hover:text-white min-w-5 text-right`}
                        />
                        <span class={`${VALUE_TEXT_CLASS} text-[#444] text-[13px] relative -top-px`}>/</span>
                        <DragValue
                            value={project.transport.timeSignature.denominator}
                            onChange={(v) =>
                                ProjectActions.setTimeSignature(project.transport.timeSignature.numerator, v)
                            }
                            onDragStart={handleDenDragStart}
                            onDragEnd={handleDenDragEnd}
                            min={1}
                            max={32}
                            className={`${VALUE_TEXT_CLASS} text-blue-300 hover:text-white min-w-5 text-left`}
                        />
                    </div>
                </DisplayBlock>

                <DisplayBlock label="POSITION" width="w-40" border>
                    <div class={`flex items-end ${VALUE_TEXT_CLASS} text-blue-400 tabular-nums`}>
                        <span>{currentBar().toString().padStart(3, '0')}</span>
                        <span class="text-[#444] mx-1 text-[16px] font-thin relative">:</span>
                        <span>{currentBeat().toString().padStart(2, '0')}</span>
                        <span class="text-[#444] mx-1 text-[16px] font-thin relative">:</span>
                        <span>{currentSixteenth().toString().padStart(2, '0')}</span>
                    </div>
                </DisplayBlock>

                <DisplayBlock label="KEY" width="w-28" border zIndex="z-50">
                    <div class="flex items-end gap-1 w-full justify-center h-full">
                        <Dropdown
                            value={project.transport.keySignature.root}
                            options={ROOT_NOTES.map((n) => ({ label: n, value: n }))}
                            onSelect={(val) =>
                                ProjectActions.setKeySignature(val, project.transport.keySignature.scale)
                            }
                            widthClass="w-6"
                            align="end"
                            buttonClass={`${VALUE_TEXT_CLASS} text-neutral-400 pb-px`}
                        />
                        <button
                            class={`flex items-end justify-center hover:text-white transition-colors uppercase tracking-wide rounded-sm pb-px ${VALUE_TEXT_CLASS} text-[#888] hover:text-[#aaa]`}
                            onClick={cycleScale}
                            title="Toggle Scale"
                        >
                            {project.transport.keySignature.scale.substring(0, 3)}
                        </button>
                    </div>
                </DisplayBlock>

                <DisplayBlock label="TIME" width="w-28" border>
                    <span class={`${VALUE_TEXT_CLASS} text-neutral-300 tabular-nums`}>
                        {formatTime(project.transport.position, project.transport.tempo)}
                    </span>
                </DisplayBlock>

                <DisplayBlock label="CHORD" width="w-28">
                    <span class={`${VALUE_TEXT_CLASS} text-yellow-500 truncate px-1`}>{currentChord() || '--'}</span>
                </DisplayBlock>
            </div>

            <div class="flex-1"></div>

            {/* Window Toggles */}
            <div
                class={`flex bg-[#0a0a0a] p-0.5 rounded border border-[#222] items-center gap-0.5 shrink-0 ${CONTAINER_HEIGHT}`}
            >
                <button
                    class={getWindowBtnClass(windowStore['arrangement'].isOpen)}
                    onClick={() => WindowActions.toggle('arrangement')}
                >
                    Timeline
                </button>
                <button
                    class={getWindowBtnClass(windowStore['deviceRack'].isOpen)}
                    onClick={() => WindowActions.toggle('deviceRack')}
                >
                    Instrument
                </button>
                <button
                    class={getWindowBtnClass(windowStore['keyboard'].isOpen)}
                    onClick={() => WindowActions.toggle('keyboard')}
                >
                    Keys
                </button>
            </div>
        </div>
    );
};
