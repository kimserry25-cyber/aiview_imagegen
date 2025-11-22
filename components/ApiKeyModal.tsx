
import React, { useState, useEffect } from 'react';
import { Key, ShieldCheck, AlertCircle, CheckCircle2, Lock, Save, X } from 'lucide-react';
import { Button } from './Button';
import { testApiKeyConnection } from '../services/geminiService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  existingKey?: string;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onSave, existingKey }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && existingKey) {
      setInputValue(existingKey);
    } else if (isOpen) {
      setInputValue('');
    }
    setStatus('idle');
    setErrorMessage('');
  }, [isOpen, existingKey]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    if (!inputValue.trim()) {
      setStatus('error');
      setErrorMessage('Please enter an API Key.');
      return;
    }

    setIsTesting(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const isValid = await testApiKeyConnection(inputValue.trim());
      
      if (isValid) {
        setStatus('success');
        // Small delay to show success message before closing/saving
        setTimeout(() => {
            onSave(inputValue.trim());
            onClose();
        }, 1000);
      } else {
        setStatus('error');
        setErrorMessage('Connection failed. Please check your API Key.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('An unexpected error occurred.');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-800/50 p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">API Configuration</h3>
              <p className="text-xs text-slate-400">Secure Local Storage</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Google Gemini API Key</label>
            <div className="relative">
              <input
                type="password"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-4 pr-10 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
              <div className="absolute right-3 top-3.5 text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Your key is encrypted and stored locally in your browser. It is never sent to our servers.
            </p>
          </div>

          {/* Status Messages */}
          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200">{errorMessage}</div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <div className="text-sm text-green-200">Connection successful! Saving...</div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-800/50 p-6 border-t border-slate-700 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isTesting}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleTestAndSave} 
            isLoading={isTesting}
            disabled={!inputValue || status === 'success'}
            className="min-w-[140px]"
          >
             {isTesting ? 'Testing...' : (
               <>
                 <ShieldCheck className="w-4 h-4 mr-2" />
                 Save & Connect
               </>
             )}
          </Button>
        </div>
      </div>
    </div>
  );
};
