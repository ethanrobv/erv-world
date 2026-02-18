import { type Component, createEffect, createMemo, createSignal, For, onCleanup, onMount } from 'solid-js';
import { project, ProjectActions, setProject } from '../../store/project';
import { WindowActions } from '../../store/window-manager';
import { audioEngine } from '../../core/audio/audio-context';
import { history } from '../../core/logic/history';
import type { Clip, Track } from '../../store/types';
import { TimelineRuler } from './TimelineRuler';
import { ClipItem } from './ClipItem';
import { TrackHeader } from './TrackHeader';

const BASE_PX_PER_BEAT = 80;
const TRACK_HEIGHT = 96;
const ADD_TRACK_BUTTON_HEIGHT = 48;
const TIMELINE_WIDTH = 50000;
const MIN_TIMELINE_HEIGHT = 600;

/**
 * Calculates the geometry of a selection rectangle based on mouse coordinates.
 * Ensures width and height are always positive regardless of drag direction.
 */
const getSelectionRect = (originX: number, originY: number, currentX: number, currentY: number) => ({
    x: Math.min(originX, currentX),
    y: Math.min(originY, currentY),
    w: Math.abs(currentX - originX),
    h: Math.abs(currentY - originY),
});

/**
 * The main arrangement view component.
 * Renders the track headers, timeline ruler, and the grid of clips.
 * Handles global timeline interactions like scrolling, zooming, and selection.
 */
export const ArrangementView: Component = () => {
    const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();
    const [rulerScrollRef, setRulerScrollRef] = createSignal<HTMLDivElement>();
    const [sidebarRef, setSidebarRef] = createSignal<HTMLDivElement>();
    const [mainContainerRef, setMainContainerRef] = createSignal<HTMLDivElement>();

    // Direct DOM refs for high-performance animation updates (avoiding Signals overhead)
    let playheadTriangle: HTMLDivElement | undefined;
    let playheadLine: HTMLDivElement | undefined;

    // Animation frame ID storage
    let rafId: number | null = null;

    const [scrollLeft, setScrollLeft] = createSignal(0);
    const [viewWidth, setViewWidth] = createSignal(1000);
    const [scrollbarHeight, setScrollbarHeight] = createSignal(0);

    const [selectedClipIds, setSelectedClipIds] = createSignal<Set<string>>(new Set<string>());
    const [isSelecting, setIsSelecting] = createSignal(false);
    const [selectionRect, setSelectionRect] = createSignal<{ x: number; y: number; w: number; h: number } | null>(null);

    const getPxPerBeat = () => BASE_PX_PER_BEAT * project.view.zoomLevel;

    const getMeasureLength = () => {
        const { numerator, denominator } = project.transport.timeSignature;
        return (numerator * 4) / denominator;
    };

    const baseContentHeight = createMemo(() => {
        const tracksHeight = project.tracks.length * TRACK_HEIGHT;
        return Math.max(tracksHeight + ADD_TRACK_BUTTON_HEIGHT, MIN_TIMELINE_HEIGHT);
    });

    const snapToGrid = (beat: number): number => {
        if (!project.view.snapToGrid) return beat;
        const grid = project.view.gridSize;
        return Math.round(beat / grid) * grid;
    };

    onMount(() => {
        const el = containerRef();
        if (el) {
            setViewWidth(el.clientWidth);
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const target = entry.target as HTMLElement;
                    setViewWidth(entry.contentRect.width);
                    const sbHeight = target.offsetHeight - target.clientHeight;
                    setScrollbarHeight(sbHeight);
                }
            });
            observer.observe(el);
            onCleanup(() => observer.disconnect());
        }
        window.addEventListener('keydown', handleKeyDown);
        onCleanup(() => window.removeEventListener('keydown', handleKeyDown));
    });

    /**
     * Updates the visual position of the playhead (triangle and line).
     */
    const updatePlayheadTransform = () => {
        if (!playheadLine || !playheadTriangle) return;

        let currentBeat = project.transport.position;

        if (project.transport.isPlaying) {
            const now = audioEngine.currentTime;
            const start = project.transport.startTime;

            const elapsed = Math.max(0, now - start);
            currentBeat = elapsed * (project.transport.tempo / 60);
        }

        const px = Math.round(currentBeat * getPxPerBeat());
        playheadLine.style.transform = `translate3d(${px}px, 0, 0)`;
        playheadTriangle.style.transform = `translate3d(${px - 5}px, 0, 0)`;

        if (project.transport.isPlaying) {
            rafId = requestAnimationFrame(updatePlayheadTransform);
        }
    };

    // Reactively start/stop the loop based on playback state
    createEffect(() => {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }

        if (project.transport.isPlaying) {
            rafId = requestAnimationFrame(updatePlayheadTransform);
        } else {
            // Ensure playhead updates one last time when stopping/seeking while paused
            updatePlayheadTransform();
        }
    });

    // Handle zoom changes while paused (while playing, the loop handles it)
    createEffect(() => {
        project.view.zoomLevel;
        if (!project.transport.isPlaying) updatePlayheadTransform();
    });

    // Handle position changes (seeking) while paused
    createEffect(() => {
        project.transport.position;
        if (!project.transport.isPlaying) updatePlayheadTransform();
    });

    onCleanup(() => {
        if (rafId !== null) cancelAnimationFrame(rafId);
    });

    const handleScroll = (e: Event) => {
        const target = e.target as HTMLDivElement;
        const sl = target.scrollLeft;
        const st = target.scrollTop;

        const ruler = rulerScrollRef();
        if (ruler) ruler.scrollLeft = sl;

        const sidebar = sidebarRef();
        if (sidebar) sidebar.scrollTop = st;

        setScrollLeft(sl);
    };

    const handleTimelineWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            ProjectActions.setZoom(project.view.zoomLevel + delta);
        }
    };

    const handleSidebarWheel = (e: WheelEvent) => {
        const container = containerRef();
        if (container) {
            container.scrollTop += e.deltaY;
            container.scrollLeft += e.deltaX;
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        const container = mainContainerRef();
        if (!container || !container.contains(document.activeElement)) return;

        const sel = selectedClipIds();

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            const idsToDelete = new Set(sel);
            if (project.selectedClipId) idsToDelete.add(project.selectedClipId);
            if (idsToDelete.size > 0) {
                ProjectActions.deleteClips(Array.from(idsToDelete));
                setSelectedClipIds(new Set<string>());
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            const targetId = project.selectedClipId || Array.from(sel)[0];
            if (targetId) {
                const clip = project.clips[targetId];
                if (clip) {
                    ProjectActions.copy({ type: 'clip', data: JSON.parse(JSON.stringify(clip)) });
                }
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            e.preventDefault();
            ProjectActions.pasteClip(project.transport.position);
        }
    };

    const handleDeleteTrack = (trackId: string) => {
        setProject('tracks', (t) => t.filter((tr) => tr.id !== trackId));
    };

    const handleClipDoubleClick = (e: MouseEvent, clip: Clip) => {
        e.stopPropagation();
        setProject('selectedClipId', clip.id);
        WindowActions.open('pianoRoll');
        WindowActions.focus('pianoRoll');
    };

    const handleClipMouseDown = (e: MouseEvent, clip: Clip) => {
        e.stopPropagation();
        e.preventDefault();

        const currentSelection = new Set(selectedClipIds());

        if (e.ctrlKey || e.metaKey) {
            if (currentSelection.has(clip.id)) currentSelection.delete(clip.id);
            else currentSelection.add(clip.id);
        } else {
            if (!currentSelection.has(clip.id)) {
                currentSelection.clear();
                currentSelection.add(clip.id);
            }
        }

        setSelectedClipIds(currentSelection);
        setProject('selectedClipId', clip.id);
        ProjectActions.selectTrack(clip.trackId);

        const target = e.target as HTMLElement;
        if (target.classList.contains('resize-w')) startClipResize(e, clip, 'start');
        else if (target.classList.contains('resize-e')) startClipResize(e, clip, 'end');
        else startClipMove(e);
    };

    const startClipMove = (e: MouseEvent) => {
        const startX = e.clientX;
        const startY = e.clientY;
        const pxPerBeat = getPxPerBeat();

        const selection = Array.from(selectedClipIds());

        const initialStates = selection
            .map((id) => {
                const c = project.clips[id];
                if (!c) return null;
                const trackIndex = project.tracks.findIndex((t) => t.id === c.trackId);
                return {
                    id,
                    start: c.start,
                    length: c.length,
                    trackId: c.trackId,
                    trackIndex: trackIndex,
                };
            })
            .filter(Boolean) as { id: string; start: number; length: number; trackId: string; trackIndex: number }[];

        history.beginTransaction('Move Clips', () => {
            initialStates.forEach((s) => {
                ProjectActions.updateClipParam(s.id, 'start', s.start);
                ProjectActions.updateClipParam(s.id, 'trackId', s.trackId);
            });
        });

        const obstaclesByTrack: Record<string, Clip[]> = {};
        project.tracks.forEach((t) => {
            obstaclesByTrack[t.id] = [];
        });

        Object.values(project.clips).forEach((c) => {
            if (!selectedClipIds().has(c.id)) {
                if (obstaclesByTrack[c.trackId]) {
                    obstaclesByTrack[c.trackId].push(c);
                }
            }
        });

        if (e.altKey && project.selectedClipId) {
            const source = project.clips[project.selectedClipId];
            if (source) {
                ProjectActions.copy({ type: 'clip', data: JSON.parse(JSON.stringify(source)) });
                ProjectActions.pasteClip(source.start);
            }
        }

        const onMove = (ev: MouseEvent) => {
            const deltaPx = ev.clientX - startX;
            const deltaPy = ev.clientY - startY;

            const deltaBeats = deltaPx / pxPerBeat;
            const deltaTracks = Math.round(deltaPy / TRACK_HEIGHT);

            const updates: { id: string; start: number; trackId: string }[] = [];
            let isMoveGloballyValid = true;

            for (const state of initialStates) {
                let newTrackIndex = state.trackIndex + deltaTracks;
                newTrackIndex = Math.max(0, Math.min(project.tracks.length - 1, newTrackIndex));
                const newTrack = project.tracks[newTrackIndex];

                let newStart = snapToGrid(Math.max(0, state.start + deltaBeats));
                const newEnd = newStart + state.length;

                const obstacles = obstaclesByTrack[newTrack.id] || [];

                const collision = obstacles.find((obs) => {
                    const obsEnd = obs.start + obs.length;
                    return newStart < obsEnd && newEnd > obs.start;
                });

                if (collision) {
                    let resolvedStart = newStart;

                    if (deltaBeats > 0) {
                        resolvedStart = collision.start - state.length;
                    } else {
                        resolvedStart = collision.start + collision.length;
                    }

                    resolvedStart = snapToGrid(resolvedStart);

                    const resolvedEnd = resolvedStart + state.length;
                    const secondaryCollision = obstacles.some((obs) => {
                        const obsEnd = obs.start + obs.length;
                        return resolvedStart < obsEnd && resolvedEnd > obs.start;
                    });

                    if (!secondaryCollision && resolvedStart >= 0) {
                        newStart = resolvedStart;
                    } else {
                        isMoveGloballyValid = false;
                    }
                }

                updates.push({ id: state.id, start: newStart, trackId: newTrack.id });
            }

            if (isMoveGloballyValid) {
                updates.forEach((u) => {
                    const clip = project.clips[u.id];
                    if (clip.start !== u.start) {
                        ProjectActions.updateClipParam(u.id, 'start', u.start);
                    }
                    if (clip.trackId !== u.trackId) {
                        ProjectActions.updateClipParam(u.id, 'trackId', u.trackId);
                    }
                });
            }
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);

            const finalSnapshot = initialStates.map((s) => {
                const c = project.clips[s.id];
                return { id: c.id, start: c.start, trackId: c.trackId };
            });

            history.commitTransaction(() => {
                finalSnapshot.forEach((s) => {
                    ProjectActions.updateClipParam(s.id, 'start', s.start);
                    ProjectActions.updateClipParam(s.id, 'trackId', s.trackId);
                });
            });
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const startClipResize = (e: MouseEvent, clip: Clip, edge: 'start' | 'end') => {
        const startX = e.clientX;
        const initialStart = clip.start;
        const initialLength = clip.length;
        const pxPerBeat = getPxPerBeat();

        history.beginTransaction('Resize Clip', () => {
            ProjectActions.updateClipParam(clip.id, 'start', initialStart);
            ProjectActions.updateClipParam(clip.id, 'length', initialLength);
        });

        const trackClips = Object.values(project.clips)
            .filter((c) => c.trackId === clip.trackId && c.id !== clip.id)
            .sort((a, b) => a.start - b.start);

        const prevClip = trackClips.filter((c) => c.start + c.length <= initialStart).pop();
        const nextClip = trackClips.find((c) => c.start >= initialStart + initialLength);

        const minPossibleStart = prevClip ? prevClip.start + prevClip.length : 0;
        const maxPossibleEnd = nextClip ? nextClip.start : Infinity;

        const onResize = (ev: MouseEvent) => {
            const deltaPx = ev.clientX - startX;
            const deltaBeats = deltaPx / pxPerBeat;

            if (edge === 'end') {
                let newLength = initialLength + deltaBeats;
                const intendedEnd = initialStart + newLength;

                if (intendedEnd > maxPossibleEnd) {
                    newLength = maxPossibleEnd - initialStart;
                }

                newLength = snapToGrid(Math.max(0.25, newLength));
                ProjectActions.updateClipParam(clip.id, 'length', newLength);
            } else {
                let newStart = initialStart + deltaBeats;

                if (newStart < minPossibleStart) {
                    newStart = minPossibleStart;
                }

                const originalEnd = initialStart + initialLength;
                if (newStart >= originalEnd - 0.25) {
                    newStart = originalEnd - 0.25;
                }

                newStart = snapToGrid(Math.max(0, newStart));
                const newLength = originalEnd - newStart;

                ProjectActions.updateClipParam(clip.id, 'start', newStart);
                ProjectActions.updateClipParam(clip.id, 'length', newLength);
            }
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onResize);
            window.removeEventListener('mouseup', onUp);

            const finalClip = project.clips[clip.id];
            const finalStart = finalClip.start;
            const finalLength = finalClip.length;

            history.commitTransaction(() => {
                ProjectActions.updateClipParam(clip.id, 'start', finalStart);
                ProjectActions.updateClipParam(clip.id, 'length', finalLength);
            });
        };
        window.addEventListener('mousemove', onResize);
        window.addEventListener('mouseup', onUp);
    };

    const handleGridMouseDown = (e: MouseEvent) => {
        const el = containerRef();
        if (!el || e.button !== 0) return;

        const rect = el.getBoundingClientRect();
        const originX = e.clientX - rect.left + el.scrollLeft;
        const originY = e.clientY - rect.top + el.scrollTop;

        setIsSelecting(true);
        setSelectionRect({ x: originX, y: originY, w: 0, h: 0 });

        if (!e.ctrlKey && !e.shiftKey) {
            setSelectedClipIds(new Set<string>());
            setProject('selectedClipId', null);
        }

        const onSelectMove = (ev: MouseEvent) => {
            const currentX = ev.clientX - rect.left + el.scrollLeft;
            const currentY = ev.clientY - rect.top + el.scrollTop;

            const selection = getSelectionRect(originX, originY, currentX, currentY);
            setSelectionRect(selection);

            const newSelection = new Set<string>(e.ctrlKey ? Array.from(selectedClipIds()) : []);
            const pxPerBeat = getPxPerBeat();

            project.tracks.forEach((track, idx) => {
                const trackTop = idx * TRACK_HEIGHT;
                const trackBottom = trackTop + TRACK_HEIGHT;

                if (selection.y < trackBottom && selection.y + selection.h > trackTop) {
                    const clips = Object.values(project.clips).filter((c) => c.trackId === track.id);
                    clips.forEach((clip) => {
                        const clipL = clip.start * pxPerBeat;
                        const clipR = clipL + clip.length * pxPerBeat;
                        if (selection.x < clipR && selection.x + selection.w > clipL) {
                            newSelection.add(clip.id);
                        }
                    });
                }
            });
            setSelectedClipIds(newSelection);
        };

        const onSelectUp = () => {
            setIsSelecting(false);
            setSelectionRect(null);
            window.removeEventListener('mousemove', onSelectMove);
            window.removeEventListener('mouseup', onSelectUp);
        };
        window.addEventListener('mousemove', onSelectMove);
        window.addEventListener('mouseup', onSelectUp);
    };

    const handleRulerMouseDown = (e: MouseEvent) => {
        const el = containerRef();
        if (!el || e.buttons !== 1) return;

        const rect = el.getBoundingClientRect();
        const updatePos = (ev: MouseEvent) => {
            const offsetX = ev.clientX - rect.left + el.scrollLeft;
            const beat = Math.max(0, offsetX / getPxPerBeat());
            ProjectActions.setPosition(beat);
            updatePlayheadTransform();
        };

        updatePos(e);
        const onMove = (ev: MouseEvent) => updatePos(ev);
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const handleTrackBackgroundDblClick = (e: MouseEvent, trackId: string) => {
        const el = e.currentTarget as HTMLElement;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const beat = snapToGrid(x / getPxPerBeat());

        const defaultLength = getMeasureLength();

        const collision = Object.values(project.clips).some((c) => {
            if (c.trackId !== trackId) return false;

            const newEnd = beat + defaultLength;
            return beat < c.start + c.length && newEnd > c.start;
        });

        if (!collision) {
            ProjectActions.addClip(trackId, beat);
        }
    };

    const getGridBgStyle = () => ({
        'background-image': 'linear-gradient(to right, #2a2a2a 1px, transparent 1px)',
        'background-size': `${getPxPerBeat()}px 100%`,
        width: '100%',
        height: '100%',
    });

    const getSelectionStyle = () => {
        const r = selectionRect();
        return r ? { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` } : {};
    };

    return (
        <div
            ref={setMainContainerRef}
            class="flex flex-col h-full bg-[#111] text-white outline-none"
            tabIndex={0}
            onMouseDown={(e) => e.stopPropagation()}
        >
            <div
                class="ml-64 h-12 bg-[#141414] border-b border-[#2a2a2a] overflow-hidden relative cursor-pointer"
                ref={setRulerScrollRef}
                onMouseDown={handleRulerMouseDown}
            >
                <TimelineRuler
                    totalWidth={TIMELINE_WIDTH}
                    scrollLeft={scrollLeft()}
                    viewWidth={viewWidth()}
                    pxPerBeat={getPxPerBeat()}
                    gridSize={project.view.gridSize}
                    triangleRef={(el) => (playheadTriangle = el)}
                />
            </div>

            <div class="flex flex-1 overflow-hidden">
                <div
                    ref={setSidebarRef}
                    class="w-64 shrink-0 bg-[#161616] border-r border-[#050505] z-20 shadow-xl overflow-hidden"
                    onWheel={handleSidebarWheel}
                >
                    <div style={{ height: `${baseContentHeight() + scrollbarHeight()}px` }}>
                        <For each={project.tracks}>
                            {(track: Track) => (
                                <div class="border-b border-[#2a2a2a]" style={{ height: `${TRACK_HEIGHT}px` }}>
                                    <TrackHeader
                                        track={track}
                                        isSelected={project.selectedTrackId === track.id}
                                        onDelete={() => handleDeleteTrack(track.id)}
                                    />
                                </div>
                            )}
                        </For>
                        <div
                            class="h-12 flex items-center justify-center border-b border-[#222] hover:bg-[#222] cursor-pointer text-neutral-500 hover:text-white transition-colors"
                            onClick={() => ProjectActions.addTrack()}
                        >
                            <span class="text-sm font-bold uppercase tracking-wider">+ Add Track</span>
                        </div>
                    </div>
                </div>

                <div
                    ref={setContainerRef}
                    class="flex-1 overflow-auto bg-[#1a1a1a] relative"
                    onWheel={handleTimelineWheel}
                    onScroll={handleScroll}
                    onMouseDown={handleGridMouseDown}
                >
                    <div
                        class="relative"
                        style={{
                            width: `${TIMELINE_WIDTH}px`,
                            height: `${baseContentHeight()}px`,
                        }}
                    >
                        <div class="absolute inset-0 pointer-events-none z-0" style={getGridBgStyle()}></div>

                        <div
                            ref={(el) => (playheadLine = el)}
                            class="absolute top-0 bottom-0 w-px solid bg-white z-40 pointer-events-none will-change-transform"
                            style={{ left: '0px' }}
                        ></div>

                        {isSelecting() && selectionRect() && (
                            <div
                                class="absolute bg-blue-500/10 border border-blue-400/50 z-50 pointer-events-none"
                                style={getSelectionStyle()}
                            ></div>
                        )}

                        <div class="relative min-w-full">
                            <For each={project.tracks}>
                                {(track: Track) => (
                                    <div
                                        class="relative border-b border-[#2a2a2a] group"
                                        style={{ height: `${TRACK_HEIGHT}px` }}
                                        onDblClick={(e) => handleTrackBackgroundDblClick(e, track.id)}
                                    >
                                        <For each={Object.values(project.clips).filter((c) => c.trackId === track.id)}>
                                            {(clip) => (
                                                <ClipItem
                                                    clip={clip}
                                                    trackId={track.id}
                                                    pxPerBeat={getPxPerBeat()}
                                                    isSelected={selectedClipIds().has(clip.id)}
                                                    onMouseDown={(e) => handleClipMouseDown(e, clip)}
                                                    onDoubleClick={(e) => handleClipDoubleClick(e, clip)}
                                                />
                                            )}
                                        </For>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
