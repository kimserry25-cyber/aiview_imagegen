import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { X, Key, ShieldCheck, ExternalLink } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  existingKey?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, existingKey }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputValue(existingKey || '');
    }
  }, [isOpen, existingKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (inputValue.trim()) {
      onSave(inputValue.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transform animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white">API Key Settings</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter your API key here..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            />
            <p className="mt-3 text-xs text-slate-400 leading-relaxed">
              Your API key is stored locally in your browser and is never sent to our servers. It interacts directly with Google's API.
            </p>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-200">Secure & Private</p>
              <p className="text-xs text-blue-300/70">
                Keys are saved in your browser's LocalStorage.
              </p>
            </div>
          </div>

          <div className="pt-2 text-center">
             <a 
               href="https://aistudio.google.com/app/apikey" 
               target="_blank" 
               rel="noopener noreferrer"
               className="inline-flex items-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
             >
               Get a free API Key from Google AI Studio <ExternalLink className="w-3 h-3 ml-1" />
             </a>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-800/50 p-6 border-t border-slate-700 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
             Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={!inputValue.trim()}
          >
             Save API Key
          </Button>
        </div>
      </div>
    </div>
  );
};