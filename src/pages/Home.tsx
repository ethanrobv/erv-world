import { type Component, createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { A } from '@solidjs/router';

interface ToolData {
    title: string;
    description: string;
    href?: string;
    isDisabled?: boolean;
}

const TOOLBOX_ITEMS: ToolData[] = [
    {
        title: 'Web DAW',
        description: 'Digital Audio Workstation',
        href: '/daw',
    },
    {
        title: 'Something else..',
        description: 'TBD',
        isDisabled: true,
    },
];

const ToolboxItem: Component<ToolData> = (props) => {
    const Content = () => (
        <div
            class={`border border-[#333] bg-[#0f0f0f] p-5 rounded-sm shadow-sm transition-all duration-200 
            ${
                props.isDisabled
                    ? 'opacity-50 cursor-not-allowed border-[#222] bg-[#0a0a0a]'
                    : 'hover:border-blue-600 hover:bg-[#141414] group'
            }`}
        >
            <div class="flex justify-between items-center mb-2">
                <h3
                    class={`text-base font-bold transition-colors ${props.isDisabled ? 'text-neutral-500' : 'text-white group-hover:text-blue-400'}`}
                >
                    {props.title}
                </h3>
            </div>
            <p class="text-xs text-neutral-400 leading-relaxed mb-4">{props.description}</p>
            <Show when={!props.isDisabled}>
                <div class="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                    Launch <span>-&gt;</span>
                </div>
            </Show>
        </div>
    );

    return (
        <Show when={!props.isDisabled && props.href} fallback={<Content />}>
            <A href={props.href!} class="block">
                <Content />
            </A>
        </Show>
    );
};

const FluidFeed: Component = () => {
    const [canvasRef, setCanvasRef] = createSignal<HTMLCanvasElement>();
    const [containerRef, setContainerRef] = createSignal<HTMLDivElement>();

    onMount(() => {
        const canvas = canvasRef();
        const container = containerRef();
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configuration
        const FILL_DURATION = 30 * 1000; // 30 seconds
        const PIPE_Y_OFFSET = 80;
        const PIPE_LENGTH = 40;
        const START_TIME = Date.now();

        // SVG Path Data (24x24 ViewBox, facing right)
        const fishBodyPath = new Path2D(
            'M2 15C3.83333 12.3333 8.8 7 14 7C14.9226 7 15.7539 7.10492 16.5 7.28685M2 9C3.83333 11.6667 8.8 17 14 17C14.9226 17 15.7539 16.8951 16.5 16.7132M16.5 16.7132C19.9595 15.8697 22 12 22 12C22 12 19.9595 8.13032 16.5 7.28685M16.5 16.7132C15.5 15.1667 14.1 11.1163 16.5 7.28685M12 10.5C11.5 11 10.8 12.3 12 13.5'
        );
        const fishEyePath = new Path2D('M18 11H18.001');

        // Physics State
        let fish: { x: number; y: number; vx: number; vy: number; s: number }[] = [];
        let bubbles: { x: number; y: number; r: number; v: number }[] = [];
        let particles: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
        let waveOffset = 0;
        let animationFrameId: number;

        const resize = () => {
            const cvs = canvasRef();
            const cnt = containerRef();
            if (cnt && cvs) {
                const rect = cnt.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                cvs.width = rect.width * dpr;
                cvs.height = rect.height * dpr;
                ctx.scale(dpr, dpr);
                cvs.style.width = `${rect.width}px`;
                cvs.style.height = `${rect.height}px`;
            }
        };

        const observer = new ResizeObserver(resize);
        observer.observe(container);
        resize();

        const loop = () => {
            const cvs = canvasRef();
            if (!cvs || !ctx) return;

            const width = cvs.width / (window.devicePixelRatio || 1);
            const height = cvs.height / (window.devicePixelRatio || 1);

            // Calculate Fill State
            const elapsed = Date.now() - START_TIME;
            const progress = Math.min(elapsed / FILL_DURATION, 1);
            const maxFillHeight = height - PIPE_Y_OFFSET;
            const currentFillHeight = maxFillHeight * progress;
            const surfaceY = height - currentFillHeight;
            const isFilling = progress < 1;

            ctx.clearRect(0, 0, width, height);

            // Draw Pipe
            ctx.fillStyle = '#222';
            ctx.fillRect(0, PIPE_Y_OFFSET - 6, PIPE_LENGTH, 12);
            ctx.fillStyle = '#111';
            ctx.fillRect(0, PIPE_Y_OFFSET - 3, PIPE_LENGTH, 6);

            // Fish appear at 25% filled
            if (progress > 0.25) {
                if (fish.length < 12 && Math.random() < 0.01) {
                    fish.push({
                        x: Math.random() * width,
                        y: height - Math.random() * (currentFillHeight - 40) - 10,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: (Math.random() - 0.5) * 0.5,
                        s: 1 + Math.random() * 0.5,
                    });
                }

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = 1.5;

                fish.forEach((f) => {
                    f.x += f.vx;
                    f.y += f.vy;

                    // Collision (Walls)
                    const hitRight = f.x > width - 15;
                    const hitLeft = f.x < 15;
                    if (hitRight || hitLeft) f.vx *= -1;

                    // Collision (Floor/Surface)
                    const hitFloor = f.y > height - 10;
                    const hitSurface = f.y < surfaceY + 15;
                    if (hitFloor || hitSurface) f.vy *= -1;

                    // Render
                    ctx.save();
                    ctx.translate(f.x, f.y);
                    // Flip based on velocity
                    const direction = f.vx > 0 ? 1 : -1;
                    ctx.scale(f.s * direction, f.s);
                    ctx.translate(-12, -12); // Center pivot (24x24 viewBox)
                    ctx.stroke(fishBodyPath);
                    ctx.stroke(fishEyePath);
                    ctx.restore();
                });
            }

            // Water Body
            if (currentFillHeight > 0) {
                const gradient = ctx.createLinearGradient(0, surfaceY, 0, height);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
                ctx.fillStyle = gradient;

                ctx.beginPath();
                ctx.moveTo(0, height);
                ctx.lineTo(0, surfaceY);

                waveOffset += 0.03;
                for (let x = 0; x <= width; x += 5) {
                    ctx.lineTo(x, surfaceY + Math.sin(x * 0.03 + waveOffset) * 2);
                }

                ctx.lineTo(width, surfaceY);
                ctx.lineTo(width, height);
                ctx.fill();

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Stream & Splash Effects
            if (isFilling) {
                const streamX = PIPE_LENGTH - 4;

                // Stream
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fillRect(streamX, PIPE_Y_OFFSET, 3, surfaceY - PIPE_Y_OFFSET + 2);

                // Spawn Particles
                if (Math.random() > 0.1) {
                    particles.push({
                        x: streamX + 1.5,
                        y: surfaceY,
                        vx: (Math.random() - 0.5) * 3,
                        vy: -Math.random() * 2,
                        life: 20,
                    });
                }

                // Spawn Bubbles
                if (Math.random() > 0.5) {
                    bubbles.push({
                        x: streamX + 1.5 + (Math.random() - 0.5) * 5,
                        y: surfaceY,
                        r: Math.random() * 1.5,
                        v: 1 + Math.random(),
                    });
                }
            }

            // Render Particles
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            particles = particles.filter((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15;
                p.life--;
                if (p.life <= 0 || p.y > surfaceY) return false;
                ctx.fillRect(p.x, p.y, 1, 1);
                return true;
            });

            // Render Bubbles
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            bubbles = bubbles.filter((b) => {
                b.y += b.v;
                b.x += Math.random() - 0.5;
                b.r -= 0.02;
                if (b.r <= 0 || b.y > height) return false;
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fill();
                return true;
            });

            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        onCleanup(() => {
            cancelAnimationFrame(animationFrameId);
            observer.disconnect();
        });
    });

    return (
        <div
            ref={setContainerRef}
            class="flex-1 w-full h-full min-h-0 relative border border-[#222] bg-[#080808] rounded-sm overflow-hidden"
        >
            <canvas ref={setCanvasRef} class="block w-full h-full" />
        </div>
    );
};

const Home: Component = () => {
    const [isToolboxOpen, setIsToolboxOpen] = createSignal(true);

    return (
        <div class="h-screen w-screen bg-[#050505] text-[#e5e5e5] font-sans flex flex-col overflow-hidden">
            <div class="flex-1 flex overflow-hidden relative">
                <main class="flex-1 flex flex-col min-w-0 bg-[#050505] relative z-0 overflow-hidden">
                    <header class="h-20 flex items-center px-8 md:px-12 border-b border-[#222] bg-[#050505] shrink-0">
                        <div class="w-64 h-12">
                            <img src="/logo.svg" alt="Brand Logo" class="w-full h-full object-contain" />
                        </div>
                    </header>

                    <div class="flex-1 flex flex-col min-h-0 p-8 md:p-12">
                        <div class="max-w-4xl w-full h-full flex flex-col">
                            <section class="shrink-0 mt-4 mb-10">
                                <h1 class="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-white leading-tight">
                                    Hello.
                                </h1>
                                <p class="text-xl text-neutral-400 max-w-xl leading-relaxed border-l-2 border-[#333] pl-6">
                                    Links for contact & work at the bottom of the page.
                                </p>
                            </section>

                            <div class="flex-1 min-h-0 flex flex-col pb-4">
                                <FluidFeed />
                            </div>

                            <section class="shrink-0 pt-2 mt-4 border-t border-[#222]">
                                <div class="flex gap-8 text-sm">
                                    <a
                                        href="https://www.github.com/ethanrobv"
                                        target="_blank"
                                        class="text-neutral-400 hover:text-white hover:underline transition-all"
                                    >
                                        GitHub
                                    </a>
                                    <a
                                        href="https://www.linkedin.com/in/ethanrobv"
                                        target="_blank"
                                        class="text-neutral-400 hover:text-white hover:underline transition-all"
                                    >
                                        LinkedIn
                                    </a>
                                </div>
                            </section>

                            <div class="md:hidden mt-4 p-4 bg-[#111] border border-[#222] rounded text-center shrink-0">
                                <p class="text-sm text-neutral-500">
                                    Please visit on a desktop to access applications.
                                </p>
                            </div>
                        </div>
                    </div>
                </main>

                <div class="hidden md:flex flex-row h-full shrink-0 z-30">
                    <button
                        onClick={() => setIsToolboxOpen(!isToolboxOpen())}
                        class="w-12 h-full bg-[#0a0a0a] border-l border-[#222] hover:bg-[#111] hover:text-white text-neutral-500 transition-colors flex flex-col items-center justify-start py-6 cursor-pointer group shrink-0 relative z-40"
                        title={isToolboxOpen() ? 'Collapse Drawer' : 'Expand Drawer'}
                    >
                        <div class="mb-6">
                            <svg
                                class={`w-5 h-5 transition-transform duration-300 ${isToolboxOpen() ? 'rotate-180' : 'rotate-0'}`}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                            >
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </div>
                        <div class="writing-mode-vertical text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 group-hover:opacity-100 transition-opacity rotate-90">
                            Apps
                        </div>
                    </button>

                    <aside
                        class={`bg-[#0a0a0a] border-l border-[#222] overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
                            isToolboxOpen() ? 'w-[320px]' : 'w-0 border-l-0'
                        }`}
                    >
                        <div class="w-[320px] h-full flex flex-col">
                            <div class="p-6 border-b border-[#222]">
                                <h2 class="text-xs font-bold text-neutral-500 uppercase tracking-widest">Toolbox</h2>
                            </div>

                            <div class="flex-1 p-6 flex flex-col gap-4 overflow-y-auto">
                                <For each={TOOLBOX_ITEMS}>{(tool) => <ToolboxItem {...tool} />}</For>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default Home;
