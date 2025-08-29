/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef } from 'react';
import { UploadIcon } from './icons';

interface TryOnPanelProps {
  onApplyTryOn: (details: { prompt: string } | { garmentImage: File }) => void;
  isLoading: boolean;
  isHotspotSelected: boolean;
}

type TryOnMode = 'text' | 'image';

const TryOnPanel: React.FC<TryOnPanelProps> = ({ onApplyTryOn, isLoading, isHotspotSelected }) => {
  const [mode, setMode] = useState<TryOnMode>('text');
  const [prompt, setPrompt] = useState('');
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [garmentPreview, setGarmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setGarmentFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGarmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = () => {
    if (mode === 'text' && prompt.trim()) {
      onApplyTryOn({ prompt });
    } else if (mode === 'image' && garmentFile) {
      onApplyTryOn({ garmentImage: garmentFile });
    }
  };

  const canGenerate = isHotspotSelected && !isLoading && ((mode === 'text' && !!prompt.trim()) || (mode === 'image' && !!garmentFile));

  return (
    <div className="w-full bg-black/20 border border-white/10 rounded-2xl p-6 flex flex-col gap-4 animate-fadeInUp backdrop-blur-2xl shadow-2xl">
      <h3 className="text-xl font-semibold text-center text-gray-200">Virtual Try-On</h3>
      
      {/* Mode Switcher */}
      <div className="flex items-center justify-center p-1 bg-black/20 rounded-lg mx-auto">
        <button onClick={() => setMode('text')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${mode === 'text' ? 'bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white' : 'hover:bg-white/10 text-gray-300'}`}>
          Describe Outfit
        </button>
        <button onClick={() => setMode('image')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${mode === 'image' ? 'bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white' : 'hover:bg-white/10 text-gray-300'}`}>
          Upload Garment
        </button>
      </div>

      <p className="text-md text-center text-gray-400 -mt-2">
        {isHotspotSelected ? 'Great! Now provide the new clothing below.' : 'Click an item of clothing on the image to replace it.'}
      </p>

      {mode === 'text' && (
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={isHotspotSelected ? "e.g., 'blue denim jacket'" : "First click the clothing to replace"}
          className="flex-grow bg-black/20 border border-white/20 text-gray-200 placeholder:text-gray-400 rounded-lg p-4 text-base focus:ring-2 focus:ring-[#7C5CFF] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading || !isHotspotSelected}
        />
      )}

      {mode === 'image' && (
        <div 
            className="w-full p-4 border-2 border-dashed border-white/20 rounded-lg text-center cursor-pointer hover:bg-white/5 hover:border-[#7C5CFF] transition-colors"
            onClick={() => fileInputRef.current?.click()}
        >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            {garmentPreview ? (
                <img src={garmentPreview} alt="Garment preview" className="mx-auto h-24 w-auto rounded-md object-contain" />
            ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                    <UploadIcon className="w-8 h-8"/>
                    <p>Click to upload garment image</p>
                </div>
            )}
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white font-bold py-4 px-8 text-base rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#5EE7DF]/20 hover:shadow-xl hover:shadow-[#5EE7DF]/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-gray-600 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
      >
        Generate
      </button>

    </div>
  );
};

export default TryOnPanel;
