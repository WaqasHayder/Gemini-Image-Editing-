/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { ZoomInIcon, ZoomOutIcon } from './icons';

interface ZoomControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    canZoomIn: boolean;
    canZoomOut: boolean;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomIn, onZoomOut, onReset, canZoomIn, canZoomOut }) => {
    const buttonClass = "p-2 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/20 rounded-md transition-all active:scale-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-sky-400";
    
    return (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-0.5 p-1 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg shadow-lg">
            <button onClick={onZoomOut} disabled={!canZoomOut} className={buttonClass} aria-label="Zoom out">
                <ZoomOutIcon className="w-5 h-5" />
            </button>
            <button onClick={onReset} disabled={!canZoomOut} className={`${buttonClass} text-sm font-bold w-9 h-9 flex items-center justify-center`} aria-label="Reset zoom">
                1x
            </button>
            <button onClick={onZoomIn} disabled={!canZoomIn} className={buttonClass} aria-label="Zoom in">
                <ZoomInIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export default ZoomControls;
