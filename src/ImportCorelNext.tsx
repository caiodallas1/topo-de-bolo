import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { ArrowLeft, CheckCircle2, FileArchive, Upload } from 'lucide-react';
import { Category, DEFAULT_CATEGORIES, DEFAULT_THEMES, TextSlot, Theme, TopperElement } from './data/catalog';

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

type RawTextSlot = Partial<TextSlot> & { type?: string };

type Manifest = {
  version?: number;
  source?: string;
  theme: { name: string; category?: string; cover?: string };
  page?: { widthMm?: number; heightMm?: number };
  elements?: ManifestElement[];
  textSlots?: RawTextSlot[];
};

function normalizeSlot(raw: RawTextSlot): TextSlot | null {
  const token = String(raw.type || '').trim().toLowerCase();
  const type = token === 'name' || token === '@nome' ? 'name' : token === 'age' || token === '@idade' ? 'age' : null;
  if (!type) return null;

  return {
    type,
    xMm: Number(raw.xMm) || 0,
    yMm: Number(raw.yMm) || 0,
    widthMm: Number(raw.widthMm) || 40,
    heightMm: Number(raw.heightMm) || 12,
    fontFamily: raw.fontFamily || 'Arial',
    fontSizePt: Number(raw.fontSizePt) || 36,
    fill: raw.fill || '#111111',
    stroke: raw.stroke || '',
    strokeWidthMm: Number(raw.strokeWidthMm) || 0,
    shadowColor: raw.shadowColor,
    shadowOffsetMm: raw.shadowOffsetMm,
  };
}

export default function ImportCorelNext() {
  const [categories] = useState<Category[]>(() => readLocal(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  const [themes, setThemes] = useState<Theme[]>(() => readLocal(THEMES_KEY, DEFAULT_THEMES));
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [lastTheme, setLastTheme] = useState<Theme | null>(null);
  const themeCount = useMemo(() => themes.length, [themes]);

  const importZip = async (file?: File) => {
    if (!file) return;
    if (!categoryId) {
      setStatus('Escolha a categoria antes de importar.');
      return;
    }

    setBusy(true);
    setStatus('Lendo pacote...');
    setLastTheme(null);

    try {
      const zip = await JSZip.loadAsync(file);
      const manifestEntry = Object.values(zip.files).find((entry) => !entry.dir && normalizePath(entry.name).toLowerCase().endsWith('manifest.json'));
      if (!manifestEntry) throw new Error('manifest.json não encontrado no pacote.');

      const manifestText = await manifestEntry.async('string');
      const manifest = JSON.parse(manifestText) as Manifest;
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

      const textSlots = (manifest.textSlots || []).map(normalizeSlot).filter((slot): slot is TextSlot => Boolean(slot));

      let coverImage: string | undefined;
      if (manifest.theme.cover) {
        const cover = resolveZipEntry(manifest.theme.cover);
        if (cover && !cover.dir) coverImage = await dataUrlFromBlob(await cover.async('blob'));
      }

      const baseId = slugify(manifest.theme.name);
      let id = baseId;
      let suffix = 2;
      while (themes.some((theme) => theme.id === id)) id = `${baseId}-${suffix++}`;

      const imported: Theme = {
        id,
        name: manifest.theme.name,
        categoryId,
        description: `Importado do CorelDRAW • ${elements.length} elementos`,
        coverImage,
        elements,
        textSlots,
        cutline: undefined,
        pageWidthMm: manifest.page?.widthMm || 210,
        pageHeightMm: manifest.page?.heightMm || 297,
        source: 'corel',
      };

      const nextThemes = [...themes, imported];
      setThemes(nextThemes);
      localStorage.setItem(THEMES_KEY, JSON.stringify(nextThemes));
      setLastTheme(imported);

      const names = textSlots.filter((slot) => slot.type === 'name').length;
      const ages = textSlots.filter((slot) => slot.type === 'age').length;
      setStatus(`Tema importado. Campos editáveis detectados: ${names} nome, ${ages} idade.`);
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
          <div><p className="text-xl font-black">Importar pacote Corel</p><p className="text-xs text-zinc-400">O ZIP sempre entra como tema, dentro de uma categoria existente.</p></div>
          <a href="#/admin" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-zinc-900"><ArrowLeft size={18}/> Admin</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-5 md:p-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><FileArchive size={29}/></div>
            <div><p className="text-sm font-black uppercase tracking-wider text-red-600">Importação rápida</p><h1 className="mt-1 text-3xl font-black">Importar tema do Corel</h1><p className="mt-2 max-w-2xl text-zinc-600">Escolha a categoria e importe o ZIP. O Topo Express v3.1 reconhece @NOME/@IDADE escritos no Corel ou usados como nome do objeto.</p></div>
          </div>

          <label className="mt-7 block text-sm font-black">Categoria do tema</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-2 min-h-14 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-lg font-black outline-none focus:border-red-500">
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>

          <label className={`mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition ${busy ? 'border-zinc-200 bg-zinc-50 opacity-60' : 'border-zinc-300 bg-zinc-50 hover:border-red-400 hover:bg-red-50/30'}`}>
            <Upload size={38} className="text-zinc-400"/>
            <strong className="mt-4 text-xl">Selecionar pacote .zip</strong>
            <span className="mt-2 text-sm text-zinc-500">@NOME e @IDADE serão mantidos como texto editável</span>
            <input type="file" accept=".zip,application/zip" disabled={busy} className="hidden" onChange={(event) => importZip(event.target.files?.[0])}/>
          </label>

          {status && <div className={`mt-5 rounded-2xl p-4 font-bold ${lastTheme ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>{status}</div>}

          {lastTheme && (
            <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-3"><CheckCircle2 className="text-emerald-600"/><div><p className="text-lg font-black">{lastTheme.name}</p><p className="text-sm font-semibold text-emerald-800">Categoria: {categories.find((c) => c.id === lastTheme.categoryId)?.name} • {lastTheme.elements.length} PNGs • {lastTheme.textSlots?.length || 0} textos editáveis</p></div></div>
              <div className="mt-4 flex flex-wrap gap-3"><a href="#/" className="rounded-xl bg-zinc-900 px-5 py-3 font-black text-white">Testar no cliente</a><a href="#/admin" className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-black">Voltar ao Admin</a></div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
