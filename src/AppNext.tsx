import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Edit3,
  FolderOpen,
  ImagePlus,
  LayoutDashboard,
  Plus,
  Search,
  Trash2,
  Type,
  Upload,
} from 'lucide-react';
import {
  Category,
  DEFAULT_CATEGORIES,
  DEFAULT_THEMES,
  TextSlot,
  Theme,
  TopperElement,
  TopperOrder,
} from './data/catalog';

const CATEGORIES_KEY = 'topo-categories-v2';
const THEMES_KEY = 'topo-themes-v2';
const ORDERS_KEY = 'topo-orders-v2';
const FONTS_KEY = 'topo-fonts-v1';

type FontAsset = {
  id: string;
  label: string;
  family: string;
  dataUrl: string;
};

type SelectedObject =
  | { kind: 'element'; id: string }
  | { kind: 'text'; type: 'name' | 'age' }
  | null;

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeCode() {
  return `TB${Math.floor(1000 + Math.random() * 9000)}`;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char] || char));
}

function textValue(slot: TextSlot, childName: string, age: string) {
  if (slot.type === 'name') return childName;
  return age ? `${age} anos` : '';
}

function fallbackSlots(theme: Theme): TextSlot[] {
  if (theme.textSlots?.length) return theme.textSlots.map((slot) => ({ ...slot }));
  return [
    { type: 'name', xMm: 55, yMm: 245, widthMm: 100, heightMm: 16, fontFamily: 'Arial', fontSizePt: 36, fill: '#111111' },
    { type: 'age', xMm: 75, yMm: 267, widthMm: 60, heightMm: 12, fontFamily: 'Arial', fontSizePt: 24, fill: '#111111' },
  ];
}

function buildSvg(order: TopperOrder) {
  const images = order.elements.map((element) => {
    const h = element.widthMm / Math.max(0.01, element.aspect || 1);
    return `<image href="${element.src}" x="${element.xMm}" y="${element.yMm}" width="${element.widthMm}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  }).join('');

  const slots = order.textSlots || [];
  const texts = slots.map((slot) => {
    const value = textValue(slot, order.childName, order.age);
    if (!value) return '';
    const sizeMm = ((slot.fontSizePt || 32) * 25.4) / 72;
    return `<text x="${slot.xMm}" y="${slot.yMm}" dominant-baseline="hanging" font-family="${escapeXml(slot.fontFamily || order.fontFamily || 'Arial')}" font-size="${sizeMm}" fill="${slot.fill || '#111111'}"${slot.stroke ? ` stroke="${slot.stroke}" stroke-width="${slot.strokeWidthMm || 0}" paint-order="stroke fill"` : ''}>${escapeXml(value)}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><rect width="210" height="297" fill="white"/>${images}${texts}</svg>`;
}

async function downloadOrderPng(order: TopperOrder) {
  const svg = buildSvg(order);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = url;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 2480;
  canvas.height = 3508;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${order.code}-${order.themeName}.png`;
  a.click();
}

function useInstalledFonts() {
  const [fonts, setFonts] = useState<FontAsset[]>(() => readLocal(FONTS_KEY, []));

  useEffect(() => {
    fonts.forEach((font) => {
      try {
        const face = new FontFace(font.family, `url(${font.dataUrl})`);
        void face.load().then((loaded) => document.fonts.add(loaded)).catch(console.warn);
      } catch (error) {
        console.warn('Não foi possível carregar fonte', font.family, error);
      }
    });
  }, [fonts]);

  const saveFonts = (next: FontAsset[]) => {
    setFonts(next);
    saveLocal(FONTS_KEY, next);
  };

  return { fonts, saveFonts };
}

function A4Editor({
  elements,
  setElements,
  slots,
  setSlots,
  childName,
  age,
  selected,
  setSelected,
  interactive,
}: {
  elements: TopperElement[];
  setElements?: (items: TopperElement[]) => void;
  slots: TextSlot[];
  setSlots?: (items: TextSlot[]) => void;
  childName: string;
  age: string;
  selected: SelectedObject;
  setSelected?: (value: SelectedObject) => void;
  interactive?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ kind: 'element' | 'text'; id: string; dx: number; dy: number } | null>(null);

  const point = (event: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * 210,
      y: ((event.clientY - rect.top) / rect.height) * 297,
    };
  };

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 210 297"
      className="aspect-[210/297] w-full touch-none bg-white shadow-[0_12px_35px_rgba(0,0,0,.15)] ring-1 ring-zinc-200"
      onPointerMove={(event) => {
        if (!interactive || !dragRef.current) return;
        const p = point(event);
        if (dragRef.current.kind === 'element' && setElements) {
          setElements(elements.map((item) => item.id === dragRef.current?.id ? { ...item, xMm: Math.max(0, p.x - dragRef.current.dx), yMm: Math.max(0, p.y - dragRef.current.dy) } : item));
        }
        if (dragRef.current.kind === 'text' && setSlots) {
          setSlots(slots.map((slot) => slot.type === dragRef.current?.id ? { ...slot, xMm: Math.max(0, p.x - dragRef.current.dx), yMm: Math.max(0, p.y - dragRef.current.dy) } : slot));
        }
      }}
      onPointerUp={() => { dragRef.current = null; }}
      onPointerLeave={() => { dragRef.current = null; }}
    >
      <rect width="210" height="297" fill="#fff" />
      {elements.map((element) => {
        const h = element.widthMm / Math.max(0.01, element.aspect || 1);
        const isSelected = selected?.kind === 'element' && selected.id === element.id;
        return (
          <g key={element.id}>
            <image
              href={element.src}
              x={element.xMm}
              y={element.yMm}
              width={element.widthMm}
              height={h}
              preserveAspectRatio="xMidYMid meet"
              className={interactive && element.movable !== false ? 'cursor-move' : ''}
              onPointerDown={(event) => {
                if (!interactive || element.movable === false) return;
                const p = point(event);
                dragRef.current = { kind: 'element', id: element.id, dx: p.x - element.xMm, dy: p.y - element.yMm };
                setSelected?.({ kind: 'element', id: element.id });
              }}
            />
            {isSelected && interactive && <rect x={element.xMm} y={element.yMm} width={element.widthMm} height={h} fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" pointerEvents="none" />}
          </g>
        );
      })}

      {slots.map((slot) => {
        const value = textValue(slot, childName, age);
        if (!value) return null;
        const sizeMm = ((slot.fontSizePt || 32) * 25.4) / 72;
        const isSelected = selected?.kind === 'text' && selected.type === slot.type;
        return (
          <g key={slot.type}>
            <text
              x={slot.xMm}
              y={slot.yMm}
              dominantBaseline="hanging"
              fontFamily={slot.fontFamily || 'Arial'}
              fontSize={sizeMm}
              fill={slot.fill || '#111111'}
              stroke={slot.stroke || 'none'}
              strokeWidth={slot.strokeWidthMm || 0}
              paintOrder="stroke fill"
              className={interactive ? 'cursor-move select-none' : ''}
              onPointerDown={(event) => {
                if (!interactive) return;
                const p = point(event);
                dragRef.current = { kind: 'text', id: slot.type, dx: p.x - slot.xMm, dy: p.y - slot.yMm };
                setSelected?.({ kind: 'text', type: slot.type });
              }}
            >{value}</text>
            {isSelected && interactive && <rect x={slot.xMm - 2} y={slot.yMm - 2} width={Math.max(25, slot.widthMm)} height={Math.max(10, slot.heightMm)} fill="none" stroke="#2563eb" strokeWidth="0.8" strokeDasharray="2 2" pointerEvents="none" />}
          </g>
        );
      })}
    </svg>
  );
}

function ClientApp() {
  const [categories] = useState<Category[]>(() => readLocal(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  const [themes] = useState<Theme[]>(() => readLocal(THEMES_KEY, DEFAULT_THEMES));
  const { fonts } = useInstalledFonts();
  const [categoryId, setCategoryId] = useState('');
  const [theme, setTheme] = useState<Theme | null>(null);
  const [step, setStep] = useState(1);
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('');
  const [elements, setElements] = useState<TopperElement[]>([]);
  const [slots, setSlots] = useState<TextSlot[]>([]);
  const [selected, setSelected] = useState<SelectedObject>(null);
  const [doneCode, setDoneCode] = useState('');

  const categoryThemes = useMemo(() => themes.filter((item) => item.categoryId === categoryId), [themes, categoryId]);

  const selectTheme = (item: Theme) => {
    setTheme(item);
    setElements(item.elements.map((el) => ({ ...el })));
    setSlots(fallbackSlots(item));
    setSelected(null);
    setStep(2);
  };

  const selectedSlot = selected?.kind === 'text' ? slots.find((slot) => slot.type === selected.type) : undefined;
  const selectedElement = selected?.kind === 'element' ? elements.find((el) => el.id === selected.id) : undefined;

  const updateSelectedSlot = (patch: Partial<TextSlot>) => {
    if (!selectedSlot) return;
    setSlots(slots.map((slot) => slot.type === selectedSlot.type ? { ...slot, ...patch } : slot));
  };

  const updateSelectedElement = (patch: Partial<TopperElement>) => {
    if (!selectedElement) return;
    setElements(elements.map((el) => el.id === selectedElement.id ? { ...el, ...patch } : el));
  };

  const confirm = () => {
    if (!theme) return;
    const category = categories.find((item) => item.id === theme.categoryId);
    const order: TopperOrder = {
      code: makeCode(),
      createdAt: new Date().toISOString(),
      themeId: theme.id,
      themeName: theme.name,
      categoryName: category?.name || 'Sem categoria',
      childName,
      age,
      fontFamily: slots.find((slot) => slot.type === 'name')?.fontFamily || 'Arial',
      elements,
      textSlots: slots,
      cutline: undefined,
    };
    const current = readLocal<TopperOrder[]>(ORDERS_KEY, []);
    saveLocal(ORDERS_KEY, [order, ...current]);
    setDoneCode(order.code);
    setStep(5);
  };

  if (step === 5 && theme) {
    return (
      <div className="min-h-screen bg-zinc-100 p-6 text-zinc-900">
        <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto text-emerald-600" size={64} />
          <h1 className="mt-5 text-4xl font-black">Pedido aprovado</h1>
          <p className="mt-3 text-zinc-500">Informe este código para a produção.</p>
          <div className="mx-auto mt-7 w-fit rounded-3xl bg-zinc-950 px-9 py-5 text-4xl font-black tracking-widest text-white">{doneCode}</div>
          <button onClick={() => location.reload()} className="mt-8 rounded-2xl bg-red-600 px-6 py-4 font-black text-white">Novo topo</button>
        </div>
      </div>
    );
  }

  if (!categoryId) {
    return (
      <div className="min-h-screen bg-zinc-100 text-zinc-900">
        <header className="bg-zinc-950 px-6 py-5 text-white"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-black">Topo Express</h1><p className="text-zinc-400">Escolha uma categoria</p></div></header>
        <main className="mx-auto max-w-6xl p-6 md:p-10">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => {
              const count = themes.filter((themeItem) => themeItem.categoryId === category.id).length;
              return (
                <button key={category.id} onClick={() => setCategoryId(category.id)} className="overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  {category.image ? <img src={category.image} className="h-36 w-full object-cover" /> : <div className="flex h-36 items-center justify-center bg-red-50 text-red-600"><FolderOpen size={54} /></div>}
                  <div className="p-5"><h2 className="text-2xl font-black">{category.name}</h2><p className="mt-1 text-sm font-bold text-zinc-500">{count} {count === 1 ? 'tema' : 'temas'}</p></div>
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  if (!theme) {
    const category = categories.find((item) => item.id === categoryId);
    return (
      <div className="min-h-screen bg-zinc-100 text-zinc-900">
        <header className="bg-zinc-950 px-6 py-5 text-white"><div className="mx-auto flex max-w-6xl items-center gap-4"><button onClick={() => setCategoryId('')} className="rounded-xl bg-white/10 p-3"><ArrowLeft /></button><div><h1 className="text-3xl font-black">{category?.name}</h1><p className="text-zinc-400">Escolha o tema</p></div></div></header>
        <main className="mx-auto max-w-6xl p-6 md:p-10">
          {categoryThemes.length === 0 ? <div className="rounded-3xl bg-white p-10 text-center font-bold text-zinc-500">Nenhum tema nesta categoria ainda.</div> : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {categoryThemes.map((item) => (
                <button key={item.id} onClick={() => selectTheme(item)} className="overflow-hidden rounded-3xl border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                  {item.coverImage ? <img src={item.coverImage} className="h-44 w-full object-cover" /> : <div className="flex h-44 items-center justify-center bg-zinc-50 text-5xl">{item.emoji || '🎂'}</div>}
                  <div className="p-5"><h2 className="text-xl font-black">{item.name}</h2><p className="mt-1 text-sm text-zinc-500">{item.description || `${item.elements.length} elementos`}</p></div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><div><p className="text-xs font-black uppercase tracking-widest text-red-600">Topo Express</p><h1 className="text-2xl font-black">{theme.name}</h1></div><div className="text-sm font-black text-zinc-500">PASSO {Math.min(step, 4)} DE 4</div></div></header>
      <main className="mx-auto max-w-7xl p-5 md:p-8">
        {step === 2 && (
          <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-7 shadow-sm md:p-10">
            <h2 className="text-3xl font-black">Personalize os dados</h2>
            <p className="mt-2 text-zinc-500">O texto vai usar a posição e a fonte definidas no Corel quando houver @NOME ou @IDADE.</p>
            <label className="mt-7 block font-black">Nome</label>
            <input value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Ex.: Caio" className="mt-2 min-h-14 w-full rounded-2xl border border-zinc-300 px-5 text-lg outline-none focus:border-red-500" />
            <label className="mt-5 block font-black">Idade</label>
            <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Ex.: 2" inputMode="numeric" className="mt-2 min-h-14 w-full rounded-2xl border border-zinc-300 px-5 text-lg outline-none focus:border-red-500" />
            <div className="mt-8 flex gap-3"><button onClick={() => { setTheme(null); setStep(1); }} className="rounded-2xl border px-5 py-4 font-black">Voltar</button><button onClick={() => setStep(3)} className="flex-1 rounded-2xl bg-red-600 px-5 py-4 font-black text-white">Montar A4 <ArrowRight className="inline" size={18}/></button></div>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,650px)_1fr]">
            <A4Editor elements={elements} setElements={setElements} slots={slots} setSlots={setSlots} childName={childName} age={age} selected={selected} setSelected={setSelected} interactive />
            <aside className="rounded-[28px] bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black">Ajustar elemento</h2>
              <p className="mt-1 text-sm text-zinc-500">Clique em uma imagem ou no texto dentro da A4.</p>

              {selectedSlot && (
                <div className="mt-6 space-y-5">
                  <div><label className="text-sm font-black">Texto</label><div className="mt-2 rounded-xl bg-blue-50 px-4 py-3 font-black text-blue-700">{selectedSlot.type === 'name' ? childName || 'Nome' : age ? `${age} anos` : 'Idade'}</div></div>
                  <div><label className="text-sm font-black">Fonte</label><select value={selectedSlot.fontFamily || 'Arial'} onChange={(e) => updateSelectedSlot({ fontFamily: e.target.value })} className="mt-2 min-h-12 w-full rounded-xl border px-3 font-bold"><option value={selectedSlot.fontFamily || 'Arial'}>{selectedSlot.fontFamily || 'Arial'} (Corel)</option>{fonts.filter((font) => font.family !== selectedSlot.fontFamily).map((font) => <option key={font.id} value={font.family}>{font.label}</option>)}</select></div>
                  <div><label className="text-sm font-black">Tamanho: {Math.round(selectedSlot.fontSizePt || 32)} pt</label><input type="range" min="8" max="120" value={selectedSlot.fontSizePt || 32} onChange={(e) => updateSelectedSlot({ fontSizePt: Number(e.target.value) })} className="mt-2 w-full" /></div>
                  <div><label className="text-sm font-black">Cor</label><input type="color" value={selectedSlot.fill || '#111111'} onChange={(e) => updateSelectedSlot({ fill: e.target.value })} className="mt-2 h-12 w-full rounded-xl border p-1" /></div>
                  <p className="rounded-xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-600">Arraste o texto diretamente na A4 para mudar a posição.</p>
                </div>
              )}

              {selectedElement && (
                <div className="mt-6 space-y-5">
                  <div className="rounded-xl bg-red-50 px-4 py-3 font-black text-red-700">{selectedElement.name}</div>
                  <div><label className="text-sm font-black">Tamanho: {Math.round(selectedElement.widthMm)} mm</label><input type="range" min={selectedElement.minWidthMm || 10} max={selectedElement.maxWidthMm || 120} value={selectedElement.widthMm} disabled={selectedElement.resizable === false} onChange={(e) => updateSelectedElement({ widthMm: Number(e.target.value) })} className="mt-2 w-full" /></div>
                  <p className="rounded-xl bg-zinc-50 p-4 text-sm font-semibold text-zinc-600">Arraste a imagem para reposicionar. Nenhum contorno é adicionado pelo sistema.</p>
                </div>
              )}

              {!selected && <div className="mt-6 rounded-2xl border border-dashed p-7 text-center text-sm font-bold text-zinc-400">Selecione algo na A4</div>}
              <div className="mt-8 flex gap-3"><button onClick={() => setStep(2)} className="rounded-2xl border px-5 py-4 font-black">Voltar</button><button onClick={() => setStep(4)} className="flex-1 rounded-2xl bg-red-600 px-5 py-4 font-black text-white">Revisar</button></div>
            </aside>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,620px)_1fr]">
            <A4Editor elements={elements} slots={slots} childName={childName} age={age} selected={null} />
            <div className="rounded-[30px] bg-white p-7 shadow-sm">
              <h2 className="text-3xl font-black">Resumo</h2>
              <div className="mt-6 space-y-4 text-lg"><p><strong>Tema:</strong> {theme.name}</p><p><strong>Nome:</strong> {childName || 'Sem nome'}</p><p><strong>Idade:</strong> {age ? `${age} anos` : 'Sem idade'}</p><p><strong>Elementos:</strong> {elements.length}</p></div>
              <div className="mt-7 rounded-2xl bg-emerald-50 p-5 font-bold text-emerald-900">Ao aprovar, esta A4 fica salva no pedido e aparece no painel da produção.</div>
              <div className="mt-8 flex gap-3"><button onClick={() => setStep(3)} className="rounded-2xl border px-5 py-4 font-black">Voltar</button><button onClick={confirm} className="flex-1 rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white">Aprovar pedido</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AdminPanel() {
  const [categories, setCategories] = useState<Category[]>(() => readLocal(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  const [themes, setThemes] = useState<Theme[]>(() => readLocal(THEMES_KEY, DEFAULT_THEMES));
  const [orders, setOrders] = useState<TopperOrder[]>(() => readLocal(ORDERS_KEY, []));
  const { fonts, saveFonts } = useInstalledFonts();
  const [tab, setTab] = useState<'orders' | 'categories' | 'themes' | 'fonts'>('orders');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [search, setSearch] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newTheme, setNewTheme] = useState('');
  const [newThemeCategory, setNewThemeCategory] = useState(categories[0]?.id || '');
  const [fontLabel, setFontLabel] = useState('');
  const [fontFamily, setFontFamily] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setOrders(readLocal(ORDERS_KEY, [])), 1500);
    return () => clearInterval(timer);
  }, []);

  const saveCategories = (next: Category[]) => { setCategories(next); saveLocal(CATEGORIES_KEY, next); };
  const saveThemes = (next: Theme[]) => { setThemes(next); saveLocal(THEMES_KEY, next); };

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const selectedTheme = themes.find((item) => item.id === selectedThemeId);
  const foundOrder = search.trim() ? orders.find((order) => order.code.toLowerCase() === search.trim().toLowerCase()) : orders[0];

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    const category: Category = { id: uid('cat'), name };
    saveCategories([...categories, category]);
    setNewCategory('');
    setSelectedCategoryId(category.id);
  };

  const addTheme = () => {
    const name = newTheme.trim();
    if (!name || !newThemeCategory) return;
    const theme: Theme = { id: uid('theme'), name, categoryId: newThemeCategory, elements: [], source: 'manual' };
    saveThemes([...themes, theme]);
    setNewTheme('');
    setSelectedThemeId(theme.id);
  };

  const uploadFont = async (file?: File) => {
    if (!file || !fontFamily.trim()) return;
    const asset: FontAsset = { id: uid('font'), label: fontLabel.trim() || fontFamily.trim(), family: fontFamily.trim(), dataUrl: await fileToDataUrl(file) };
    saveFonts([...fonts, asset]);
    setFontLabel('');
    setFontFamily('');
  };

  const updateCategoryImage = async (file?: File) => {
    if (!file || !selectedCategory) return;
    const image = await fileToDataUrl(file);
    saveCategories(categories.map((category) => category.id === selectedCategory.id ? { ...category, image } : category));
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="bg-zinc-950 text-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><div className="flex items-center gap-3"><LayoutDashboard/><div><h1 className="text-2xl font-black">Topo Express Admin</h1><p className="text-xs text-zinc-400">Catálogo e produção</p></div></div><a href="#/" className="rounded-xl bg-white px-4 py-2 font-black text-zinc-950">Abrir cliente</a></div></header>
      <main className="mx-auto max-w-7xl p-5 md:p-8">
        <div className="mb-6 flex flex-wrap gap-2">{(['orders','categories','themes','fonts'] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-xl px-5 py-3 font-black ${tab === item ? 'bg-red-600 text-white' : 'bg-white'}`}>{item === 'orders' ? 'Pedidos' : item === 'categories' ? 'Categorias' : item === 'themes' ? 'Temas' : 'Fontes'}</button>)}</div>

        {tab === 'orders' && (
          <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
            <div className="rounded-3xl bg-white p-5"><div className="flex items-center gap-2 rounded-xl border px-3"><Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Código do pedido" className="min-h-12 w-full outline-none" /></div><div className="mt-4 space-y-2">{orders.slice(0,20).map((order) => <button key={order.code} onClick={() => setSearch(order.code)} className="w-full rounded-xl bg-zinc-50 p-3 text-left"><strong>{order.code}</strong><div className="text-sm text-zinc-500">{order.themeName} • {order.childName || 'Sem nome'}</div></button>)}</div></div>
            <div className="rounded-3xl bg-white p-6">{foundOrder ? <div className="grid gap-6 lg:grid-cols-[390px_1fr]"><A4Editor elements={foundOrder.elements} slots={foundOrder.textSlots || []} childName={foundOrder.childName} age={foundOrder.age} selected={null}/><div><p className="text-sm font-black text-red-600">{foundOrder.code}</p><h2 className="mt-2 text-3xl font-black">{foundOrder.themeName}</h2><p className="mt-4"><strong>Categoria:</strong> {foundOrder.categoryName}</p><p><strong>Nome:</strong> {foundOrder.childName || 'Sem nome'}</p><p><strong>Idade:</strong> {foundOrder.age ? `${foundOrder.age} anos` : 'Sem idade'}</p><button onClick={() => downloadOrderPng(foundOrder)} className="mt-6 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white"><Download size={20}/> Baixar A4 PNG</button></div></div> : <p className="text-zinc-500">Nenhum pedido.</p>}</div>
          </div>
        )}

        {tab === 'categories' && (
          <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
            <div className="rounded-3xl bg-white p-5"><h2 className="text-2xl font-black">Categorias</h2><div className="mt-4 flex gap-2"><input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nova categoria" className="min-h-12 min-w-0 flex-1 rounded-xl border px-3"/><button onClick={addCategory} className="rounded-xl bg-red-600 px-4 text-white"><Plus/></button></div><div className="mt-5 space-y-2">{categories.map((category) => <button key={category.id} onClick={() => setSelectedCategoryId(category.id)} className={`flex w-full items-center justify-between rounded-2xl p-4 text-left font-black ${selectedCategoryId === category.id ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-zinc-50'}`}><span>{category.name}</span><span className="text-xs">{themes.filter((theme) => theme.categoryId === category.id).length} temas</span></button>)}</div></div>
            <div className="rounded-3xl bg-white p-6">{selectedCategory ? <div><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase text-red-600">Categoria</p><input value={selectedCategory.name} onChange={(e) => saveCategories(categories.map((c) => c.id === selectedCategory.id ? { ...c, name: e.target.value } : c))} className="mt-2 border-b-2 border-zinc-200 text-3xl font-black outline-none focus:border-red-500"/></div><button onClick={() => { if (themes.some((t) => t.categoryId === selectedCategory.id)) return alert('Mova ou exclua os temas desta categoria primeiro.'); saveCategories(categories.filter((c) => c.id !== selectedCategory.id)); setSelectedCategoryId(''); }} className="rounded-xl border border-red-200 px-4 py-3 font-black text-red-600"><Trash2 size={18}/></button></div><label className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 font-black"><ImagePlus/> Alterar imagem da categoria<input type="file" accept="image/*" className="hidden" onChange={(e) => updateCategoryImage(e.target.files?.[0])}/></label><h3 className="mt-7 text-xl font-black">Temas dentro dela</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{themes.filter((t) => t.categoryId === selectedCategory.id).map((t) => <button key={t.id} onClick={() => { setSelectedThemeId(t.id); setTab('themes'); }} className="rounded-2xl bg-zinc-50 p-4 text-left"><strong>{t.name}</strong><div className="text-sm text-zinc-500">{t.elements.length} elementos</div></button>)}</div></div> : <div className="py-16 text-center font-bold text-zinc-400">Clique em uma categoria para entrar e editar.</div>}</div>
          </div>
        )}

        {tab === 'themes' && (
          <div className="grid gap-6 lg:grid-cols-[370px_1fr]">
            <div className="rounded-3xl bg-white p-5"><h2 className="text-2xl font-black">Novo tema</h2><input value={newTheme} onChange={(e) => setNewTheme(e.target.value)} placeholder="Nome do tema" className="mt-4 min-h-12 w-full rounded-xl border px-3"/><select value={newThemeCategory} onChange={(e) => setNewThemeCategory(e.target.value)} className="mt-3 min-h-12 w-full rounded-xl border px-3 font-bold">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><button onClick={addTheme} className="mt-3 w-full rounded-xl bg-red-600 px-4 py-3 font-black text-white">Criar tema</button><a href="#/importar" className="mt-3 block rounded-xl border border-red-200 px-4 py-3 text-center font-black text-red-600">Importar pacote Corel</a><div className="mt-6 space-y-2">{themes.map((item) => <button key={item.id} onClick={() => setSelectedThemeId(item.id)} className={`w-full rounded-xl p-3 text-left ${selectedThemeId === item.id ? 'bg-red-50 ring-1 ring-red-200' : 'bg-zinc-50'}`}><strong>{item.name}</strong><div className="text-xs text-zinc-500">{categories.find((c) => c.id === item.categoryId)?.name || 'Sem categoria'}</div></button>)}</div></div>
            <div className="rounded-3xl bg-white p-6">{selectedTheme ? <div><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase text-red-600">Tema</p><input value={selectedTheme.name} onChange={(e) => saveThemes(themes.map((t) => t.id === selectedTheme.id ? { ...t, name: e.target.value } : t))} className="mt-2 border-b-2 text-3xl font-black outline-none"/></div><button onClick={() => { saveThemes(themes.filter((t) => t.id !== selectedTheme.id)); setSelectedThemeId(''); }} className="rounded-xl border border-red-200 p-3 text-red-600"><Trash2/></button></div><label className="mt-6 block text-sm font-black">Categoria</label><select value={selectedTheme.categoryId} onChange={(e) => saveThemes(themes.map((t) => t.id === selectedTheme.id ? { ...t, categoryId: e.target.value } : t))} className="mt-2 min-h-12 w-full max-w-md rounded-xl border px-3 font-bold">{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><div className="mt-7 rounded-2xl bg-zinc-50 p-5"><p className="font-black">{selectedTheme.elements.length} elementos</p><p className="mt-1 text-sm text-zinc-500">{selectedTheme.textSlots?.length || 0} campos editáveis do Corel (@NOME/@IDADE)</p><p className="mt-2 text-sm font-bold text-emerald-700">O site não adiciona mais contorno automático aos PNGs.</p></div></div> : <div className="py-16 text-center font-bold text-zinc-400">Crie ou selecione um tema.</div>}</div>
          </div>
        )}

        {tab === 'fonts' && (
          <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <div className="rounded-3xl bg-white p-6"><div className="flex items-center gap-3"><Type className="text-red-600"/><h2 className="text-2xl font-black">Cadastrar fonte</h2></div><p className="mt-2 text-sm text-zinc-500">Use o mesmo nome que aparece no Corel em “Família da fonte”. O sistema carrega a fonte para qualquer usuário.</p><input value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} placeholder="Família exata no Corel, ex.: Bangers" className="mt-5 min-h-12 w-full rounded-xl border px-3"/><input value={fontLabel} onChange={(e) => setFontLabel(e.target.value)} placeholder="Nome para exibir (opcional)" className="mt-3 min-h-12 w-full rounded-xl border px-3"/><label className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 font-black ${fontFamily.trim() ? '' : 'pointer-events-none opacity-40'}`}><Upload/> Enviar .woff2, .woff, .ttf ou .otf<input type="file" accept=".woff2,.woff,.ttf,.otf" className="hidden" onChange={(e) => uploadFont(e.target.files?.[0])}/></label></div>
            <div className="rounded-3xl bg-white p-6"><h2 className="text-2xl font-black">Biblioteca</h2>{fonts.length === 0 ? <p className="mt-4 text-zinc-500">Nenhuma fonte cadastrada ainda.</p> : <div className="mt-5 space-y-3">{fonts.map((font) => <div key={font.id} className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"><div><strong>{font.label}</strong><div className="text-sm text-zinc-500">Família: {font.family}</div><div className="mt-2 text-2xl" style={{fontFamily: font.family}}>Caio • João • Maria</div></div><button onClick={() => saveFonts(fonts.filter((f) => f.id !== font.id))} className="rounded-xl p-3 text-red-600"><Trash2/></button></div>)}</div>}</div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AppNext() {
  const hash = window.location.hash || '#/';
  return hash.startsWith('#/admin') ? <AdminPanel /> : <ClientApp />;
}
