
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Image as ImageIcon, Download, X, Sparkles, CheckCircle2, RefreshCw, Trash2, Settings, Key } from 'lucide-react';
import { ASPECT_RATIOS, TABS, VIEWS, ANGLES, EXPRESSIONS } from './constants';
import { AspectRatioValue, GeneratedImage, TabId, OptionItem } from './types';
import { generateImageVariation } from './services/geminiService';
import { Button } from './components/Button';
import { ApiKeyModal } from './components/ApiKeyModal';
import { 
  IconSquare, IconPortrait, IconLandscape, IconTall, IconWide, 
  IconClassicPortrait, IconClassicLandscape, IconCinema, IconPanorama, 
  MagicWandIcon 
} from './components/Icons';

// Helper to get icon component
const getRatioIcon = (type: string) => {
  switch (type) {
    case 'square': return IconSquare;
    case 'portrait': return IconPortrait;
    case 'landscape': return IconLandscape;
    case 'tall': return IconTall;
    case 'wide': return IconWide;
    case 'classicPortrait': return IconClassicPortrait;
    case 'classicLandscape': return IconClassicLandscape;
    case 'cinema': return IconCinema;
    case 'panorama': return IconPanorama;
    default: return IconSquare;
  }
};

// Simple obfuscation for local storage (not true encryption, but hides from plain view)
const encryptKey = (key: string) => btoa(key);
const decryptKey = (key: string) => atob(key);

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('views'); 
  // Allow null to indicate no user selection yet (prevents sticking to default on new upload)
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioValue | null>('1:1');
  const [selectedView, setSelectedView] = useState<string>('');
  const [selectedAngle, setSelectedAngle] = useState<string>('');
  const [selectedExpression, setSelectedExpression] = useState<string>('');
  
  const [uploadedImage, setUploadedImage] = useState<{ url: string, base64: string, mimeType: string } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [promptText, setPromptText] = useState("");
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());

  // API Key State
  const [apiKey, setApiKey] = useState<string>('');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load API Key on Mount
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key_secure');
    if (storedKey) {
      try {
        setApiKey(decryptKey(storedKey));
      } catch (e) {
        console.error("Failed to decrypt key", e);
        localStorage.removeItem('gemini_api_key_secure');
      }
    }
    // REMOVED: Fallback to process.env.API_KEY to strictly enforce external key usage
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key_secure', encryptKey(key));
  };

  // Handle Image Upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        
        // Reset state for new upload
        setGeneratedImages([]);
        setSelectedImages(new Set());
        setSelectedView('');
        setSelectedAngle('');
        setSelectedExpression('');
        setSelectedRatio(null); // Reset ratio so user must select to generate
        setPromptText("");
        
        setUploadedImage({
          url: base64String,
          base64: base64Data,
          mimeType: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setGeneratedImages([]);
    setSelectedImages(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Generate Function
  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      setIsKeyModalOpen(true);
      return;
    }

    if (!uploadedImage) return;

    setIsGenerating(true);
    try {
      const generatedBase64 = await generateImageVariation({
        apiKey: apiKey,
        imageBase64: uploadedImage.base64,
        mimeType: uploadedImage.mimeType,
        prompt: promptText,
        aspectRatio: selectedRatio || '1:1', // Default to 1:1 if null
        view: selectedView,
        angle: selectedAngle,
        expression: selectedExpression,
      });

      if (generatedBase64) {
        const newImage: GeneratedImage = {
          id: crypto.randomUUID(),
          url: generatedBase64,
          prompt: promptText || "Variation",
          aspectRatio: selectedRatio || '1:1',
          view: selectedView,
          angle: selectedAngle,
          expression: selectedExpression,
          timestamp: Date.now(),
        };
        setGeneratedImages(prev => [newImage, ...prev]);
      }
    } catch (error) {
      console.error("Generation failed", error);
      alert("Failed to generate image. Please check your API Key quota or internet connection.");
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, selectedRatio, selectedView, selectedAngle, selectedExpression, promptText, apiKey]);

  const resetOptions = () => {
    setSelectedView('');
    setSelectedAngle('');
    setSelectedExpression('');
    setSelectedRatio(null);
  };

  // Handle Selection for Download
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedImages);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedImages(newSet);
  };

  // Updated Handle Download using Blob for reliability
  const handleDownload = async (url: string, filename: string) => {
    try {
      // Convert Base64 to Blob
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL object
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback to direct link if blob creation fails
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadSelected = async () => {
    const imagesToDownload = generatedImages.filter(img => selectedImages.has(img.id));
    if (imagesToDownload.length === 0) return;
    
    // Using a loop with await to ensure browser handles sequential downloads
    for (const img of imagesToDownload) {
      await handleDownload(img.url, `gemini-remix-${img.id}.png`);
      // Small delay to prevent browser blocking multiple downloads
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    setSelectedImages(new Set()); 
  };

  const downloadAll = async () => {
    if (generatedImages.length === 0) return;

    for (const img of generatedImages) {
      await handleDownload(img.url, `gemini-remix-${img.id}.png`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const renderOptionGrid = (options: OptionItem[], selectedValue: string | null, onSelect: (val: string) => void, hasIcons = false) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
      {options.map((opt) => {
        const isSelected = selectedValue === opt.value;
        
        if (hasIcons) {
          const ratioOpt = opt as any;
          const Icon = getRatioIcon(ratioOpt.iconType);
          return (
            <button
              key={opt.id}
              disabled={isGenerating}
              onClick={() => onSelect(opt.value)}
              className={`
                relative group flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 min-h-[100px]
                ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
                ${isSelected 
                  ? 'bg-slate-800 border-blue-500 shadow-[0_0_20px_-5px_rgba(59,130,246,0.2)]' 
                  : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'}
              `}
            >
              <div className={`mb-2 p-2 rounded-lg ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-medium text-center ${isSelected ? 'text-white' : 'text-slate-300'}`}>{opt.label}</span>
              <span className="text-[9px] text-slate-500 mt-0.5 text-center leading-tight hidden sm:block">{opt.subLabel}</span>
              
              {isSelected && (
                  <div className="absolute top-2 right-2 text-blue-500">
                    <MagicWandIcon className="w-3 h-3" />
                  </div>
              )}
            </button>
          );
        }

        return (
          <button
            key={opt.id}
            disabled={isGenerating}
            onClick={() => onSelect(opt.value === selectedValue ? '' : opt.value)}
            className={`
              relative flex flex-col items-start justify-center px-3 py-2 rounded-xl border transition-all duration-200 text-left
              ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}
              ${isSelected 
                ? 'bg-slate-800 border-blue-500 shadow-[0_0_10px_-3px_rgba(59,130,246,0.2)]' 
                : 'bg-slate-900/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'}
            `}
          >
            <span className={`text-xs font-medium ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
              {opt.label}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5 truncate w-full">{opt.subLabel}</span>
            {isSelected && (
              <div className="absolute top-2 right-2 text-blue-500">
                <CheckCircle2 className="w-3 h-3" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0e17] text-slate-200 p-4 md:p-8 flex flex-col font-sans">
      
      <ApiKeyModal 
        isOpen={isKeyModalOpen} 
        onClose={() => setIsKeyModalOpen(false)} 
        onSave={handleSaveApiKey}
        existingKey={apiKey}
      />

      {/* Header */}
      <header className="mb-8 flex items-center justify-between max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">
            Gemini Image Remix
          </h1>
        </div>
        
        <Button 
            variant="outline" 
            onClick={() => setIsKeyModalOpen(true)}
            className={`border-slate-700 hover:border-blue-500/50 hover:bg-slate-800 ${!apiKey ? 'animate-pulse border-blue-500 text-blue-400' : ''}`}
        >
            <div className="flex items-center gap-2">
               {apiKey ? <Settings className="w-4 h-4" /> : <Key className="w-4 h-4" />}
               <span className="hidden sm:inline">{apiKey ? 'Settings' : 'Configure API Key'}</span>
            </div>
        </Button>
      </header>

      <main className="flex-grow max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Upload & Controls (50% width) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          
          {/* Image Uploader */}
          <div className="relative group w-full h-48 sm:h-64 bg-slate-850 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center overflow-hidden transition-all hover:border-blue-500/50 hover:bg-slate-800/50">
            
            {!uploadedImage ? (
              <div 
                onClick={triggerFileInput}
                className="text-center cursor-pointer w-full h-full flex flex-col items-center justify-center p-6"
              >
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Upload Reference Image</h3>
                <p className="text-slate-400 text-xs">Click or drag and drop an image here</p>
              </div>
            ) : (
              <div className="relative w-full h-full">
                 <img 
                    src={uploadedImage.url} 
                    alt="Uploaded" 
                    className="w-full h-full object-contain bg-black/20 backdrop-blur-sm"
                 />
                 <div className="absolute top-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md border border-white/20">
                    Original Reference
                 </div>
                 <div className="absolute top-4 right-4">
                    <button 
                      onClick={clearUpload}
                      className="bg-black/60 hover:bg-red-500/80 text-white p-2 rounded-full backdrop-blur-md transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                 </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>

          {/* Controls Section */}
          <div className={`flex flex-col gap-4 transition-opacity ${!uploadedImage ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            
             {/* Selection Summary & Reset */}
             <div className="flex justify-between items-center px-1">
                <div className="flex flex-wrap gap-2">
                   {selectedView && <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700 flex items-center">View: {selectedView}</span>}
                   {selectedAngle && <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700 flex items-center">Angle: {selectedAngle}</span>}
                   {selectedExpression && <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700 flex items-center">Expr: {selectedExpression}</span>}
                   {selectedRatio && <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700 flex items-center">Ratio: {selectedRatio}</span>}
                </div>
                {(selectedView || selectedAngle || selectedExpression || selectedRatio) && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={resetOptions}
                    disabled={isGenerating}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Reset Options
                  </Button>
                )}
             </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 border
                    ${activeTab === tab.id 
                      ? 'bg-slate-800 border-blue-500/50 text-blue-400 shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]' 
                      : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
                  `}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  <span className="opacity-60 text-xs hidden sm:inline">{tab.subLabel}</span>
                </button>
              ))}
            </div>

            {/* Tab Content Area */}
            <div className="bg-slate-850/50 border border-slate-800 rounded-2xl p-4 sm:p-6 min-h-[300px] relative">
              
              {isGenerating && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] z-10 rounded-2xl flex items-center justify-center">
                   <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-3"></div>
                      <span className="text-blue-400 font-medium animate-pulse">Generating variation...</span>
                   </div>
                </div>
              )}

              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="mb-4 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {TABS.find(t => t.id === activeTab)?.label} <span className="text-slate-500 text-sm font-normal">{TABS.find(t => t.id === activeTab)?.subLabel}</span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Select an option and click Generate
                    </p>
                  </div>
                </div>
                
                {activeTab === 'ratios' && renderOptionGrid(ASPECT_RATIOS, selectedRatio, (val) => setSelectedRatio(val as AspectRatioValue), true)}
                {activeTab === 'views' && renderOptionGrid(VIEWS, selectedView, setSelectedView)}
                {activeTab === 'angles' && renderOptionGrid(ANGLES, selectedAngle, setSelectedAngle)}
                {activeTab === 'expressions' && renderOptionGrid(EXPRESSIONS, selectedExpression, setSelectedExpression)}

              </div>
            </div>
            
            {/* Prompt Input (Optional) */}
            <div className="bg-slate-850 rounded-2xl p-1 border border-slate-800 mt-2">
              <div className="flex items-center">
                <input 
                  type="text" 
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Add custom instruction (e.g. 'Make it cyberpunk')..."
                  disabled={isGenerating}
                  className="w-full bg-transparent text-white px-4 py-3 focus:outline-none text-sm placeholder-slate-500 disabled:opacity-50"
                />
                <div className="p-1">
                   <Button 
                      variant={!apiKey ? "secondary" : "primary"}
                      size="sm"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className={`h-9 shadow-none ${!apiKey ? 'text-blue-400' : ''}`}
                   >
                      {isGenerating ? (
                         <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        !apiKey ? (
                            <>
                              Set API Key <Key className="w-3 h-3 ml-2" />
                            </>
                        ) : (
                            <>
                              Generate <Sparkles className="w-3 h-3 ml-2" />
                            </>
                        )
                      )}
                   </Button>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Results (50% width, 2 cols) */}
        <div className="lg:col-span-6 flex flex-col h-full">
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
               Generated Results <span className="text-slate-500 text-base font-normal">({generatedImages.length})</span>
             </h2>
             <div className="flex gap-2">
               {selectedImages.size > 0 && (
                 <Button variant="secondary" size="sm" onClick={() => setSelectedImages(new Set())}>
                    Deselect All
                 </Button>
               )}
               <Button 
                    variant="primary" 
                    size="sm" 
                    disabled={selectedImages.size === 0}
                    onClick={downloadSelected}
                    className={`shadow-lg transition-all ${selectedImages.size > 0 ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/30' : 'bg-slate-700 text-slate-400 opacity-50 cursor-not-allowed'}`}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download Selected ({selectedImages.size})
               </Button>
               <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={generatedImages.length === 0}
                    onClick={downloadAll}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download All
               </Button>
             </div>
          </div>

          <div className="flex-grow bg-slate-850/30 rounded-2xl border border-slate-800/50 p-4 overflow-y-auto min-h-[500px] max-h-[calc(100vh-150px)] custom-scrollbar relative">
            {generatedImages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
                 <ImageIcon className="w-16 h-16 mb-4 stroke-1" />
                 <p>Select an option and click Generate</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {generatedImages.map((img) => (
                  <div 
                    key={img.id} 
                    className={`
                      group relative rounded-xl overflow-hidden bg-slate-900 border transition-all
                      ${selectedImages.has(img.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-700 hover:border-slate-600'}
                    `}
                  >
                    {/* Aspect Ratio Container */}
                    <div className="w-full relative bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
                      <img 
                        src={img.url} 
                        alt={img.prompt} 
                        className="w-full h-auto block"
                        loading="lazy"
                      />
                      
                      {/* Overlay Controls */}
                      <div className={`absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex flex-col justify-between p-3 ${selectedImages.has(img.id) ? 'opacity-100 bg-black/10' : 'opacity-0 group-hover:opacity-100'}`}>
                         <div className="self-end">
                           <div 
                              onClick={() => toggleSelection(img.id)}
                              className={`
                                w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border transition-colors shadow-lg
                                ${selectedImages.has(img.id) 
                                  ? 'bg-blue-500 border-blue-500 text-white' 
                                  : 'bg-black/50 border-white/50 text-transparent hover:border-white hover:bg-black/70'}
                              `}
                           >
                              <CheckCircle2 className="w-4 h-4" />
                           </div>
                         </div>
                         <div className="flex gap-2 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="bg-black/70 hover:bg-black/90 backdrop-blur-md text-xs h-8 px-3"
                              onClick={() => handleDownload(img.url, `gemini-${img.id}.png`)}
                            >
                              <Download className="w-3 h-3 mr-1.5" />
                              Save
                            </Button>
                         </div>
                      </div>
                    </div>
                    
                    {/* Metadata Footer */}
                    <div className="p-2.5 bg-slate-900 border-t border-slate-800">
                      <div className="flex flex-wrap gap-1 items-center text-[10px] text-slate-400 mb-1">
                         <span className="uppercase tracking-wider font-medium bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">{img.aspectRatio}</span>
                         {img.view && <span className="truncate max-w-[70px]" title={img.view}>{img.view}</span>}
                         {img.expression && <span className="truncate max-w-[70px]" title={img.expression}>| {img.expression}</span>}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                         <span>Original</span>
                         <span>{new Date(img.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
