/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState } from 'react';
import { UploadIcon, MagicWandIcon, PaletteIcon, SunIcon, DownloadIcon } from './icons';

interface StartScreenProps {
  onFileSelect: (files: FileList | null) => void;
}

const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
    <div className="bg-black/20 border border-white/10 rounded-2xl p-8 flex flex-col items-center text-center transition-all duration-300 hover:bg-black/30 hover:border-white/20 hover:-translate-y-2 hover:shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[#7C5CFF]/30 to-[#5EE7DF]/30 rounded-full mb-5 border border-white/20">
           {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-100">{title}</h3>
        <p className="mt-2 text-gray-400 text-base">{children}</p>
    </div>
);

const TestimonialCard = ({ author, title, children }: { author: string, title: string, children: React.ReactNode }) => (
    <div className="bg-black/20 border border-white/10 rounded-2xl p-8 flex flex-col h-full backdrop-blur-2xl">
        <p className="text-gray-300 flex-grow text-lg">"{children}"</p>
        <div className="mt-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C5CFF] to-[#5EE7DF] flex items-center justify-center font-bold text-white text-lg">
                {author.charAt(0)}
            </div>
            <div>
                <p className="font-bold text-white">{author}</p>
                <p className="text-sm text-gray-400">{title}</p>
            </div>
        </div>
    </div>
);

const HowItWorksCard = ({ icon, step, title, children }: { icon: React.ReactNode, step: string, title: string, children: React.ReactNode }) => (
    <div className="bg-black/20 border border-white/10 rounded-2xl p-8 flex flex-col items-start text-left backdrop-blur-2xl relative">
        <div className="absolute -top-5 -left-5 w-12 h-12 bg-gradient-to-br from-[#7C5CFF] to-[#5EE7DF] rounded-full flex items-center justify-center font-bold text-white text-xl border-4 border-[#02040a]">
            {step}
        </div>
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{children}</p>
    </div>
);

const Uploader: React.FC<{onFileSelect: StartScreenProps['onFileSelect'], children: React.ReactNode, className?: string}> = ({ onFileSelect, children, className }) => {
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onFileSelect(e.target.files);
    };

    return (
        <div className={className}>
            <div
                className={`relative p-8 rounded-3xl border-2 border-dashed bg-black/20 backdrop-blur-2xl shadow-2xl transition-all duration-300 ${isDraggingOver ? 'bg-white/10 border-[#7C5CFF]' : 'border-white/20'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingOver(false);
                    onFileSelect(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
            >
                <div className="flex flex-col items-center gap-4">
                    <UploadIcon className={`w-12 h-12 mb-2 text-gray-400 transition-colors ${isDraggingOver ? 'text-white' : ''}`} />
                     {children}
                    <input ref={inputRef} id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    <p className="text-sm text-gray-500">or drag and drop a file</p>
                </div>
            </div>
        </div>
    );
};

const StartScreen: React.FC<StartScreenProps> = ({ onFileSelect }) => {
  return (
    <div className="w-full mx-auto text-center p-4 animate-fadeInUp">
      
      {/* Hero Section */}
      <section className="max-w-5xl mx-auto flex flex-col items-center gap-6 py-20 md:py-32">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-100 sm:text-6xl md:text-7xl">
          Create Stunning Images with <br/> the Power of <span className="text-gradient">AI</span>.
        </h1>
        <p className="max-w-2xl text-lg text-gray-400 md:text-xl">
          Oomify is the revolutionary AI photo editor that turns your ideas into reality. Go from a simple prompt to a masterpiece in seconds.
        </p>
        <Uploader onFileSelect={onFileSelect} className="mt-8 w-full max-w-lg">
             <span className="relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] rounded-full cursor-pointer group transition-all duration-300 hover:shadow-2xl hover:shadow-[#5EE7DF]/40 hover:-translate-y-1">
                Upload an Image
            </span>
        </Uploader>
      </section>

      {/* Logos Section */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto">
            <p className="text-center text-sm font-semibold text-gray-500 tracking-wider uppercase">
                POWERING CREATIVITY FOR THE WORLD'S BEST TEAMS
            </p>
            <div className="mt-8 flex justify-center items-center gap-8 md:gap-12 flex-wrap opacity-60">
                <span className="text-2xl font-bold text-gray-500">Company A</span>
                <span className="text-2xl font-bold text-gray-500">Enterprise</span>
                <span className="text-2xl font-bold text-gray-500">Startup X</span>
                <span className="text-2xl font-bold text-gray-500">Studio Pro</span>
                <span className="text-2xl font-bold text-gray-500">Corp Inc.</span>
            </div>
        </div>
      </section>

      {/* How it Works Section */}
       <section id="how-it-works" className="py-20 md:py-32">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center text-white">Simple Steps to Perfection.</h2>
            <p className="mt-4 max-w-2xl text-lg text-gray-400 text-center">
                Create incredible images in just a few clicks. Our intuitive process makes professional editing effortless.
            </p>
            <div className="mt-16 w-full grid grid-cols-1 md:grid-cols-3 gap-8">
                <HowItWorksCard icon={<UploadIcon className="w-8 h-8 text-[#9d8aff]" />} step="1" title="Upload Image">
                    Start by dragging and dropping your file or selecting it from your device.
                </HowItWorksCard>
                <HowItWorksCard icon={<MagicWandIcon className="w-8 h-8 text-[#9d8aff]" />} step="2" title="Describe Your Edit">
                    Use simple text prompts to retouch, adjust, or apply creative filters.
                </HowItWorksCard>
                <HowItWorksCard icon={<DownloadIcon className="w-8 h-8 text-[#9d8aff]" />} step="3" title="Download & Share">
                    Export your high-resolution masterpiece and share it with the world.
                </HowItWorksCard>
            </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center text-white">Editing, Reimagined.</h2>
            <p className="mt-4 max-w-2xl text-lg text-gray-400 text-center">
                Oomify makes professional photo editing accessible to everyone. No more complex tools, just your imagination.
            </p>
            <div className="mt-16 w-full grid grid-cols-1 md:grid-cols-3 gap-8">
                <FeatureCard icon={<MagicWandIcon className="w-8 h-8 text-[#9d8aff]" />} title="Intelligent Retouching">
                    Click any point on your image to remove objects, change colors, or add elements with pinpoint accuracy.
                </FeatureCard>
                <FeatureCard icon={<PaletteIcon className="w-8 h-8 text-[#9d8aff]" />} title="Generative Filters">
                   Transform photos with artistic styles. From vintage to vaporwave, your creativity is the only limit.
                </FeatureCard>
                 <FeatureCard icon={<SunIcon className="w-8 h-8 text-[#9d8aff]" />} title="Contextual Adjustments">
                   Enhance lighting, add depth of field, or change the mood. Our AI understands your image and makes it perfect.
                </FeatureCard>
            </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 md:py-32">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-center text-white">Loved by Creatives Worldwide</h2>
            <p className="mt-4 max-w-2xl text-lg text-gray-400 text-center">
                Don't just take our word for it. Here's what people are saying about Oomify.
            </p>
            <div className="mt-16 w-full grid grid-cols-1 md:grid-cols-2 gap-8">
                <TestimonialCard author="Sarah J." title="Lead Designer, Studio Pro">
                    Oomify has completely changed my workflow. I can now test creative ideas in seconds instead of hours. The AI is incredibly intuitive and the results are stunning.
                </TestimonialCard>
                 <TestimonialCard author="Mike R." title="Freelance Photographer">
                    As a photographer, I used to spend so much time on tedious edits. Oomify's retouching feature is a game-changer. It's like having a professional retoucher on call 24/7.
                </TestimonialCard>
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
          <div className="max-w-4xl mx-auto text-center p-12 bg-black/20 border border-white/10 rounded-3xl backdrop-blur-2xl">
              <h2 className="text-4xl font-bold tracking-tight text-white">Ready to Oomify Your Photos?</h2>
              <p className="mt-4 text-lg text-gray-400">
                  Experience the future of photo editing today. Upload an image and let our AI bring your vision to life.
              </p>
              <div className="mt-8">
                  <button onClick={() => document.getElementById('image-upload-start')?.click()} className="px-10 py-4 text-lg font-bold text-white bg-gradient-to-r from-[#7C5CFF] to-[#5EE7DF] rounded-full cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-[#5EE7DF]/40 hover:-translate-y-1">
                    Try The Editor Now
                  </button>
              </div>
          </div>
      </section>
    </div>
  );
};

export default StartScreen;