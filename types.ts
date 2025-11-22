
export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  view?: string;
  angle?: string;
  expression?: string;
  timestamp: number;
}

// Expanded to support all user requested ratios
export type AspectRatioValue = 
  | '1:1' | '3:4' | '4:3' 
  | '9:16' | '16:9' 
  | '2:3' | '3:2' 
  | '21:9' | '1:2' | '2:1';

export interface OptionItem {
  id: string;
  label: string;
  subLabel: string;
  value: string;
}

export interface AspectRatioOption extends OptionItem {
  value: AspectRatioValue;
  iconType: 'square' | 'portrait' | 'landscape' | 'wide' | 'tall' | 'classicPortrait' | 'classicLandscape' | 'cinema' | 'panorama';
}

export type TabId = 'views' | 'angles' | 'expressions' | 'ratios';

export interface TabOption {
  id: TabId;
  label: string;
  subLabel: string;
  icon: any; // Lucide icon component type
}
