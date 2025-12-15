import { useState, useEffect, useRef } from 'react';
import logoImage from '../assets/logo-transparent.svg';
import { useWidgets } from '../context/WidgetContext';

type Theme = 'light' | 'dark' | 'contrast';

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
      return 'light';
    });
  };

  return (
    <nav
      className='sticky top-0 z-50 border-b border-border-base bg-page/80 backdrop-blur-md transition-colors duration-300'>
      <div className='flex w-full items-center justify-between px-6 py-6'>

        <div className='flex items-center gap-8'>
          <a href='/' className='flex shrink-0 items-center'>
            <img src={ logoImage } alt='logo' className='h-8 w-auto'/>
          </a>

          <div className='hidden gap-6 md:flex items-center'>
            <a href='#' className='text-sm font-medium text-text-main hover:text-text-muted'>Features</a>
            <a href='#' className='text-sm font-medium text-text-main hover:text-text-muted'>Pricing</a>

            <div className='relative' ref={ widgetDropdownRef }>
              <button
                onClick={ () => setIsWidgetsOpen(!isWidgetsOpen) }
                className='flex items-center gap-1 text-sm font-medium cursor-pointer text-text-main hover:text-text-muted focus:outline-none'
              >
                Widgets
                <ChevronDownIcon className={ `size-3 transition-transform ${ isWidgetsOpen ? 'rotate-180' : '' }` }/>
              </button>

              { isWidgetsOpen && (
                <div
                  className='absolute left-0 mt-2 w-48 origin-top-left rounded-md border border-border-base bg-surface shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in zoom-in-95 duration-100'>
                  <div className='py-1'>
                    <button
                      data-active={ isWidgetOpen('synth') }
                      onClick={ () => toggleWidget('synth') }
                      className='group flex w-full items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-surface-highlight data-[active=true]:border'
                    >
                      <SynthIcon className='size-fit'/>
                    </button>
                  </div>
                  <div className='py-1 border-t border-border-base'>
                    <button
                      className='group flex w-full items-center gap-2 px-4 py-2 text-sm text-text-main hover:bg-surface-highlight'>
                      Sequencer
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
            { theme === 'light' && <SunIcon/> }
            { theme === 'dark' && <MoonIcon/> }
            { theme === 'contrast' && <ContrastIcon/> }
          </button>

          <div className='hidden gap-4 md:flex'>
            <button className='text-sm font-medium text-text-main hover:text-text-muted'>
              Log in
            </button>
            <button className='rounded-md bg-primary text-primary-fg px-4 py-2 text-sm font-medium hover:opacity-90'>
              Sign up
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
            <a href='#' className='text-sm font-medium text-text-main'>Features</a>
            <a href='#' className='text-sm font-medium text-text-main'>Pricing</a>
            <button className='w-full rounded-md bg-primary text-primary-fg px-4 py-2 text-sm font-medium'>
              Sign up
            </button>
          </div>
        </div>
      ) }
    </nav>
  );
}

const SunIcon = () =>
  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 }
       stroke='currentColor' className='size-5'>
    <path strokeLinecap='round' strokeLinejoin='round'
          d='M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z'/>
  </svg>;
const MoonIcon = () =>
  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 }
       stroke='currentColor' className='size-5'>
    <path strokeLinecap='round' strokeLinejoin='round'
          d='M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z'/>
  </svg>;
const ContrastIcon = () =>
  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 }
       stroke='currentColor' className='size-5'>
    <path strokeLinecap='round' strokeLinejoin='round'
          d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm0 8.625V12l1.5-1.5 1.5 1.5V3a8.25 8.25 0 0 0-3 0v9l1.5-1.5 1.5 1.5V10.875Z'/>
    <path d='M12 21.75c4.97 0 9-4.03 9-9s-4.03-9-9-9v18Z' stroke='currentColor' fill='currentColor'/>
  </svg>;
const MenuIcon = () =>
  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={ 1.5 }
       stroke='currentColor' className='size-6'>
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
