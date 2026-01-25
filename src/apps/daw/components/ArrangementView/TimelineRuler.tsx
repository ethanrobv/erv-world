import { For, createMemo, type Component } from 'solid-js';

interface TimelineRulerProps {
    totalWidth: number;
    viewWidth: number;
    pxPerBeat: number;
    scrollLeft: number;
    gridSize: number;
    triangleRef: (el: HTMLDivElement) => void;
}

/**
 * Renders the horizontal time ruler for the arrangement view.
 * Handles virtualization of tick marks to maintain performance on large timelines.
 */
export const TimelineRuler: Component<TimelineRulerProps> = (props) => {
    /**
     * Memoized list of visible ticks based on the current scroll position and zoom level.
     * Generates both major (beat) and minor (grid) subdivisions.
     */
    const visibleTicks = createMemo(() => {
        const px = props.pxPerBeat;
        const grid = props.gridSize;
        if (px <= 0 || grid <= 0) return [];

        const startBeat = Math.floor(props.scrollLeft / px);
        const endBeat = Math.ceil((props.scrollLeft + props.viewWidth) / px);

        const buffer = 10;
        const start = Math.max(0, startBeat - buffer);
        const end = endBeat + buffer;

        // Only render grid lines if there is enough pixel space to avoid clutter
        const tickPx = px * grid;
        const renderSubdivisions = tickPx > 6;

        const ticks: { pos: number; isMajor: boolean; label: number }[] = [];

        for (let i = start; i <= end; i++) {
            ticks.push({ pos: i, isMajor: true, label: i + 1 });

            if (renderSubdivisions) {
                const steps = Math.round(1 / grid);
                for (let s = 1; s < steps; s++) {
                    const subPos = i + s * grid;
                    ticks.push({ pos: subPos, isMajor: false, label: 0 });
                }
            }
        }
        return ticks;
    });

    const getTickStyle = (pos: number, isMajor: boolean) => ({
        left: `${pos * props.pxPerBeat}px`,
        height: isMajor ? '100%' : '30%',
        bottom: '0px',
    });

    return (
        <div class="relative h-full" style={{ width: `${props.totalWidth}px` }}>
            <For each={visibleTicks()}>
                {(tick) => (
                    <div
                        class={`absolute border-l pointer-events-none select-none ${
                            tick.isMajor
                                ? 'border-[#333] top-0 text-xs font-mono text-neutral-500 pl-1.5 pt-2'
                                : 'border-[#2a2a2a] bottom-0'
                        }`}
                        style={getTickStyle(tick.pos, tick.isMajor)}
                    >
                        {tick.isMajor ? tick.label : ''}
                    </div>
                )}
            </For>

            <div
                ref={props.triangleRef}
                class="absolute top-0 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-8 border-t-red-500 z-50 will-change-transform"
                style={{ left: '0px', transform: 'translate3d(-5px, 0, 0)' }}
            ></div>
        </div>
    );
};
