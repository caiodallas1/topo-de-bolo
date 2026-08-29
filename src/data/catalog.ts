export type Category = {
  id: string;
  name: string;
  image?: string;
};

export type TextSlot = {
  type: 'name' | 'age';
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontFamily?: string;
  fontSizePt?: number;
  fill?: string;
  stroke?: string;
  strokeWidthMm?: number;
  shadowColor?: string;
  shadowOffsetMm?: number;
};

export type CutlineSettings = {
  whiteMarginMm: number;
  lineWidthMm: number;
  color: string;
};

export type TopperElement = {
  id: string;
  name: string;
  src: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  aspect?: number;
  minWidthMm?: number;
  maxWidthMm?: number;
  movable?: boolean;
  resizable?: boolean;
  removable?: boolean;
};

export type Theme = {
  id: string;
  name: string;
  categoryId: string;
  description?: string;
  coverImage?: string;
  emoji?: string;
  elements: TopperElement[];
  textSlots?: TextSlot[];
  cutline?: CutlineSettings;
  pageWidthMm?: number;
  pageHeightMm?: number;
  source?: 'manual' | 'corel';
};

export type TopperOrder = {
  code: string;
  createdAt: string;
  themeId: string;
  themeName: string;
  categoryName: string;
  childName: string;
  age: string;
  fontFamily: string;
  elements: TopperElement[];
  textSlots?: TextSlot[];
  cutline?: CutlineSettings;
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'infantil', name: 'Infantil' },
  { id: 'feminino', name: 'Feminino' },
  { id: 'futebol', name: 'Futebol' },
  { id: 'adulto', name: 'Adulto' },
];

export const DEFAULT_THEMES: Theme[] = [
  { id: 'princesa', name: 'Princesa', categoryId: 'feminino', emoji: '👑', description: 'Rosa, coroas e brilho', elements: [], source: 'manual' },
  { id: 'futebol', name: 'Futebol', categoryId: 'futebol', emoji: '⚽', description: 'Campo, bola e comemoração', elements: [], source: 'manual' },
  { id: 'safari', name: 'Safari', categoryId: 'infantil', emoji: '🦁', description: 'Bichinhos e natureza', elements: [], source: 'manual' },
  { id: 'dinossauro', name: 'Dinossauro', categoryId: 'infantil', emoji: '🦖', description: 'Dinos e aventura', elements: [], source: 'manual' },
  { id: 'astronauta', name: 'Astronauta', categoryId: 'infantil', emoji: '🚀', description: 'Espaço, estrelas e foguetes', elements: [], source: 'manual' },
  { id: 'borboletas', name: 'Borboletas', categoryId: 'feminino', emoji: '🦋', description: 'Leve, delicado e colorido', elements: [], source: 'manual' },
  { id: 'fazendinha', name: 'Fazendinha', categoryId: 'infantil', emoji: '🐮', description: 'Animais e clima de fazenda', elements: [], source: 'manual' },
  { id: 'festa-colorida', name: 'Festa Colorida', categoryId: 'adulto', emoji: '🎈', description: 'Balões, confetes e alegria', elements: [], source: 'manual' },
  { id: 'bluey-teste', name: 'Bluey - teste', categoryId: 'infantil', emoji: '🐶', description: 'Cadastre seus PNGs no admin', elements: [], source: 'manual' },
];

export const FONT_OPTIONS = [
  { id: 'fredoka', name: 'Fredoka', family: 'Fredoka, Arial, sans-serif', kind: 'Infantil' },
  { id: 'baloo', name: 'Baloo 2', family: '"Baloo 2", Arial, sans-serif', kind: 'Infantil' },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat, Arial, sans-serif', kind: 'Forte' },
  { id: 'dancing', name: 'Dancing Script', family: '"Dancing Script", cursive', kind: 'Script' },
  { id: 'great-vibes', name: 'Great Vibes', family: '"Great Vibes", cursive', kind: 'Script' },
  { id: 'pacifico', name: 'Pacifico', family: 'Pacifico, cursive', kind: 'Script' },
];
