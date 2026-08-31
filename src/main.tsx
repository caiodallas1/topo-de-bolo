import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ClientClassicV3 from './ClientClassicV3.tsx';
import ImportCorelNext from './ImportCorelNext.tsx';
import ImportSvg from './ImportSvg.tsx';
import FontsClassic from './FontsClassic.tsx';
import { installThemeStorageShim } from './services/themeStorage';
import './index.css';

const nativeJsonParse = JSON.parse.bind(JSON);
JSON.parse = ((text: string, reviver?: (this: any, key: string, value: any) => any) => {
  const clean = typeof text === 'string'
    ? text
        .replace(/^\uFEFF/, '')
        .replace(/^ï»¿/, '')
        .trimStart()
        .replace(/(-?\d+)\.(?=\s*[,}\]])/g, '$1')
    : text;
  return nativeJsonParse(clean, reviver);
}) as typeof JSON.parse;

window.addEventListener('hashchange', () => window.location.reload());

async function bootstrap() {
  await installThemeStorageShim();

  const hash = window.location.hash;
  const isSvgImporter = hash.startsWith('#/importar-svg');
  const isImporter = hash.startsWith('#/importar');
  const isFonts = hash.startsWith('#/fontes');
  const isAdmin = hash.startsWith('#/admin');

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {isSvgImporter ? (
        <ImportSvg />
      ) : isImporter ? (
        <ImportCorelNext />
      ) : isFonts ? (
        <FontsClassic />
      ) : isAdmin ? (
        <>
          <App />
          <div className="fixed bottom-5 right-5 z-[9999] flex flex-wrap justify-end gap-2">
            <a href="#/fontes" className="rounded-2xl bg-zinc-900 px-5 py-3 font-black text-white shadow-2xl">Fontes</a>
            <a href="#/importar-svg" className="rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white shadow-2xl hover:bg-emerald-700">Importar SVG do Corel</a>
            <a href="#/importar" className="rounded-2xl bg-red-600 px-5 py-3 font-black text-white shadow-2xl shadow-red-300 hover:bg-red-700">Importar ZIP antigo</a>
          </div>
        </>
      ) : (
        <ClientClassicV3 />
      )}
    </StrictMode>,
  );
}

void bootstrap();
