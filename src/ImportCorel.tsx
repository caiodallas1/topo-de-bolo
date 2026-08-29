import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { ArrowLeft, CheckCircle2, FileArchive, Upload } from 'lucide-react';
import { Category, DEFAULT_CATEGORIES, DEFAULT_THEMES, Theme, TopperElement } from './data/catalog';

const CATEGORIES_KEY = 'topo-categories-v2';
const THEMES_KEY = 'topo-themes-v2';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePath(value: string) {
  return value.replace(/\\/g, '/').replace(/^\.\//, '');
}

function dataUrlFromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid('tema');
}

type ManifestElement = {
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
};

type Manifest = {
  version?: number;
  source?: string;
  theme: { name: string; category?: string; cover?: string };
  page?: { widthMm?: number; heightMm?: number };
  cutline?: { whiteMarginMm?: number; lineWidthMm?: number; color?: string };
  elements?: ManifestElement[];
  textSlots?: Theme['textSlots'];
};

export default function ImportCorel() {
  const [categories, setCategories] = useState<Category[]>(() => readLocal(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  const [themes, setThemes] = useState<Theme[]>(() => readLocal(THEMES_KEY, DEFAULT_THEMES));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [lastTheme, setLastTheme] = useState<Theme | null>(null);

  const themeCount = useMemo(() => themes.length, [themes]);

  const importZip = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setStatus('Lendo pacote...');
    setLastTheme(null);

    try {
      const zip = await JSZip.loadAsync(file);
      const manifestEntry = Object.values(zip.files).find((entry) => !entry.dir && normalizePath(entry.name).toLowerCase().endsWith('manifest.json'));
      if (!manifestEntry) throw new Error('manifest.json não encontrado no pacote.');

      const manifest = JSON.parse(await manifestEntry.async('string')) as Manifest;
      if (!manifest.theme?.name) throw new Error('O manifest.json não possui o nome do tema.');

      const manifestDir = normalizePath(manifestEntry.name).split('/').slice(0, -1).join('/');
      const resolveZipEntry = (relative: string) => {
        const target = normalizePath([manifestDir, relative].filter(Boolean).join('/')).toLowerCase();
        return Object.values(zip.files).find((entry) => normalizePath(entry.name).toLowerCase() === target);
      };

      setStatus('Convertendo PNGs...');
      const elements: TopperElement[] = [];
      for (const item of manifest.elements || []) {
        const entry = resolveZipEntry(item.file);
        if (!entry || entry.dir) continue;
        const src = await dataUrlFromBlob(await entry.async('blob'));
        const aspect = item.heightMm && item.heightMm > 0 ? item.widthMm / item.heightMm : 1;
        elements.push({
          id: item.id || uid('el'),
          name: item.name || item.file.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Elemento',
          src,
          xMm: Number(item.xMm) || 0,
          yMm: Number(item.yMm) || 0,
          widthMm: Number(item.widthMm) || 40,
          aspect,
          minWidthMm: item.minWidthMm,
          maxWidthMm: item.maxWidthMm,
          movable: item.movable ?? true,
          resizable: item.resizable ?? true,
          removable: item.removable ?? true,
        });
      }

      let coverImage: string | undefined;
      if (manifest.theme.cover) {
        const cover = resolveZipEntry(manifest.theme.cover);
        if (cover && !cover.dir) coverImage = await dataUrlFromBlob(await cover.async('blob'));
      }

      const categoryName = (manifest.theme.category || 'Sem categoria').trim();
      let category = categories.find((item) => item.name.toLowerCase() === categoryName.toLowerCase());
      let nextCategories = categories;
      if (!category) {
        category = { id: uid('cat'), name: categoryName };
        nextCategories = [...categories, category];
        setCategories(nextCategories);
        localStorage.setItem(CATEGORIES_KEY, JSON.stringify(nextCategories));
      }

      const baseId = slugify(manifest.theme.name);
      let id = baseId;
      let suffix = 2;
      while (themes.some((theme) => theme.id === id)) id = `${baseId}-${suffix++}`;

      const imported: Theme = {
        id,
        name: manifest.theme.name,
        categoryId: category.id,
        description: `Importado do CorelDRAW • ${elements.length} elementos`,
        coverImage,
        elements,
        textSlots: manifest.textSlots || [],
        cutline: {
          whiteMarginMm: manifest.cutline?.whiteMarginMm ?? 1.5,
          lineWidthMm: manifest.cutline?.lineWidthMm ?? 0.2,
          color: manifest.cutline?.color || '#9CA3AF',
        },
        pageWidthMm: manifest.page?.widthMm || 210,
        pageHeightMm: manifest.page?.heightMm || 297,
        source: 'corel',
      };

      const nextThemes = [...themes, imported];
      setThemes(nextThemes);
      localStorage.setItem(THEMES_KEY, JSON.stringify(nextThemes));
      setLastTheme(imported);
      setStatus('Tema importado com sucesso.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível importar o pacote.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-800 bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div><p className="text-xl font-black">Importar pacote Corel</p><p className="text-xs text-zinc-400">Topo Express</p></div>
          <a href="#/admin" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-zinc-900"><ArrowLeft size={18} /> Admin</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-5 md:p-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><FileArchive size={29} /></div>
            <div><p className="text-sm font-black uppercase tracking-wider text-red-600">Importação rápida</p><h1 className="mt-1 text-3xl font-black">Arraste o ZIP criado pelo Corel</h1><p className="mt-2 max-w-2xl text-zinc-600">O sistema lê o manifest, cria a categoria se necessário, importa todos os PNGs e preserva posições e tamanhos em milímetros.</p></div>
          </div>

          <label className={`mt-8 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition ${busy ? 'border-zinc-200 bg-zinc-50 opacity-60' : 'border-zinc-300 bg-zinc-50 hover:border-red-400 hover:bg-red-50/30'}`}>
            <Upload size={38} className="text-zinc-400" />
            <strong className="mt-4 text-xl">Selecionar pacote .zip</strong>
            <span className="mt-2 text-sm text-zinc-500">Gerado pelo macro TopoExpress.bas</span>
            <input type="file" accept=".zip,application/zip" disabled={busy} className="hidden" onChange={(event) => importZip(event.target.files?.[0])} />
          </label>

          {status && <div className={`mt-5 rounded-2xl p-4 font-bold ${lastTheme ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>{status}</div>}

          {lastTheme && (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-3"><CheckCircle2 className="text-emerald-600" /><div><p className="text-lg font-black">{lastTheme.name}</p><p className="text-sm font-semibold text-emerald-800">{lastTheme.elements.length} PNGs • {lastTheme.textSlots?.length || 0} campos de texto</p></div></div>
              <div className="mt-4 flex flex-wrap gap-3"><a href="#/" className="rounded-xl bg-zinc-900 px-5 py-3 font-black text-white">Testar no cliente</a><a href="#/admin" className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-black">Voltar ao Admin</a></div>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-2xl font-black">{themeCount}</p><p className="text-sm font-semibold text-zinc-500">temas cadastrados</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-2xl font-black">{categories.length}</p><p className="text-sm font-semibold text-zinc-500">categorias</p></div>
          <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-2xl font-black">ZIP</p><p className="text-sm font-semibold text-zinc-500">importação com um arquivo</p></div>
        </div>
      </main>
    </div>
  );
}
