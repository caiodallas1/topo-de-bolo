import { useState } from 'react';
import { ArrowLeft, CheckCircle2, FileCode2, Upload } from 'lucide-react';
import { Category, DEFAULT_CATEGORIES, DEFAULT_THEMES, TextSlot, Theme, TopperElement } from './data/catalog';

const CATEGORIES_KEY = 'topo-categories-v2';
const THEMES_KEY = 'topo-themes-v2';

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

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid('tema');
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function parseLength(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function unitToMm(value: string | null, fallback: number) {
  if (!value) return fallback;
  const n = parseLength(value, fallback);
  const lower = value.toLowerCase();
  if (lower.includes('mm')) return n;
  if (lower.includes('cm')) return n * 10;
  if (lower.includes('in')) return n * 25.4;
  if (lower.includes('pt')) return n * (25.4 / 72);
  if (lower.includes('px')) return n * (25.4 / 96);
  return n;
}

function normalizeToken(value: string) {
  return value.replace(/\s+/g, '').trim().toUpperCase();
}

function styleValue(element: Element, key: string) {
  const inline = element.getAttribute(key);
  if (inline) return inline;
  const style = element.getAttribute('style') || '';
  const match = style.match(new RegExp(`${key}\\s*:\\s*([^;]+)`, 'i'));
  return match?.[1]?.trim() || '';
}

function parseFontSizePt(value: string) {
  if (!value) return 36;
  const n = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(n)) return 36;
  const lower = value.toLowerCase();
  if (lower.includes('px')) return n * 0.75;
  if (lower.includes('mm')) return n * (72 / 25.4);
  if (lower.includes('cm')) return n * 10 * (72 / 25.4);
  return n;
}

type ParsedSvg = {
  cleanedSvg: string;
  slots: TextSlot[];
  widthMm: number;
  heightMm: number;
};

function parseCorelSvg(source: string): ParsedSvg {
  const parser = new DOMParser();
  const doc = parser.parseFromString(source, 'image/svg+xml');
  const error = doc.querySelector('parsererror');
  if (error) throw new Error('O arquivo SVG não pôde ser lido. Exporte novamente pelo Corel como SVG.');

  const root = doc.documentElement;
  if (root.tagName.toLowerCase() !== 'svg') throw new Error('O arquivo selecionado não é um SVG válido.');

  let widthMm = unitToMm(root.getAttribute('width'), 210);
  let heightMm = unitToMm(root.getAttribute('height'), 297);

  const viewBoxRaw = root.getAttribute('viewBox');
  const viewBox = viewBoxRaw?.trim().split(/[\s,]+/).map((v) => Number(v)) || [];
  const vbX = viewBox.length === 4 ? viewBox[0] : 0;
  const vbY = viewBox.length === 4 ? viewBox[1] : 0;
  const vbW = viewBox.length === 4 && viewBox[2] > 0 ? viewBox[2] : widthMm;
  const vbH = viewBox.length === 4 && viewBox[3] > 0 ? viewBox[3] : heightMm;

  if (!root.getAttribute('width') && viewBox.length === 4) widthMm = 210;
  if (!root.getAttribute('height') && viewBox.length === 4) heightMm = 297;

  const scaleX = widthMm / vbW;
  const scaleY = heightMm / vbH;
  const slots: TextSlot[] = [];

  const texts = Array.from(root.querySelectorAll('text'));
  for (const text of texts) {
    const token = normalizeToken(text.textContent || '');
    const type = token === '@NOME' ? 'name' : token === '@IDADE' ? 'age' : null;
    if (!type) continue;

    const xRaw = text.getAttribute('x') || text.querySelector('tspan')?.getAttribute('x') || '0';
    const yRaw = text.getAttribute('y') || text.querySelector('tspan')?.getAttribute('y') || '0';
    const x = parseLength(xRaw, 0);
    const y = parseLength(yRaw, 0);
    const fontFamily = styleValue(text, 'font-family').replace(/["']/g, '') || 'Arial';
    const fontSize = styleValue(text, 'font-size') || '36pt';
    const fill = styleValue(text, 'fill') || '#111111';
    const stroke = styleValue(text, 'stroke') || '';
    const strokeWidth = parseLength(styleValue(text, 'stroke-width'), 0) * Math.max(scaleX, scaleY);

    slots.push({
      type,
      xMm: (x - vbX) * scaleX,
      yMm: (y - vbY) * scaleY,
      widthMm: type === 'name' ? 80 : 35,
      heightMm: type === 'name' ? 16 : 12,
      fontFamily,
      fontSizePt: parseFontSizePt(fontSize),
      fill,
      stroke,
      strokeWidthMm: strokeWidth,
    });

    text.remove();
  }

  root.setAttribute('width', `${widthMm}mm`);
  root.setAttribute('height', `${heightMm}mm`);
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', `0 0 ${widthMm} ${heightMm}`);

  const serialized = new XMLSerializer().serializeToString(root);
  return { cleanedSvg: serialized, slots, widthMm, heightMm };
}

export default function ImportSvg() {
  const [categories] = useState<Category[]>(() => readLocal(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  const [themes, setThemes] = useState<Theme[]>(() => readLocal(THEMES_KEY, DEFAULT_THEMES));
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [themeName, setThemeName] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [lastTheme, setLastTheme] = useState<Theme | null>(null);

  const importSvg = async (file?: File) => {
    if (!file) return;
    if (!categoryId) { setStatus('Escolha uma categoria.'); return; }

    setBusy(true);
    setLastTheme(null);
    setStatus('Lendo SVG do Corel...');

    try {
      const source = await fileToText(file);
      const parsed = parseCorelSvg(source);
      const name = themeName.trim() || file.name.replace(/\.svg$/i, '').replace(/[_-]+/g, ' ').trim();
      if (!name) throw new Error('Informe o nome do tema.');

      const baseId = slugify(name);
      let id = baseId;
      let suffix = 2;
      while (themes.some((theme) => theme.id === id)) id = `${baseId}-${suffix++}`;

      const visual: TopperElement = {
        id: uid('svg'),
        name: 'Arte original do Corel',
        src: svgToDataUrl(parsed.cleanedSvg),
        xMm: 0,
        yMm: 0,
        widthMm: parsed.widthMm,
        aspect: parsed.widthMm / parsed.heightMm,
        minWidthMm: parsed.widthMm,
        maxWidthMm: parsed.widthMm,
        movable: false,
        resizable: false,
        removable: false,
      };

      const theme: Theme = {
        id,
        name,
        categoryId,
        description: `Importado diretamente de SVG • ${parsed.slots.length} campos editáveis`,
        coverImage: svgToDataUrl(parsed.cleanedSvg),
        elements: [visual],
        textSlots: parsed.slots,
        pageWidthMm: parsed.widthMm,
        pageHeightMm: parsed.heightMm,
        source: 'corel',
      };

      const next = [...themes, theme];
      setThemes(next);
      localStorage.setItem(THEMES_KEY, JSON.stringify(next));
      setLastTheme(theme);

      const names = parsed.slots.filter((slot) => slot.type === 'name').length;
      const ages = parsed.slots.filter((slot) => slot.type === 'age').length;
      setStatus(`Tema importado. Detectado: ${names} @NOME e ${ages} @IDADE.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Não foi possível importar o SVG.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-800 bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div><p className="text-xl font-black">Importar SVG do Corel</p><p className="text-xs text-zinc-400">Sem macro: exporte SVG no Corel e envie aqui.</p></div>
          <a href="#/admin" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-zinc-900"><ArrowLeft size={18}/> Admin</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-5 md:p-8">
        <section className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600"><FileCode2 size={29}/></div>
            <div><p className="text-sm font-black uppercase tracking-wider text-red-600">Método recomendado</p><h1 className="mt-1 text-3xl font-black">Corel → SVG → Topo Express</h1><p className="mt-2 max-w-2xl text-zinc-600">No Corel, deixe @NOME e @IDADE como textos normais e exporte a página como SVG. O sistema remove esses marcadores da arte e os transforma em campos editáveis.</p></div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <label className="block"><span className="text-sm font-black">Nome do tema</span><input value={themeName} onChange={(e) => setThemeName(e.target.value)} placeholder="Ex.: Vasco" className="mt-2 min-h-14 w-full rounded-2xl border border-zinc-300 px-4 text-lg font-black outline-none focus:border-red-500"/></label>
            <label className="block"><span className="text-sm font-black">Categoria</span><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-2 min-h-14 w-full rounded-2xl border border-zinc-300 bg-white px-4 text-lg font-black outline-none focus:border-red-500">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          </div>

          <label className={`mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition ${busy ? 'border-zinc-200 bg-zinc-50 opacity-60' : 'border-zinc-300 bg-zinc-50 hover:border-red-400 hover:bg-red-50/30'}`}>
            <Upload size={38} className="text-zinc-400"/>
            <strong className="mt-4 text-xl">Selecionar arquivo .SVG</strong>
            <span className="mt-2 text-sm text-zinc-500">Não precisa instalar nem executar macro no Corel</span>
            <input type="file" accept=".svg,image/svg+xml" disabled={busy} className="hidden" onChange={(event) => importSvg(event.target.files?.[0])}/>
          </label>

          {status && <div className={`mt-5 rounded-2xl p-4 font-bold ${lastTheme ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>{status}</div>}

          {lastTheme && <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-center gap-3"><CheckCircle2 className="text-emerald-600"/><div><p className="text-lg font-black">{lastTheme.name}</p><p className="text-sm font-semibold text-emerald-800">{lastTheme.textSlots?.length || 0} campos editáveis detectados</p></div></div><div className="mt-4 flex flex-wrap gap-3"><a href="#/" className="rounded-xl bg-zinc-900 px-5 py-3 font-black text-white">Testar no cliente</a><a href="#/admin" className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-black">Voltar ao Admin</a></div></div>}
        </section>
      </main>
    </div>
  );
}
