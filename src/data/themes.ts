export type TopperElement = {
  id: string;
  name: string;
  src: string;
  x: number; // % da largura A4
  y: number; // % da altura A4
  widthCm: number;
};

export type Theme = {
  id: string;
  name: string;
  emoji?: string;
  description: string;
  elements: TopperElement[];
};

export const fontOptions = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Arial Black', value: 'Arial Black, Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Trebuchet', value: 'Trebuchet MS, sans-serif' },
  { label: 'Comic', value: 'Comic Sans MS, cursive' },
];

/**
 * COMO CADASTRAR UM TEMA
 * 1) Exporte cada elemento do Corel como PNG transparente.
 * 2) Crie a pasta public/temas/<tema>/
 * 3) Suba os PNGs nessa pasta.
 * 4) Cadastre abaixo o caminho e o tamanho inicial em centímetros.
 *
 * Dica: NÃO exporte a folha A4 inteira. Exporte personagem, enfeites e demais
 * elementos separadamente. Assim eles ficam soltos e podem ser movidos/redimensionados.
 */
export const themes: Theme[] = [
  {
    id: 'bluey',
    name: 'Bluey',
    emoji: '🐾',
    description: 'Tema de teste',
    elements: [
      { id: 'bluey-personagem', name: 'Personagem principal', src: '/temas/bluey/personagem-01.png', x: 8, y: 8, widthCm: 7 },
      { id: 'bluey-personagem-2', name: 'Personagem 02', src: '/temas/bluey/personagem-02.png', x: 55, y: 8, widthCm: 6 },
      { id: 'bluey-casa', name: 'Casa / cenário', src: '/temas/bluey/cenario-01.png', x: 27, y: 38, widthCm: 9 },
      { id: 'bluey-enfeite', name: 'Enfeite', src: '/temas/bluey/enfeite-01.png', x: 8, y: 70, widthCm: 5 },
    ],
  },
  {
    id: 'futebol',
    name: 'Futebol',
    emoji: '⚽',
    description: 'Tema genérico de futebol',
    elements: [
      { id: 'bola', name: 'Bola', src: '/temas/futebol/bola.png', x: 8, y: 8, widthCm: 5 },
      { id: 'trofeu', name: 'Troféu', src: '/temas/futebol/trofeu.png', x: 62, y: 10, widthCm: 5 },
    ],
  },
];
