/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { UploadIcon } from './icons';

interface DesignPanelProps {
  onApplyStyle: (prompt: string) => void;
  isLoading: boolean;
  referenceImage: File | null;
  onSetReferenceImage: (file: File | null) => void;
  isStyleLocked: boolean;
  onSetIsStyleLocked: (locked: boolean) => void;
}

const styleModifiers = [
    { name: 'Enhance Realism', prompt: 'Focus on creating ultra-realistic lighting, shadows, and material textures to make the scene look like a high-quality photograph.' },
    { name: 'Modern Minimalist', prompt: 'Apply a modern minimalist style with clean lines, neutral colors (like whites, greys, and blacks), and natural materials like light wood and concrete.' },
    { name: 'Cozy & Warm', prompt: 'Create a cozy and warm ambiance. Use soft, warm lighting, comfortable textures like wool and plush fabrics, and a warm color palette.' },
    { name: 'Luxurious & Elegant', prompt: 'Infuse the scene with a sense of luxury and elegance. Use rich materials like marble, velvet, and brass, with sophisticated lighting.' },
]

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({ checked, onChange, disabled }) => {
    return (
        <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" disabled={disabled} />
            <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-purple-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
        </label>
    );
};

const DesignPanel: React.FC<DesignPanelProps> = ({ onApplyStyle, isLoading, referenceImage, onSetReferenceImage, isStyleLocked, onSetIsStyleLocked }) => {
  const [prompt, setPrompt] = useState('');
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [selectedModifier, setSelectedModifier] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (referenceImage) {
        const url = URL.createObjectURL(referenceImage);
        setReferencePreview(url);
        return () => URL.revokeObjectURL(url);
    } else {
        setReferencePreview(null);
    }
  }, [referenceImage]);


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      onSetReferenceImage(file);
    }
  };

  const handleModifierClick = (modifier: {name: string, prompt: string}) => {
    if (selectedModifier === modifier.name) {
        setSelectedModifier(null); // Deselect if clicked again
    } else {
        setSelectedModifier(modifier.name);
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (referenceImage) {
        const modifierPrompt = styleModifiers.find(m => m.name === selectedModifier)?.prompt || '';
        const combinedPrompt = [prompt, modifierPrompt].filter(Boolean).join(' ');
        onApplyStyle(combinedPrompt);
    }
  };

  const canGenerate = !isLoading && referenceImage;

  return (
    <div className="w-full bg-black/20 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 animate-fadeInUp backdrop-blur-2xl shadow-2xl">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-200">AI Interior Designer</h3>
        <p className="text-md text-gray-400">
          Apply the style of a reference image to your main image.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        {/* Reference Image Uploader */}
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">1. Upload Style Reference</label>
            <div 
                className="w-full h-40 p-4 border-2 border-dashed border-white/20 rounded-lg text-center cursor-pointer hover:bg-white/5 hover:border-[#7C5CFF] transition-colors flex items-center justify-center"
                onClick={() => fileInputRef.current?.click()}
            >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                {referencePreview ? (
                    <img src={referencePreview} alt="Reference preview" className="max-h-full w-auto rounded-md object-contain" />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                        <UploadIcon className="w-8 h-8"/>
                        <p>Click to upload style</p>
                    </div>
                )}
            </div>
        </div>

        {/* Prompt Input */}
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-300">2. (Optional) Add Instructions</label>
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., 'make the floor marble with golden veins', 'apply a scandinavian furniture style'"
                className="flex-grow bg-black/20 border border-white/20 text-gray-200 placeholder:text-gray-400 rounded-lg p-3 text-base focus:ring-2 focus:ring-[#7C5CFF] focus:outline-none transition w-full h-40 resize-none disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
                rows={4}
            />
        </div>
      </div>
      
      {/* Style Modifiers */}
       <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-gray-300 text-center">3. (Optional) Select a Style Modifier</label>
            <div className="flex flex-wrap gap-2 justify-center">
                {styleModifiers.map(modifier => (
                    <button
                        key={modifier.name}
                        onClick={() => handleModifierClick(modifier)}
                        disabled={isLoading}
                        className={`px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 ${
                            selectedModifier === modifier.name
                            ? 'bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white shadow-md shadow-[#5EE7DF]/20' 
                            : 'bg-white/5 hover:bg-white/10 text-gray-300'
                        }`}
                    >
                        {modifier.name}
                    </button>
                ))}
            </div>
      </div>


      <form onSubmit={handleGenerate} className="flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
                <ToggleSwitch checked={isStyleLocked} onChange={onSetIsStyleLocked} disabled={isLoading} />
                <span className="text-sm font-medium text-gray-300">Lock Style</span>
            </div>
            <p className="text-xs text-gray-500 text-center">
                Keeps the generated style consistent for subsequent edits. <br/> Resets if you change the reference image.
            </p>
        </div>
        <button
          type="submit"
          disabled={!canGenerate}
          className="w-full mt-2 bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white font-bold py-4 px-8 text-base rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#5EE7DF]/20 hover:shadow-xl hover:shadow-[#5EE7DF]/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-gray-600 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          Generate Style
        </button>
      </form>

    </div>
  );
};

export default DesignPanel;