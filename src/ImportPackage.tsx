import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, FolderOpen, PackageOpen, Upload } from 'lucide-react';
import { Category, DEFAULT_CATEGORIES, DEFAULT_THEMES, Theme, TopperElement } from './data/catalog';

const CATEGORIES_KEY = 'topo-categories-v2';
const THEMES_KEY = 'topo-themes-v2';

type CorelManifest = {
  version?: number;
  theme: { name: string; category: string; cover?: string };
  page?: { widthMm?: number; heightMm?: number };
  cutline?: { whiteMarginMm?: number; lineWidthMm?: number; color?: string };
  elements?: Array<{
    id?: string;
    name?: string;
    file: string;
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm?: number;
    minWidthMm?: number;
    maxWidthMm?: number;
    movable?: boolean;
    resizable?: boolean;
    removable?: boolean;
  }>;
  textSlots?: any[];
};

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizePath(value: string) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase();
}

export default function ImportPackage() {
  const [files, setFiles] = useState<File[]>([]);
  const [manifest, setManifest] = useState<CorelManifest | null>(null);
  const [status, setStatus] = useState('');
  const [doneTheme, setDoneTheme] = useState<Theme | null>(null);

  const fileMap = useMemo(() => {
    const map = new Map<string, File>();
    files.forEach((file) => {
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const normalized = normalizePath(rel);
      map.set(normalized, file);
      const parts = normalized.split('/');
      if (parts.length > 1) map.set(parts.slice(1).join('/'), file);
      map.set(normalizePath(file.name), file);
    });
    return map;
  }, [files]);

  const chooseFolder = async (list: FileList | null) => {
    if (!list?.length) return;
    const selected = Array.from(list);
    setFiles(selected);
    setDoneTheme(null);
    setStatus('Lendo pacote...');

    const manifestFile = selected.find((file) => file.name.toLowerCase() === 'manifest.json');
    if (!manifestFile) {
      setManifest(null);
      setStatus('manifest.json não encontrado. Selecione a pasta criada pelo macro Topo Express.');
      return;
    }

    try {
      const parsed = JSON.parse(await manifestFile.text()) as CorelManifest;
      if (!parsed.theme?.name) throw new Error('O manifesto não contém o nome do tema.');
      setManifest(parsed);
      setStatus(`Pacote reconhecido: ${parsed.theme.name}`);
    } catch (error: any) {
      setManifest(null);
      setStatus(`Erro ao ler manifest.json: ${error?.message || 'arquivo inválido'}`);
    }
  };

  const findFile = (path?: string) => {
    if (!path) return undefined;
    const normalized = normalizePath(path);
    return fileMap.get(normalized) || [...fileMap.entries()].find(([key]) => key.endsWith('/' + normalized))?.[1];
  };

  const importTheme = async () => {
    if (!manifest) return;
    setStatus('Importando PNGs e montando o tema...');

    const categories = readLocal<Category[]>(CATEGORIES_KEY, DEFAULT_CATEGORIES);
    const themes = readLocal<Theme[]>(THEMES_KEY, DEFAULT_THEMES);

    let category = categories.find((item) => item.name.trim().toLowerCase() === manifest.theme.category.trim().toLowerCase());
    let nextCategories = categories;
    if (!category) {
      category = { id: uid('cat'), name: manifest.theme.category || 'Sem categoria' };
      nextCategories = [...categories, category];
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(nextCategories));
    }

    let coverImage: string | undefined;
    const coverFile = findFile(manifest.theme.cover || 'capa.png');
    if (coverFile) coverImage = await fileToDataUrl(coverFile);

    const elements: TopperElement[] = [];
    for (const item of manifest.elements || []) {
      const sourceFile = findFile(item.file);
      if (!sourceFile) continue;
      const src = await fileToDataUrl(sourceFile);
      const aspect = item.heightMm && item.heightMm > 0 ? item.widthMm / item.heightMm : 1;
      elements.push({
        id: uid('el'),
        name: item.name || sourceFile.name.replace(/\.[^.]+$/, ''),
        src,
        xMm: Number(item.xMm || 0),
        yMm: Number(item.yMm || 0),
        widthMm: Number(item.widthMm || 40),
        aspect,
      });
    }

    const existingIndex = themes.findIndex((item) => item.name.trim().toLowerCase() === manifest.theme.name.trim().toLowerCase());
    const theme: Theme = {
      id: existingIndex >= 0 ? themes[existingIndex].id : uid('theme'),
      name: manifest.theme.name,
      categoryId: category.id,
      description: `Importado do Corel • ${elements.length} elementos`,
      coverImage,
      elements,
    };

    const nextThemes = [...themes];
    if (existingIndex >= 0) nextThemes[existingIndex] = theme;
    else nextThemes.push(theme);

    localStorage.setItem(THEMES_KEY, JSON.stringify(nextThemes));
    setDoneTheme(theme);
    setStatus(`Pronto: ${theme.name} importado com ${elements.length} elementos.`);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-800 bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3"><PackageOpen /><div><p className="text-xl font-black">Importar pacote Corel</p><p className="text-xs text-zinc-400">Topo Express</p></div></div>
          <a href="#/admin" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-zinc-900"><ArrowLeft size={18}/> Admin</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-5 md:p-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <h1 className="text-3xl font-black">Importação rápida de tema</h1>
          <p className="mt-2 max-w-3xl text-zinc-600">Selecione a pasta <strong>NomeDoTema_TopoExpress</strong> criada pelo macro. O sistema lê o manifest.json, cria a categoria se necessário e importa os PNGs já nas posições e tamanhos definidos no Corel.</p>

          <label className="mt-7 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-5 text-center hover:border-red-400 hover:bg-red-50/30">
            <FolderOpen size={38} className="mb-3 text-red-600" />
            <span className="text-xl font-black">Selecionar pasta do Topo Express</span>
            <span className="mt-1 text-sm font-semibold text-zinc-500">Escolha a pasta descompactada, não os PNGs individualmente.</span>
            <input
              type="file"
              multiple
              className="hidden"
              onChange={(event) => chooseFolder(event.target.files)}
              {...({ webkitdirectory: '', directory: '' } as any)}
            />
          </label>

          {status && <div className="mt-5 rounded-2xl bg-zinc-50 p-4 font-bold text-zinc-700">{status}</div>}

          {manifest && (
            <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
              <div className="rounded-2xl border border-zinc-200 p-5">
                <p className="text-xs font-black uppercase tracking-wider text-red-600">Pacote reconhecido</p>
                <h2 className="mt-1 text-2xl font-black">{manifest.theme.name}</h2>
                <p className="mt-2"><strong>Categoria:</strong> {manifest.theme.category}</p>
                <p><strong>Elementos:</strong> {manifest.elements?.length || 0}</p>
                <p><strong>Campos de texto do Corel:</strong> {manifest.textSlots?.length || 0}</p>
                <p><strong>Folha:</strong> {manifest.page?.widthMm || 210} × {manifest.page?.heightMm || 297} mm</p>
              </div>
              <button onClick={importTheme} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-7 text-lg font-black text-white hover:bg-red-700"><Upload size={21}/> Importar tema</button>
            </div>
          )}

          {doneTheme && (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
              <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0"/><div><p className="text-xl font-black">Tema pronto para teste</p><p className="mt-1">{doneTheme.name} já está disponível na tela do cliente. Se ele já existia, o pacote substituiu os elementos pela versão importada.</p><a href="#/" className="mt-4 inline-block rounded-xl bg-emerald-700 px-5 py-3 font-black text-white">Abrir tela do cliente</a></div></div>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Fluxo mais rápido para seus packs</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-4">
            {['Abra um topo pronto no Corel e agrupe cada peça.', 'Renomeie os textos editáveis para @NOME e @IDADE.', 'Execute ExportarTopoExpress e escolha a categoria.', 'Importe a pasta aqui e teste no cliente.'].map((text, index) => <li key={text} className="rounded-2xl bg-zinc-50 p-4"><span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 font-black text-white">{index + 1}</span><p className="font-semibold leading-snug">{text}</p></li>)}
          </ol>
        </section>
      </main>
    </div>
  );
}
