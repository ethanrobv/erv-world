import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import DynamicThemeWrapper from '@/components/theme/DynamicThemeWrapper';
import WidgetToolbar from '@/components/widgets/WidgetToolbar';
import React from "react";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'erv world',
    description: 'Personal website; widgets, games, and learning.',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
        <body className={ inter.className }>
        <DynamicThemeWrapper>
            {/* Main Site Container */ }
            <div className="relative min-h-screen flex flex-col transition-colors duration-1000">
                { children }
                {/* Widget Toolbar is persistent across all pages */ }
                <WidgetToolbar/>
            </div>
        </DynamicThemeWrapper>
        </body>
        </html>
    );
}
