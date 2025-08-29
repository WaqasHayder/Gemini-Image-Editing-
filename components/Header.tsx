/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { SparkleIcon } from './icons';
import ThemeToggle from './ThemeToggle';

interface HeaderProps {
  showNavLinks: boolean;
  onLogoClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ showNavLinks, onLogoClick }) => {
  return (
    <header className="w-full py-5 px-4 md:px-8 bg-white/20 dark:bg-black/20 backdrop-blur-2xl border-b border-black/10 dark:border-white/10 sticky top-0 z-50">
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          <a href="#" onClick={(e) => { e.preventDefault(); onLogoClick(); }} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C5CFF] to-[#5EE7DF] flex items-center justify-center">
                <SparkleIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                OOMIFY
              </h1>
          </a>
          {showNavLinks && (
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-white transition-colors">How It Works</a>
              <a href="#testimonials" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-white transition-colors">Testimonials</a>
            </nav>
          )}
          <div className="flex items-center gap-4">
            {showNavLinks && (
              <a href="#how-it-works" className="hidden md:block bg-white/5 hover:bg-white/10 text-white font-semibold py-2 px-5 rounded-lg transition-all duration-300 ease-in-out text-sm border border-white/10">
                  Get Started
              </a>
            )}
            <ThemeToggle />
          </div>
      </div>
    </header>
  );
};

export default Header;