/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';

interface AdjustmentPanelProps {
  onApplyAdjustment: (prompt: string) => void;
  isLoading: boolean;
}

const AdjustmentPanel: React.FC<AdjustmentPanelProps> = ({ onApplyAdjustment, isLoading }) => {
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [color, setColor] = useState('#7C5CFF');

  const presets = [
    { name: 'Blur Background', prompt: 'Apply a realistic depth-of-field effect, making the background blurry while keeping the main subject in sharp focus.' },
    { name: 'Enhance Details', prompt: 'Slightly enhance the sharpness and details of the image without making it look unnatural.' },
    { name: 'Warmer Lighting', prompt: 'Adjust the color temperature to give the image warmer, golden-hour style lighting.' },
    { name: 'Studio Light', prompt: 'Add dramatic, professional studio lighting to the main subject.' },
  ];

  const colorPresets = [
    { name: 'Apply Tint', prompt: `Apply a subtle, photorealistic tint of the color ${color} to the entire image.` },
    { name: 'Change Sky', prompt: `Realistically change the color of the sky to ${color}, if a sky is present.` },
  ];

  const activePrompt = selectedPresetPrompt || customPrompt;

  const handlePresetClick = (prompt: string) => {
    setSelectedPresetPrompt(prompt);
    setCustomPrompt('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrompt(e.target.value);
    setSelectedPresetPrompt(null);
  };

  const handleApply = () => {
    if (activePrompt) {
      onApplyAdjustment(activePrompt);
    }
  };

  return (
    <div className="w-full bg-black/20 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 animate-fadeInUp backdrop-blur-2xl shadow-2xl">
      <h3 className="text-xl font-semibold text-center text-gray-200">Professional Adjustments</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {presets.map(preset => (
          <button
            key={preset.name}
            onClick={() => handlePresetClick(preset.prompt)}
            disabled={isLoading}
            className={`w-full text-center bg-white/5 border border-white/10 text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/20 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed ${selectedPresetPrompt === preset.prompt ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-[#7C5CFF]' : ''}`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={customPrompt}
        onChange={handleCustomChange}
        placeholder="Or describe an adjustment (e.g., 'change background to a forest')"
        className="flex-grow bg-black/20 border border-white/20 text-gray-200 placeholder:text-gray-400 rounded-lg p-4 focus:ring-2 focus:ring-[#7C5CFF] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 text-base"
        disabled={isLoading}
      />

      <div className="w-full h-px bg-white/10 my-1"></div>
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
            <label htmlFor="color-picker" className="text-sm font-medium text-gray-300">Pick a color:</label>
            <div className="relative w-8 h-8">
                <input
                    id="color-picker"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isLoading}
                    title="Select a color"
                />
                <div 
                    className="w-full h-full rounded-full border-2 border-white/30 pointer-events-none"
                    style={{ backgroundColor: color }}
                ></div>
            </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
            {colorPresets.map(preset => (
                <button
                    key={preset.name}
                    onClick={() => onApplyAdjustment(preset.prompt)}
                    disabled={isLoading}
                    className="text-center bg-white/5 border border-white/10 text-gray-200 font-semibold py-2 px-4 rounded-lg transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-white/20 active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {preset.name}
                </button>
            ))}
        </div>
      </div>


      {activePrompt && (
        <div className="animate-fadeInUp flex flex-col gap-4 pt-2">
            <button
                onClick={handleApply}
                className="w-full bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#5EE7DF]/20 hover:shadow-xl hover:shadow-[#5EE7DF]/40 hover:-translate-y-px active:scale-95 active:shadow-inner text-base disabled:from-gray-600 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
                disabled={isLoading || !activePrompt.trim()}
            >
                Apply Adjustment
            </button>
        </div>
      )}
    </div>
  );
};

export default AdjustmentPanel;