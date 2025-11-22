import React from 'react';
import { Button } from './Button';
import { X } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  existingKey?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">API Configuration</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
            <p className="text-sm text-blue-200">
              API Key configuration is handled automatically via environment variables.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              Ensure <code>process.env.API_KEY</code> is set in your <code>.env</code> file.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-800/50 p-6 border-t border-slate-700 flex justify-end gap-3">
          <Button variant="primary" onClick={onClose}>
             Close
          </Button>
        </div>
      </div>
    </div>
  );
};