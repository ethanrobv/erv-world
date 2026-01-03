'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSiteStore } from '@/lib/stores/useSiteStore';
import { Settings, Fish, X, ArrowUpIcon } from 'lucide-react';

/**
 * Global system toolbar.
 * Provides access to the Game Widget and other site-wide utilities.
 * Uses a fixed position with a high Z-Index to overlay above the Phaser Canvas.
 */
export default function WidgetToolbar() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const router = useRouter();
    const pathname = usePathname();
    const { isWidgetOpen, toggleWidget } = useSiteStore();

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    /**
     * Toggles the game route and updates the global store state.
     */
    const handleToggleGame = () => {
        toggleWidget();
        setIsOpen(false);

        // If we are currently on the home page, go to fishing, or vice versa
        // Logic depends on whether 'isWidgetOpen' implies the route is active
        if (pathname === '/fishing') {
            router.push('/');
        } else {
            router.push('/fishing');
        }
    };

    const isFishingActive = pathname === '/fishing';

    return (
        <div ref={ menuRef } className="fixed top-6 right-6 z-[100] font-mono select-none">
            {/* Main Toggle Button */ }
            <button
                onClick={ () => setIsOpen(!isOpen) }
                className={ `
                    flex items-center gap-2 px-4 py-2 border-2 transition-all duration-150 active:translate-y-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]
                    ${ isOpen
                    ? 'bg-yellow-400 text-black border-white'
                    : 'bg-black text-white border-white hover:bg-gray-900' }
                ` }
                aria-label="System Menu"
            >
                { isOpen ? <X size={ 18 }/> : <Settings size={ 18 }/> }
                <span className="text-sm font-bold tracking-widest hidden sm:inline">Widgets</span>
            </button>

            {/* Dropdown Panel */ }
            { isOpen && (
                <div
                    className="absolute right-0 mt-3 w-64 bg-slate-900 border-2 border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)] p-1 animate-in fade-in slide-in-from-top-2 duration-100">

                    {/* Header */ }
                    <div className="bg-white text-black text-[10px] px-2 py-1 font-bold mb-1 flex justify-between">
                        <span>CONTROL PANEL</span>
                    </div>

                    <div className="space-y-1">
                        {/* Widget: Webfishing */ }
                        <button
                            onClick={ handleToggleGame }
                            className={ `
                                w-full text-left px-3 py-3 border border-transparent hover:border-yellow-400 group flex items-center justify-between transition-colors
                                ${ isFishingActive ? 'bg-blue-900/30' : 'hover:bg-gray-800' }
                            ` }
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={ `p-1.5 border ${ isFishingActive ? 'border-green-400 bg-green-900/50 text-green-400' : 'border-gray-600 text-gray-400' }` }>
                                    <Fish size={ 16 }/>
                                </div>
                                <div>
                                    <div
                                        className={ `text-xs font-bold ${ isFishingActive ? 'text-green-400' : 'text-gray-300 group-hover:text-yellow-400' }` }>
                                        Fishing
                                    </div>
                                    <div className="text-[10px] text-gray-500 uppercase">
                                        { isFishingActive ? 'Process Running' : 'Offline' }
                                    </div>
                                </div>
                            </div>

                            {/* Status Light */ }
                            <div
                                className={ `w-2 h-2 rounded-full ${ isFishingActive ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-900' }` }/>
                        </button>

                        {/* Divider */ }
                        <div className="h-px bg-gray-700 my-1"/>

                        {/* System Exit (Mock functionality for aesthetics) */ }
                        <button
                            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center gap-2 group"
                            onClick={ () => setIsOpen(false) }
                        >
                            <ArrowUpIcon size={ 14 }/>
                            <span className="transition-transform">COLLAPSE</span>
                        </button>
                    </div>
                </div>
            ) }
        </div>
    );
}
