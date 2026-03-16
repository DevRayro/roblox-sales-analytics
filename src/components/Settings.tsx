import React, { useState, useEffect } from 'react';
import { SavedProfile } from '../types';
import { ArrowLeft, Save, Trash2, Users, Palette } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
  currentTheme: string;
  onThemeChange: (theme: string) => void;
}

export function Settings({ onBack, currentTheme, onThemeChange }: SettingsProps) {
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);

  useEffect(() => {
    const savedProfiles = localStorage.getItem('roblox_saved_profiles');
    if (savedProfiles) {
      try {
        setProfiles(JSON.parse(savedProfiles));
      } catch (e) {}
    }
  }, []);

  const saveProfilesToStorage = (newProfiles: SavedProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem('roblox_saved_profiles', JSON.stringify(newProfiles));
  };

  const themes = [
    { id: 'emerald', name: 'Emerald Dark (Default)', color: '#10b981' },
    { id: 'purple', name: 'Purple Night', color: '#a855f7' },
    { id: 'blue', name: 'Blue Ocean', color: '#3b82f6' },
    { id: 'rose', name: 'Rose Crimson', color: '#f43f5e' },
    { id: 'cyberpunk', name: 'Cyberpunk Pink', color: '#ec4899' },
    { id: 'midnight', name: 'Midnight Indigo', color: '#6366f1' },
    { id: 'sunset', name: 'Sunset Orange', color: '#f97316' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-panel rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
      </div>

      <div className="bg-panel p-8 rounded-3xl shadow-lg border border-subtle space-y-8">
        
        {/* Theme Settings */}
        <div>
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Palette className="w-5 h-5 mr-2 text-primary-400" />
            Appearance
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {themes.map(theme => (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme.id)}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-3 transition-all ${
                  currentTheme === theme.id 
                    ? 'border-primary-500 bg-primary-500/10 shadow-sm' 
                    : 'border-subtle hover:border-slate-600 bg-base'
                }`}
              >
                <div className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: theme.color }} />
                <span className={`text-sm font-medium ${currentTheme === theme.id ? 'text-primary-400' : 'text-slate-300'}`}>
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
