import { useState, useEffect, useRef } from 'react';
import * as React from 'react';
import Logo from './Logo';
import { useWidgets } from '../context/WidgetContext';

/* -------------------------------------------------------------------------- */
/* TYPES & HELPERS                                                            */
/* -------------------------------------------------------------------------- */

type Theme = 'light' | 'dark' | 'contrast' | 'terminal' | 'catppuccin';

const getInitialTheme = (): Theme => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export default function Navbar() {
    // State
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isWidgetsOpen, setIsWidgetsOpen] = useState(false);

    // Refs & Context
    const widgetDropdownRef = useRef<HTMLDivElement>(null);
    const { toggleWidget, isWidgetOpen } = useWidgets();

    // Effect: Apply Theme
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

    // Effect: Handle Click Outside Widget Menu
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
            className='sticky top-0 z-50 border-b border-border-base bg-page/80 backdrop-blur-md transition-colors duration-300'
        >
            <div className='flex w-full items-center justify-between px-6 py-6'>

                {/* Left Section: Logo & Desktop Links */ }
                <div className='flex items-center gap-6'>
                    <a href='/' className='flex shrink-0 items-center'>
                        <Logo className='h-8 w-auto fill-primary'/>
                    </a>

                    <div className='hidden gap-6 md:flex items-center'>
                        {/* Widget Toolbox Dropdown */ }
                        <div className='relative' ref={ widgetDropdownRef }>
                            <button
                                onClick={ () => setIsWidgetsOpen(!isWidgetsOpen) }
                                className={ `group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all focus:outline-none 
                                ${ isWidgetsOpen ? 'bg-surface-highlight text-primary' : 'text-text-main hover:text-text-muted hover:bg-surface/50' }` }
                            >
                                <ToolboxIcon className='size-4'/>
                                <span>Widgets</span>
                                <ChevronDownIcon
                                    className={ `size-3 transition-transform duration-200 ${ isWidgetsOpen ? '' : 'rotate-180' }` }
                                />
                            </button>

                            { isWidgetsOpen && (
                                <div
                                    className='absolute left-0 mt-3 w-64 origin-top-left overflow-hidden rounded-xl border border-border-base bg-surface/95 p-3 shadow-xl backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200'>
                                    <div className='grid grid-cols-2 gap-2'>
                                        <WidgetCard
                                            label='Synth'
                                            isActive={ isWidgetOpen('synth') }
                                            onClick={ () => toggleWidget('synth') }
                                            icon={ <SynthIcon className='size-8 mb-2'/> }
                                        />
                                        <WidgetCard
                                            label='Play'
                                            isActive={ isWidgetOpen('game') }
                                            onClick={ () => toggleWidget('game') }
                                            icon={ <GameIcon className='size-8 mb-2'/> }
                                        />
                                    </div>
                                </div>
                            ) }
                        </div>
                    </div>

                    <a href='https://github.com/ethanrobv/erv-world' target='_blank'
                       className='text-sm font-medium text-text-main hover:text-text-muted'>
                        About
                    </a>
                </div>

                {/* Right Section: Theme Toggle & Actions */ }
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

            {/* Mobile Menu */ }
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

/* -------------------------------------------------------------------------- */
/* SUB-COMPONENTS                                                             */
/* -------------------------------------------------------------------------- */

const WidgetCard = ({ label, isActive, onClick, icon }: {
    label: string,
    isActive: boolean,
    onClick: () => void,
    icon: React.ReactNode
}) => (
    <button
        onClick={ onClick }
        className={ `group flex aspect-square flex-col items-center justify-center rounded-lg border transition-all duration-200 
        ${ isActive
            ? 'border-primary bg-primary/10 text-primary shadow-[0_0_10px_-3px_rgba(var(--primary),0.3)]'
            : 'border-transparent bg-surface-highlight/50 text-text-muted hover:border-border-base hover:bg-surface-highlight hover:text-text-main hover:scale-105'
        }` }
    >
        <div className={ `transition-transform duration-200 ${ isActive ? 'scale-110' : 'group-hover:scale-110' }` }>
            { icon }
        </div>
        <span className='text-xs font-medium'>{ label }</span>
    </button>
);

/* -------------------------------------------------------------------------- */
/* ICONS                                                                      */
/* -------------------------------------------------------------------------- */

const SunIcon = ({ className }: { className?: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 } stroke='currentColor'
         className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round'
              d='M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z'/>
    </svg>
);

const MoonIcon = ({ className }: { className?: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 } stroke='currentColor'
         className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round'
              d='M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z'/>
    </svg>
);

const ContrastIcon = ({ className }: { className?: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 } stroke='currentColor'
         className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round'
              d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 8.625V12l1.5-1.5 1.5 1.5V3a8.25 8.25 0 0 0-3 0v9l1.5-1.5 1.5 1.5V10.875Z'/>
        <path d='M12 21.75c4.97 0 9-4.03 9-9s-4.03-9-9-9v18Z' stroke='currentColor' fill='currentColor'/>
    </svg>
);

const TerminalIcon = ({ className }: { className?: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 } stroke='currentColor'
         className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round'
              d='M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z'/>
    </svg>
);

const CatIcon = ({ className }: { className?: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='currentColor' className={ className }>
        <path
            d='M11.7501 6.40636C10.2698 6.40636 10.1222 6.5625 9.3561 6.5625C8.71769 6.5625 6.80245 5 5.84485 5C4.88724 5 3.77004 5.5625 3.77004 7.1875V9.0625C3.77197 9.55469 3.95081 11.0634 4.65075 10.6602C3.82323 11.6382 3.73963 12.7786 3.751 13.8826C3.52812 13.947 3.30072 14.0196 3.08003 14.095C2.39614 14.3289 1.67085 14.6271 1.3432 14.8387C0.995241 15.0634 0.895339 15.5277 1.12006 15.8756C1.34478 16.2236 1.80903 16.3235 2.15698 16.0988C2.3132 15.9979 2.87823 15.7493 3.56532 15.5144C3.64124 15.4884 3.71731 15.4631 3.79298 15.4386C3.83925 15.8724 3.95408 16.2684 4.12478 16.6292L4.1012 16.6416C3.69148 16.8581 3.3113 17.1067 3.06889 17.2652C3.02694 17.2926 2.98912 17.3173 2.95599 17.3387C2.60803 17.5634 2.50813 18.0277 2.73285 18.3756C2.95757 18.7236 3.42182 18.8235 3.76978 18.5988C3.8109 18.5722 3.85472 18.5436 3.90097 18.5134C4.1463 18.3533 4.45999 18.1485 4.80199 17.9678C4.88218 17.9254 4.95935 17.887 5.03317 17.8524C6.76347 19.4748 9.86991 20 11.7501 20C13.6302 20 16.7367 19.4748 18.467 17.8524C18.5408 17.887 18.6179 17.9254 18.6981 17.9678C19.0401 18.1485 19.3538 18.3533 19.5991 18.5134C19.6454 18.5436 19.6892 18.5722 19.7303 18.5988C20.0783 18.8235 20.5425 18.7236 20.7673 18.3756C20.992 18.0277 20.8921 17.5634 20.5441 17.3387C20.511 17.3173 20.4732 17.2926 20.4312 17.2652C20.1888 17.1067 19.8086 16.8581 19.3989 16.6416L19.3754 16.6292C19.5461 16.2683 19.6609 15.8724 19.7072 15.4385C19.783 15.463 19.8592 15.4883 19.9352 15.5144C20.6223 15.7493 21.1874 15.9979 21.3436 16.0988C21.6915 16.3235 22.1558 16.2236 22.3805 15.8756C22.6052 15.5277 22.5053 15.0634 22.1574 14.8387C21.8297 14.6271 21.1044 14.3289 20.4205 14.095C20.1997 14.0195 19.9722 13.947 19.7492 13.8825C19.7605 12.7785 19.6769 11.6382 18.8494 10.6602C19.5494 11.0634 19.7282 9.55469 19.7302 9.0625V7.18761C19.7302 5.56261 18.6129 5.00011 17.6553 5.00011C16.6977 5.00011 14.7825 6.5625 14.1441 6.5625C13.378 6.5625 13.2305 6.40636 11.7501 6.40636ZM11.0745 15.6004C11.2771 15.5314 11.5162 15.5 11.7501 15.5C11.984 15.5 12.2231 15.5314 12.4257 15.6004C12.5251 15.6342 12.6467 15.6876 12.7537 15.7738C12.8612 15.8603 13.0001 16.0206 13.0001 16.25C13.0001 16.4794 12.8612 16.6397 12.7537 16.7262C12.6467 16.8124 12.5251 16.8658 12.4257 16.8996C12.2231 16.9686 11.984 17 11.7501 17C11.5162 17 11.2771 16.9686 11.0745 16.8996C10.9751 16.8658 10.8535 16.8124 10.7464 16.7262C10.6389 16.6397 10.5001 16.4794 10.5001 16.25C10.5001 16.0206 10.6389 15.8603 10.7464 15.7738C10.8535 15.6876 10.9751 15.6342 11.0745 15.6004ZM13.9201 12.5005C14.0566 12.2721 14.326 12 14.7301 12C15.1342 12 15.4036 12.2721 15.54 12.5005C15.6823 12.7387 15.7501 13.0274 15.7501 13.3125C15.7501 13.5976 15.6823 13.8863 15.54 14.1245C15.4036 14.3529 15.1342 14.625 14.7301 14.625C14.326 14.625 14.0566 14.3529 13.9201 14.1245C13.7778 13.8863 13.7101 13.5976 13.7101 13.3125C13.7101 13.0274 13.7778 12.7387 13.9201 12.5005ZM7.96016 12.5005C8.09658 12.2721 8.36599 12 8.7701 12C9.17421 12 9.44362 12.2721 9.58004 12.5005C9.72234 12.7387 9.79011 13.0274 9.79011 13.3125C9.79011 13.5976 9.72234 13.8863 9.58004 14.1245C9.44362 14.3529 9.17421 14.625 8.7701 14.625C8.36599 14.625 8.09658 14.3529 7.96016 14.1245C7.81786 13.8863 7.75009 13.5976 7.75009 13.3125C7.75009 13.0274 7.81786 12.7387 7.96016 12.5005Z'/>
    </svg>
);

const MenuIcon = ({ className }: { className?: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 } stroke='currentColor'
         className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round' d='M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5'/>
    </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 2 } stroke='currentColor'
         className={ className }>
        <path strokeLinecap='round' strokeLinejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5'/>
    </svg>
);

const ToolboxIcon = ({ className }: { className?: string }) => (
    <svg viewBox='0 0 24 24' fill='currentColor' xmlns='http://www.w3.org/2000/svg' className={ className }>
        <path
            d='M17 5.5H20C21.1046 5.5 22 6.39543 22 7.5V19.5C22 20.6046 21.1046 21.5 20 21.5H4C2.89543 21.5 2 20.6046 2 19.5V7.5C2 6.39543 2.89543 5.5 4 5.5H7C7 3.84315 8.34315 2.5 10 2.5H14C15.6569 2.5 17 3.84315 17 5.5ZM14 4.5H10C9.44772 4.5 9 4.94772 9 5.5H15C15 4.94772 14.5523 4.5 14 4.5ZM20 7.5H4V9.5H20V7.5ZM4 19.5V11.5H7V13.5H11V11.5H13V13.5H17V11.5H20V19.5H4Z'/>
    </svg>
);

const SynthIcon = ({ className }: { className?: string }) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5'
         strokeLinecap='round' strokeLinejoin='round' className={ className }>
        <rect x='2' y='4' width='20' height='16' rx='2'/>
        <path d='M6 20V12'/>
        <path d='M10 20V12'/>
        <path d='M14 20V12'/>
        <path d='M18 20V12'/>
        <path d='M2 12h20'/>
        <path d='M6 8h.01'/>
        <path d='M10 8h.01'/>
    </svg>
);

const GameIcon = ({ className }: { className?: string }) => (
    <svg height='200px' width='200px' version='1.1' xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'
         fill='currentColor' className={ className }>
        <path className='st0'
              d='M474.658,121.941L304.895,60.196v18.563l163.783,59.66c1.884,0.671,3.493,1.616,4.979,2.764 c0.734,0.536,1.475,1.207,2.082,1.877c4.503,4.783,6.186,11.911,3.832,18.571L362.74,482.528 c-3.426,9.408-13.859,14.257-23.271,10.824L132.982,418.22c-3.095-1.14-5.717-3.024-7.669-5.445h-19.774 c3.364,9.818,10.961,18.027,21.453,21.863l206.488,75.19c13.118,4.775,27.108,1.416,36.59-7.531 c1.349-1.214,2.559-2.556,3.699-4.038c2.22-2.89,4.108-6.123,5.382-9.75l116.831-320.898 C502.708,149.115,493.155,128.668,474.658,121.941z'/>
        <path className='st0'
              d='M413.483,209.766l0.69-0.455c4.898-6.13,23.565-18.831,29.483-20.842l0.342-0.275l-0.086-0.417 c-3.236-5.356-9.386-27.07-9.188-34.921l-0.235-0.797l-0.703,0.454c-4.902,6.138-23.57,18.823-29.48,20.85l-0.346,0.26l0.089,0.425 c3.24,5.356,9.382,27.077,9.184,34.928L413.483,209.766z'/>
        <path className='st0'
              d='M304.88,377.116v-53.41c0.004,0.008,0.011,0.015,0.011,0.015l0.004-2.555c1.009-0.745,1.952-1.415,2.961-2.153 c0.67-0.469,1.348-0.939,2.019-1.416c14.462-10.22,29.532-19.3,36.657-21.721l0.808-0.603l-0.205-1.013 c-2.618-4.298-6.049-13.178-9.345-23.74c-0.607-1.877-1.211-3.829-1.822-5.855c-3.158-10.757-6.116-22.526-8-32.687 c-1.282-6.786-2.09-12.909-2.153-17.349v-2.093c-0.067-0.67-0.134-1.14-0.54-1.274c-0.465-0.134-0.808,0.134-1.274,0.67 c-0.071,0.142-0.205,0.269-0.343,0.41c-0.197,0.194-0.398,0.462-0.603,0.738c-2.957,3.434-7.598,7.8-13.181,12.306 c-1.616,1.348-3.225,2.696-4.98,4.038v87.772c0,0-0.011-0.008-0.015-0.014v-98.127c0.004,0.008,0.011,0.008,0.015,0.014v-7.33 c0,0-0.011,0.008-0.015,0.008V35.636C304.869,15.948,288.932,0.008,269.24,0H49.504c-19.691,0.008-35.625,15.948-35.64,35.636 v341.48c0.014,19.688,15.948,35.629,35.64,35.636H269.24C288.932,412.745,304.869,396.804,304.88,377.116z M31.351,377.116V35.636 c0.026-10.019,8.13-18.131,18.153-18.153H269.24c10.026,0.022,18.131,8.134,18.157,18.153v341.48 c-0.026,10.018-8.13,18.13-18.157,18.146H49.504C39.481,395.247,31.377,387.135,31.351,377.116z'/>
        <path className='st0'
              d='M206.21,153.175c-17.39-13.825-41.692-4.142-46.843,15.189c-5.125-19.33-29.427-29.014-46.821-15.189 c-16.656,13.252-15.315,39.644,0.998,60.792c15.069,19.554,38.623,38.392,44.97,51.466l0.853,0.648l0.879-0.648 c6.332-13.074,29.886-31.912,44.966-51.466C221.518,192.819,222.855,166.427,206.21,153.175z'/>
        <path className='st0'
              d='M100.225,48.635c-7.896-6.265-18.902-1.877-21.23,6.882c-2.324-8.76-13.334-13.147-21.216-6.882 c-7.542,6.004-6.95,17.952,0.447,27.539C65.058,85.046,75.74,93.575,78.6,99.49l0.395,0.298l0.394-0.298 c2.876-5.915,13.543-14.444,20.377-23.316C107.159,66.587,107.766,54.639,100.225,48.635z'/>
        <path className='st0'
              d='M239.749,334.194c-2.324-8.752-13.334-13.14-21.215-6.882c-7.542,6.012-6.95,17.96,0.447,27.546 c6.831,8.872,17.498,17.394,20.373,23.315l0.395,0.298l0.395-0.298c2.875-5.922,13.542-14.443,20.373-23.315 c7.397-9.587,8-21.535,0.462-27.546C253.083,321.055,242.073,325.442,239.749,334.194z'/>
    </svg>
);

const LeftUpArrowIcon = ({ className }: { className?: string }) => (
    <svg viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg' className={ className }>
        <path d='M16 6V5L11 0L6 5V6H10V12H1L1 14H12V6H16Z' fill='currentColor'/>
    </svg>
);
