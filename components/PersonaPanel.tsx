/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { generatePromptSuggestion } from '../services/geminiService';
import { MagicWandIcon } from './icons';

interface PersonaPanelProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  currentImage: File | null;
}

const styles = ['Photorealistic', 'Cinematic', 'Digital Art', '3D Character'];
const emotions = ['Neutral', 'Smiling', 'Serious', 'Thoughtful'];

// Moved FormRow and StyleButton outside the PersonaPanel component.
// This prevents them from being redeclared on every render, which was causing
// input fields to lose focus.
const FormRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center">
        <label className="text-sm font-medium text-gray-300 sm:text-right">{label}</label>
        <div className="sm:col-span-2">{children}</div>
    </div>
);

const StyleButton: React.FC<{ name: string; selected: boolean; onClick: () => void; isLoading: boolean; }> = ({ name, selected, onClick, isLoading}) => (
  <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      className={`px-3 py-2 w-full rounded-md text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 ${
          selected
          ? 'bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white shadow-md shadow-[#5EE7DF]/20' 
          : 'bg-white/5 hover:bg-white/10 text-gray-300'
      }`}
  >
      {name}
  </button>
);


const PersonaPanel: React.FC<PersonaPanelProps> = ({ onGenerate, isLoading, currentImage }) => {
  const [basePrompt, setBasePrompt] = useState('A headshot of the person');
  const [selectedStyle, setSelectedStyle] = useState<string>('Photorealistic');
  const [pose, setPose] = useState('');
  const [outfit, setOutfit] = useState('');
  const [background, setBackground] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('Neutral');
  const [age, setAge] = useState('');
  const [suggestionLoading, setSuggestionLoading] = useState<string | null>(null);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct a detailed, human-readable prompt
    const parts = [
        basePrompt.trim(),
        `Style: ${selectedStyle}.`,
    ];
    if (pose.trim()) parts.push(`Pose: ${pose.trim()}.`);
    if (outfit.trim()) parts.push(`Outfit: wearing ${outfit.trim()}.`);
    if (background.trim()) parts.push(`Background: ${background.trim()}.`);
    if (selectedEmotion) parts.push(`Emotion: a ${selectedEmotion.toLowerCase()} expression.`);
    if (age.trim()) parts.push(`Age: appearing to be ${age.trim()}.`);

    const fullPrompt = parts.join(' ');
    onGenerate(fullPrompt);
  };
  
  const handleGenerateSuggestion = async (suggestionType: 'pose' | 'outfit' | 'background' | 'age') => {
      if (!currentImage || suggestionLoading) return;
      setSuggestionLoading(suggestionType);
      try {
          const suggestion = await generatePromptSuggestion(currentImage, suggestionType);
          switch (suggestionType) {
              case 'pose': setPose(suggestion); break;
              case 'outfit': setOutfit(suggestion); break;
              case 'background': setBackground(suggestion); break;
              case 'age': setAge(suggestion); break;
          }
      } catch (err) {
          console.error(`Failed to generate suggestion for ${suggestionType}`, err);
          // Optional: You could add a state to show a small error message to the user.
      } finally {
          setSuggestionLoading(null);
      }
  };

  const canGenerate = !isLoading && basePrompt.trim();
  const isSuggesting = !!suggestionLoading;

  return (
    <div className="w-full bg-black/20 border border-white/10 rounded-2xl p-6 flex flex-col gap-6 animate-fadeInUp backdrop-blur-2xl shadow-2xl">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-200">AI Persona Generator</h3>
        <p className="text-md text-gray-400">
          Create variations of the person in your image while keeping their identity consistent.
        </p>
      </div>
      
      <form onSubmit={handleGenerate} className="flex flex-col gap-4">
        
        <FormRow label="Main Scenario">
            <input
                type="text"
                value={basePrompt}
                onChange={(e) => setBasePrompt(e.target.value)}
                placeholder="e.g., A photo of the person at a cafe"
                className="flex-grow bg-black/20 border border-white/20 text-gray-200 placeholder:text-gray-400 rounded-lg p-2 text-base focus:ring-2 focus:ring-[#7C5CFF] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoading}
            />
        </FormRow>
        
        <FormRow label="Artistic Style">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {styles.map(style => <StyleButton key={style} name={style} selected={selectedStyle === style} onClick={() => setSelectedStyle(style)} isLoading={isLoading} />)}
            </div>
        </FormRow>
        
        <FormRow label="Pose / Angle">
             <div className="relative flex items-center">
                <input
                    type="text"
                    value={pose}
                    onChange={(e) => setPose(e.target.value)}
                    placeholder="(leave blank to keep original)"
                    className="flex-grow bg-black/20 border border-white/20 text-gray-200 placeholder:text-gray-400 rounded-lg p-2 text-base focus:ring-2 focus:ring-[#7C5CFF] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 pr-10"
                    disabled={isLoading || isSuggesting}
                />
                <button
                    type="button"
                    onClick={() => handleGenerateSuggestion('pose')}
                    disabled={isLoading || isSuggesting}
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Generate pose suggestion"
                >
                    <MagicWandIcon className={`w-5 h-5 ${suggestionLoading === 'pose' ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </FormRow>

        <FormRow label="Outfit">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={outfit}
                    onChange={(e) => setOutfit(e.target.value)}
                    placeholder="(leave blank to keep original)"
                    className="flex-grow bg-black/20 border border-white/20 text-gray-200 placeholder:text-gray-400 rounded-lg p-2 text-base focus:ring-2 focus:ring-[#7C5CFF] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 pr-10"
                    disabled={isLoading || isSuggesting}
                />
                <button
                    type="button"
                    onClick={() => handleGenerateSuggestion('outfit')}
                    disabled={isLoading || isSuggesting}
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Generate outfit suggestion"
                >
                    <MagicWandIcon className={`w-5 h-5 ${suggestionLoading === 'outfit' ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </FormRow>
        
         <FormRow label="Background">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    placeholder="(leave blank to keep original)"
                    className="flex-grow bg-black/20 border border-white/20 text-gray-200 placeholder:text-gray-400 rounded-lg p-2 text-base focus:ring-2 focus:ring-[#7C5CFF] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 pr-10"
                    disabled={isLoading || isSuggesting}
                />
                <button
                    type="button"
                    onClick={() => handleGenerateSuggestion('background')}
                    disabled={isLoading || isSuggesting}
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Generate background suggestion"
                >
                    <MagicWandIcon className={`w-5 h-5 ${suggestionLoading === 'background' ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </FormRow>

        <FormRow label="Emotion">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {emotions.map(emotion => <StyleButton key={emotion} name={emotion} selected={selectedEmotion === emotion} onClick={() => setSelectedEmotion(emotion)} isLoading={isLoading || isSuggesting} />)}
            </div>
        </FormRow>
        
        <FormRow label="Age">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="(leave blank to keep original)"
                    className="flex-grow bg-black/20 border border-white/20 text-gray-200 placeholder:text-gray-400 rounded-lg p-2 text-base focus:ring-2 focus:ring-[#7C5CFF] focus:outline-none transition w-full disabled:cursor-not-allowed disabled:opacity-60 pr-10"
                    disabled={isLoading || isSuggesting}
                />
                <button
                    type="button"
                    onClick={() => handleGenerateSuggestion('age')}
                    disabled={isLoading || isSuggesting}
                    className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
                    aria-label="Generate age suggestion"
                >
                    <MagicWandIcon className={`w-5 h-5 ${suggestionLoading === 'age' ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </FormRow>

        <button
          type="submit"
          disabled={!canGenerate || isSuggesting}
          className="w-full mt-4 bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] text-white font-bold py-4 px-8 text-base rounded-lg transition-all duration-300 ease-in-out shadow-lg shadow-[#5EE7DF]/20 hover:shadow-xl hover:shadow-[#5EE7DF]/40 hover:-translate-y-px active:scale-95 active:shadow-inner disabled:from-gray-600 disabled:to-gray-500 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
        >
          Generate Persona
        </button>
      </form>

    </div>
  );
};

export default PersonaPanel;