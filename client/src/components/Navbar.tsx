import { useState, useEffect, useRef } from 'react';
import Logo from './Logo.tsx';
import { useWidgets } from '../context/WidgetContext';

type Theme = 'light' | 'dark' | 'contrast' | 'terminal' | 'catppuccin'

const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export default function Navbar() {
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const widgetDropdownRef = useRef<HTMLDivElement>(null);
    const [isWidgetsOpen, setIsWidgetsOpen] = useState(false);
    const { toggleWidget, isWidgetOpen } = useWidgets();

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        root.removeAttribute('data-theme');

        if (theme === 'dark') {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
        } else if (theme === 'contrast') {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'contrast');
        } else if (theme === 'terminal') {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'terminal');
        } else if (theme === 'catppuccin') {
            root.setAttribute('data-theme', 'catppuccin');
        }

        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (widgetDropdownRef.current && !widgetDropdownRef.current.contains(event.target as Node)) {
                setIsWidgetsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const cycleTheme = () => {
        setTheme((prev) => {
            if (prev === 'light') return 'dark';
            if (prev === 'dark') return 'contrast';
            if (prev === 'contrast') return 'terminal';
            if (prev === 'terminal') return 'catppuccin';
            return 'light';
        });
    };

    return (
        <nav
            id='main-navbar'
            className='sticky top-0 z-50 border-b border-border-base bg-page/80 backdrop-blur-md transition-colors duration-300'>
            <div className='flex w-full items-center justify-between px-6 py-6'>

                <div className='flex items-center gap-8'>
                    <a href='/' className='flex shrink-0 items-center'>
                        <Logo className='h-8 w-auto fill-primary'/>
                    </a>

                    <div className='hidden gap-6 md:flex items-center'>
                        <a href='https://github.com/ethanrobv/erv-world' target='_blank'
                           className='text-sm font-medium text-text-main hover:text-text-muted'>About</a>

                        <div className='relative' ref={ widgetDropdownRef }>
                            <button
                                onClick={ () => setIsWidgetsOpen(!isWidgetsOpen) }
                                className='flex items-center gap-1 text-sm font-medium cursor-pointer text-text-main hover:text-text-muted focus:outline-none'
                            >
                                Widgets
                                <ChevronDownIcon
                                    className={ `size-3 transition-transform ${ isWidgetsOpen ? 'rotate-180' : '' }` }/>
                            </button>

                            { isWidgetsOpen && (
                                <div
                                    className='absolute left-0 mt-2 w-48 origin-top-left rounded-md border border-border-base bg-surface shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in zoom-in-95 duration-100'>
                                    <div className='py-1'>
                                        <button
                                            data-active={ isWidgetOpen('synth') }
                                            onClick={ () => toggleWidget('synth') }
                                            className='group flex w-full items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-surface-highlight data-[active=true]:bg-primary/10'
                                        >
                                            <SynthIcon className='size-30'/>
                                        </button>
                                    </div>
                                    <div className='py-1 border-t border-border-base'>
                                        <button
                                            data-active={ isWidgetOpen('barGame') }
                                            onClick={ () => toggleWidget('barGame') }
                                            className='group flex w-full items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-surface-highlight data-[active=true]:bg-primary/10'
                                        >
                                            <BarGameIcon className='size-30'/>
                                        </button>
                                    </div>
                                </div>
                            ) }
                        </div>
                    </div>
                </div>

                <div className='flex items-center gap-4'>
                    <button
                        onClick={ cycleTheme }
                        className='rounded-full p-2 text-text-main hover:bg-surface-highlight transition-colors'
                        aria-label={ `Current theme: ${ theme }. Click to switch.` }
                    >
                        { theme === 'light' && <SunIcon className='size-6'/> }
                        { theme === 'dark' && <MoonIcon className='size-6'/> }
                        { theme === 'contrast' && <ContrastIcon className='size-6'/> }
                        { theme === 'terminal' && <TerminalIcon className='size-6'/> }
                        { theme === 'catppuccin' && <CatIcon className='size-6'/> }
                    </button>

                    <div className='hidden gap-4 md:flex'>
                        <button
                            className='rounded-md bg-primary text-primary-fg px-4 py-2 text-sm font-medium hover:opacity-90'>
                            <LeftUpArrowIcon className='size-3 bg-primary'/>
                        </button>
                    </div>

                    <button
                        className='md:hidden text-text-main'
                        onClick={ () => setIsMobileMenuOpen(!isMobileMenuOpen) }
                    >
                        <MenuIcon/>
                    </button>
                </div>
            </div>

            { isMobileMenuOpen && (
                <div className='border-b border-border-base bg-page px-6 py-4 md:hidden'>
                    <div className='flex flex-col gap-4'>
                        <button className='w-full rounded-md bg-primary text-primary-fg px-4 py-2 text-sm font-medium'>
                            <LeftUpArrowIcon className='size-3 bg-primary'/>
                        </button>
                    </div>
                </div>
            ) }
        </nav>
    );
}

const SunIcon = ({ className }: { className?: string }) =>
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 }
         stroke='currentColor' className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round'
              d='M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z'/>
    </svg>;
const MoonIcon = ({ className }: { className?: string }) =>
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 }
         stroke='currentColor' className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round'
              d='M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z'/>
    </svg>;
const ContrastIcon = ({ className }: { className?: string }) =>
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 }
         stroke='currentColor' className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round'
              d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 8.625V12l1.5-1.5 1.5 1.5V3a8.25 8.25 0 0 0-3 0v9l1.5-1.5 1.5 1.5V10.875Z'/>
        <path d='M12 21.75c4.97 0 9-4.03 9-9s-4.03-9-9-9v18Z' stroke='currentColor' fill='currentColor'/>
    </svg>;
const TerminalIcon = ({ className }: { className?: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 } stroke='currentColor'
         className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round'
              d='M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z'/>
    </svg>
);
const CatIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 24 24'
        fill='currentColor'
        className={ className }
    >
        <path d='M11.7501 6.40636C10.2698 6.40636 10.1222 6.5625 9.3561 6.5625C8.71769 6.5625 6.80245 5 5.84485 5C4.88724 5 3.77004 5.5625 3.77004 7.1875V9.0625C3.77197 9.55469 3.95081 11.0634 4.65075 10.6602C3.82323 11.6382 3.73963 12.7786 3.751 13.8826C3.52812 13.947 3.30072 14.0196 3.08003 14.095C2.39614 14.3289 1.67085 14.6271 1.3432 14.8387C0.995241 15.0634 0.895339 15.5277 1.12006 15.8756C1.34478 16.2236 1.80903 16.3235 2.15698 16.0988C2.3132 15.9979 2.87823 15.7493 3.56532 15.5144C3.64124 15.4884 3.71731 15.4631 3.79298 15.4386C3.83925 15.8724 3.95408 16.2684 4.12478 16.6292L4.1012 16.6416C3.69148 16.8581 3.3113 17.1067 3.06889 17.2652C3.02694 17.2926 2.98912 17.3173 2.95599 17.3387C2.60803 17.5634 2.50813 18.0277 2.73285 18.3756C2.95757 18.7236 3.42182 18.8235 3.76978 18.5988C3.8109 18.5722 3.85472 18.5436 3.90097 18.5134C4.1463 18.3533 4.45999 18.1485 4.80199 17.9678C4.88218 17.9254 4.95935 17.887 5.03317 17.8524C6.76347 19.4748 9.86991 20 11.7501 20C13.6302 20 16.7367 19.4748 18.467 17.8524C18.5408 17.887 18.6179 17.9254 18.6981 17.9678C19.0401 18.1485 19.3538 18.3533 19.5991 18.5134C19.6454 18.5436 19.6892 18.5722 19.7303 18.5988C20.0783 18.8235 20.5425 18.7236 20.7673 18.3756C20.992 18.0277 20.8921 17.5634 20.5441 17.3387C20.511 17.3173 20.4732 17.2926 20.4312 17.2652C20.1888 17.1067 19.8086 16.8581 19.3989 16.6416L19.3754 16.6292C19.5461 16.2683 19.6609 15.8724 19.7072 15.4385C19.783 15.463 19.8592 15.4883 19.9352 15.5144C20.6223 15.7493 21.1874 15.9979 21.3436 16.0988C21.6915 16.3235 22.1558 16.2236 22.3805 15.8756C22.6052 15.5277 22.5053 15.0634 22.1574 14.8387C21.8297 14.6271 21.1044 14.3289 20.4205 14.095C20.1997 14.0195 19.9722 13.947 19.7492 13.8825C19.7605 12.7785 19.6769 11.6382 18.8494 10.6602C19.5494 11.0634 19.7282 9.55469 19.7302 9.0625V7.18761C19.7302 5.56261 18.6129 5.00011 17.6553 5.00011C16.6977 5.00011 14.7825 6.5625 14.1441 6.5625C13.378 6.5625 13.2305 6.40636 11.7501 6.40636ZM11.0745 15.6004C11.2771 15.5314 11.5162 15.5 11.7501 15.5C11.984 15.5 12.2231 15.5314 12.4257 15.6004C12.5251 15.6342 12.6467 15.6876 12.7537 15.7738C12.8612 15.8603 13.0001 16.0206 13.0001 16.25C13.0001 16.4794 12.8612 16.6397 12.7537 16.7262C12.6467 16.8124 12.5251 16.8658 12.4257 16.8996C12.2231 16.9686 11.984 17 11.7501 17C11.5162 17 11.2771 16.9686 11.0745 16.8996C10.9751 16.8658 10.8535 16.8124 10.7464 16.7262C10.6389 16.6397 10.5001 16.4794 10.5001 16.25C10.5001 16.0206 10.6389 15.8603 10.7464 15.7738C10.8535 15.6876 10.9751 15.6342 11.0745 15.6004ZM13.9201 12.5005C14.0566 12.2721 14.326 12 14.7301 12C15.1342 12 15.4036 12.2721 15.54 12.5005C15.6823 12.7387 15.7501 13.0274 15.7501 13.3125C15.7501 13.5976 15.6823 13.8863 15.54 14.1245C15.4036 14.3529 15.1342 14.625 14.7301 14.625C14.326 14.625 14.0566 14.3529 13.9201 14.1245C13.7778 13.8863 13.7101 13.5976 13.7101 13.3125C13.7101 13.0274 13.7778 12.7387 13.9201 12.5005ZM7.96016 12.5005C8.09658 12.2721 8.36599 12 8.7701 12C9.17421 12 9.44362 12.2721 9.58004 12.5005C9.72234 12.7387 9.79011 13.0274 9.79011 13.3125C9.79011 13.5976 9.72234 13.8863 9.58004 14.1245C9.44362 14.3529 9.17421 14.625 8.7701 14.625C8.36599 14.625 8.09658 14.3529 7.96016 14.1245C7.81786 13.8863 7.75009 13.5976 7.75009 13.3125C7.75009 13.0274 7.81786 12.7387 7.96016 12.5005Z'></path>
    </svg>
);
const MenuIcon = ({ className }: { className?: string }) =>
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 }
         stroke='currentColor' className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'/>
    </svg>;
const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 2 } stroke='currentColor'
         className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5'/>
    </svg>
);
const SynthIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 64 32'
        className={ className }
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        strokeLinejoin='round'
        strokeMiterlimit='10'
    >
        <rect x='3' y='13' width='26' height='16'/>
        <line x1='9' y1='21' x2='9' y2='29'/>
        <rect x='6' y='13' width='4' height='8'/>
        <line x1='16' y1='21' x2='16' y2='29'/>
        <rect x='14' y='13' width='4' height='8'/>
        <line x1='23' y1='21' x2='23' y2='29'/>
        <rect x='22' y='13' width='4' height='8'/>
        <rect x='3' y='3' width='26' height='10'/>
        <rect x='7' y='6' width='10' height='4'/>
        <circle cx='23' cy='8' r='2'/>
    </svg>
);

const BarGameIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        viewBox='0 0 1000 500'
        className={ className }
        stroke='currentColor'
        fill='currentColor'
        strokeWidth='1'
        strokeLinejoin='round'
        strokeMiterlimit='10'
    >
        <path className='st0'
              d='M383.231,0H128.766H99.484v29.286V150.56c0,35.062,11.933,69.564,33.607,97.137l1.353,1.722l1.59,1.5 l66.196,62.346c4.084,5.818,6.306,12.824,6.306,19.948v56.859c0,5.343-3.172,10.169-8.083,12.28l-0.618,0.254l-0.607,0.297 l-38.496,18.642c-18.197,8.142-29.909,26.174-29.909,46.172v14.996V512h29.282h191.792h29.282v-29.285v-14.996 c0-19.998-11.717-38.03-29.922-46.172l-38.492-18.642l-0.602-0.297l-0.615-0.254c-4.916-2.111-8.092-6.938-8.092-12.28v-56.859 c0-7.124,2.227-14.13,6.306-19.948l66.2-62.346l1.599-1.5l1.353-1.722c21.67-27.573,33.603-62.066,33.603-97.137V29.286V0H383.231z M383.231,150.56c0,28.667-9.626,56.503-27.34,79.046l-68.049,64.085c-8.855,11.263-13.668,25.181-13.668,39.523v56.859 c0,17.055,10.157,32.466,25.826,39.184l38.98,18.879c7.837,3.35,12.917,11.068,12.917,19.583v14.996H160.104v-14.996 c0-8.515,5.08-16.233,12.913-19.583l38.976-18.879c15.674-6.718,25.83-22.128,25.83-39.184v-56.859 c0-14.342-4.813-28.26-13.672-39.523l-68.037-64.085c-17.714-22.544-27.348-50.379-27.348-79.046V29.286h254.465V150.56z'></path>
        <path className='st0'
              d='M219.32,256.195c9.707,9.762,22.908,15.259,36.678,15.259c13.769,0,26.974-5.488,36.677-15.259l43.852-44.145 c13.329-17.615,20.648-39.379,20.648-61.49V94.083H154.82v56.477c0,22.103,7.323,43.866,20.66,61.498L219.32,256.195z'></path>
    </svg>
);

const LeftUpArrowIcon = ({ className }: { className?: string }) => (
    <svg
        viewBox='0 0 16 16'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'
        className={ className }
    >
        <path
            d='M16 6V5L11 0L6 5V6H10V12H1L1 14H12V6H16Z'
            fill='currentColor'
        />
    </svg>
);
