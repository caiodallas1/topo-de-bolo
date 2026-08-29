export type TopperModel = {
  id: string;
  name: string;
  /** Arte A4 pronta (210x297mm). Coloque o arquivo em public/temas/<tema>/ */
  preview: string;
  /** Posição do nome dentro da folha A4, em percentual */
  namePosition?: { x: number; y: number; width: number; fontSize: number; color?: string };
  /** Posição da idade dentro da folha A4, em percentual */
  agePosition?: { x: number; y: number; width: number; fontSize: number; color?: string };
};

export type Theme = {
  id: string;
  name: string;
  thumbnail?: string;
  emoji?: string;
  description: string;
  models: TopperModel[];
};

/**
 * COMO CADASTRAR UM TEMA
 * 1. Crie uma pasta: public/temas/nome-do-tema/
 * 2. Coloque nela os A4 prontos: modelo-01.png, modelo-02.png...
 * 3. Adicione o tema abaixo e informe o caminho de cada arquivo.
 *
 * Recomendação: exporte os A4 em 2480x3508px (A4 a 300 DPI).
 */
export const themes: Theme[] = [
  {
    id: 'futebol',
    name: 'Futebol',
    emoji: '⚽',
    description: 'Futebol e comemoração',
    models: [
      {
        id: 'futebol-01',
        name: 'Modelo 01',
        preview: '/temas/futebol/modelo-01.png',
        namePosition: { x: 25, y: 72, width: 50, fontSize: 4.2, color: '#111111' },
        agePosition: { x: 35, y: 80, width: 30, fontSize: 3.6, color: '#111111' },
      },
      {
        id: 'futebol-02',
        name: 'Modelo 02',
        preview: '/temas/futebol/modelo-02.png',
        namePosition: { x: 20, y: 70, width: 60, fontSize: 4.2, color: '#111111' },
        agePosition: { x: 35, y: 79, width: 30, fontSize: 3.6, color: '#111111' },
      },
    ],
  },
  {
    id: 'princesa',
    name: 'Princesa',
    emoji: '👑',
    description: 'Coroas, brilho e festa',
    models: [
      {
        id: 'princesa-01',
        name: 'Modelo 01',
        preview: '/temas/princesa/modelo-01.png',
        namePosition: { x: 20, y: 72, width: 60, fontSize: 4.2, color: '#111111' },
        agePosition: { x: 35, y: 80, width: 30, fontSize: 3.6, color: '#111111' },
      },
    ],
  },
];
