import { PointerEvent, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CakeSlice,
  Check,
  CheckCircle2,
  Download,
  FolderPlus,
  ImagePlus,
  LayoutDashboard,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Category,
  DEFAULT_CATEGORIES,
  DEFAULT_THEMES,
  FONT_OPTIONS,
  Theme,
  TopperElement,
  TopperOrder,
} from './data/catalog';

const CATEGORIES_KEY = 'topo-categories-v2';
const THEMES_KEY = 'topo-themes-v2';
const ORDERS_KEY = 'topo-orders-v2';
const steps = ['Tema', 'Dados', 'Montagem', 'Confirmar'];

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

function imageAspect(src: string): Promise<number> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image.naturalWidth / Math.max(1, image.naturalHeight));
    image.onerror = () => resolve(1);
    image.src = src;
  });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char] || char));
}

function buildSvg(order: Pick<TopperOrder, 'elements' | 'childName' | 'age' | 'fontFamily'>) {
  const images = order.elements.map((element) => {
    const aspect = element.aspect || 1;
    const height = element.widthMm / aspect;
    return `<image href="${element.src}" x="${element.xMm}" y="${element.yMm}" width="${element.widthMm}" height="${height}" preserveAspectRatio="xMidYMid meet" />`;
  }).join('');

  const name = order.childName
    ? `<text x="105" y="256" text-anchor="middle" font-family="${escapeXml(order.fontFamily)}" font-size="15" font-weight="700" fill="#111">${escapeXml(order.childName)}</text>`
    : '';
  const age = order.age
    ? `<text x="105" y="276" text-anchor="middle" font-family="${escapeXml(order.fontFamily)}" font-size="11" font-weight="700" fill="#111">${escapeXml(order.age)} anos</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297"><rect width="210" height="297" fill="white"/>${images}${name}${age}</svg>`;
}

async function downloadOrderPng(order: Pick<TopperOrder, 'elements' | 'childName' | 'age' | 'fontFamily'>, filename: string) {
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
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.click();
}

function A4Canvas({
  elements,
  childName,
  age,
  fontFamily,
  selectedId,
  setSelectedId,
  onMove,
  interactive = false,
}: {
  elements: TopperElement[];
  childName: string;
  age: string;
  fontFamily: string;
  selectedId?: string;
  setSelectedId?: (id: string) => void;
  onMove?: (id: string, xMm: number, yMm: number) => void;
  interactive?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const pointerToMm = (event: PointerEvent<SVGSVGElement>) => {
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
      className="aspect-[210/297] w-full bg-white shadow-[0_12px_35px_rgba(0,0,0,.15)] ring-1 ring-zinc-200 touch-none"
      onPointerMove={(event) => {
        if (!interactive || !dragRef.current || !onMove) return;
        const point = pointerToMm(event);
        const current = elements.find((item) => item.id === dragRef.current?.id);
        if (!current) return;
        const height = current.widthMm / (current.aspect || 1);
        onMove(
          current.id,
          Math.max(0, Math.min(210 - current.widthMm, point.x - dragRef.current.dx)),
          Math.max(0, Math.min(297 - height, point.y - dragRef.current.dy)),
        );
      }}
      onPointerUp={() => { dragRef.current = null; }}
      onPointerLeave={() => { dragRef.current = null; }}
    >
      <rect width="210" height="297" fill="#fff" />
      {elements.map((element) => {
        const aspect = element.aspect || 1;
        const height = element.widthMm / aspect;
        const selected = selectedId === element.id;
        return (
          <g key={element.id}>
            <image
              href={element.src}
              x={element.xMm}
              y={element.yMm}
              width={element.widthMm}
              height={height}
              preserveAspectRatio="xMidYMid meet"
              onPointerDown={(event) => {
                if (!interactive) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                const rect = svgRef.current?.getBoundingClientRect();
                if (!rect) return;
                const x = ((event.clientX - rect.left) / rect.width) * 210;
                const y = ((event.clientY - rect.top) / rect.height) * 297;
                dragRef.current = { id: element.id, dx: x - element.xMm, dy: y - element.yMm };
                setSelectedId?.(element.id);
              }}
              className={interactive ? 'cursor-move' : ''}
            />
            {selected && interactive && (
              <rect x={element.xMm} y={element.yMm} width={element.widthMm} height={height} fill="none" stroke="#ef4444" strokeWidth="1.2" strokeDasharray="3 2" pointerEvents="none" />
            )}
          </g>
        );
      })}
      {childName && <text x="105" y="256" textAnchor="middle" fontFamily={fontFamily} fontSize="15" fontWeight="700" fill="#111">{childName}</text>}
      {age && <text x="105" y="276" textAnchor="middle" fontFamily={fontFamily} fontSize="11" fontWeight="700" fill="#111">{age} anos</text>}
    </svg>
  );
}

function AdminPanel() {
  const [categories, setCategories] = useState<Category[]>(() => readLocal(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  const [themes, setThemes] = useState<Theme[]>(() => readLocal(THEMES_KEY, DEFAULT_THEMES));
  const [orders] = useState<TopperOrder[]>(() => readLocal(ORDERS_KEY, []));
  const [tab, setTab] = useState<'orders' | 'categories' | 'themes'>('orders');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState(themes[0]?.id || '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('');
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeDescription, setNewThemeDescription] = useState('');
  const [newThemeCategory, setNewThemeCategory] = useState(categories[0]?.id || '');
  const [newThemeCover, setNewThemeCover] = useState('');

  const saveCategories = (next: Category[]) => {
    setCategories(next);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
  };
  const saveThemes = (next: Theme[]) => {
    setThemes(next);
    localStorage.setItem(THEMES_KEY, JSON.stringify(next));
  };

  const selectedTheme = themes.find((item) => item.id === selectedThemeId);
  const foundOrder = orders.find((order) => order.code.toLowerCase() === orderSearch.trim().toLowerCase());

  const handleCoverFile = async (file?: File, target: 'category' | 'theme' = 'theme') => {
    if (!file) return;
    const data = await fileToDataUrl(file);
    target === 'category' ? setNewCategoryImage(data) : setNewThemeCover(data);
  };

  const addElements = async (files: FileList | null) => {
    if (!files || !selectedTheme) return;
    const created: TopperElement[] = [];
    let index = selectedTheme.elements.length;
    for (const file of Array.from(files)) {
      const src = await fileToDataUrl(file);
      const aspect = await imageAspect(src);
      const col = index % 3;
      const row = Math.floor(index / 3);
      created.push({
        id: uid('el'),
        name: file.name.replace(/\.[^.]+$/, ''),
        src,
        xMm: 15 + col * 62,
        yMm: 18 + row * 62,
        widthMm: 48,
        aspect,
      });
      index += 1;
    }
    saveThemes(themes.map((theme) => theme.id === selectedTheme.id ? { ...theme, elements: [...theme.elements, ...created] } : theme));
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-800 bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3"><LayoutDashboard /><div><p className="text-xl font-black">Topo Express Admin</p><p className="text-xs text-zinc-400">Cadastro e produção</p></div></div>
          <a href="#/" className="rounded-xl bg-white px-4 py-2 font-bold text-zinc-900">Abrir cliente</a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-5">
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ['orders', 'Pedidos'], ['categories', 'Categorias'], ['themes', 'Temas e PNGs'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)} className={`rounded-xl px-5 py-3 font-black ${tab === id ? 'bg-red-600 text-white' : 'bg-white text-zinc-700'}`}>{label}</button>
          ))}
        </div>

        {tab === 'orders' && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h1 className="text-3xl font-black">Buscar pedido</h1>
            <p className="mt-2 text-zinc-600">Digite o código entregue ao cliente.</p>
            <div className="mt-5 flex gap-3">
              <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value)} placeholder="Ex.: TB1842" className="min-h-14 flex-1 rounded-2xl border-2 border-zinc-200 px-5 text-xl font-black uppercase outline-none focus:border-red-500" />
            </div>

            {orderSearch && !foundOrder && <p className="mt-6 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">Pedido não encontrado neste navegador.</p>}
            {foundOrder && (
              <div className="mt-8 grid gap-7 lg:grid-cols-[430px_1fr]">
                <A4Canvas elements={foundOrder.elements} childName={foundOrder.childName} age={foundOrder.age} fontFamily={foundOrder.fontFamily} />
                <div className="rounded-3xl bg-zinc-50 p-6">
                  <p className="text-sm font-black uppercase tracking-wider text-red-600">{foundOrder.code}</p>
                  <h2 className="mt-2 text-3xl font-black">{foundOrder.themeName}</h2>
                  <div className="mt-5 space-y-3 text-lg">
                    <p><strong>Categoria:</strong> {foundOrder.categoryName}</p>
                    <p><strong>Nome:</strong> {foundOrder.childName || 'Sem nome'}</p>
                    <p><strong>Idade:</strong> {foundOrder.age ? `${foundOrder.age} anos` : 'Sem idade'}</p>
                    <p><strong>Elementos:</strong> {foundOrder.elements.length}</p>
                  </div>
                  <button onClick={() => downloadOrderPng(foundOrder, `${foundOrder.code}-${foundOrder.themeName}.png`)} className="mt-7 flex min-h-14 items-center gap-2 rounded-2xl bg-emerald-600 px-6 font-black text-white"><Download size={21} /> Baixar A4 em PNG</button>
                </div>
              </div>
            )}
          </section>
        )}

        {tab === 'categories' && (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2"><FolderPlus className="text-red-600" /><h2 className="text-2xl font-black">Nova categoria</h2></div>
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ex.: Meninas" className="mt-5 min-h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 font-bold outline-none focus:border-red-500" />
              <label className="mt-4 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 font-bold"><ImagePlus /> Imagem da categoria<input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverFile(e.target.files?.[0], 'category')} /></label>
              {newCategoryImage && <img src={newCategoryImage} className="mt-3 h-28 w-full rounded-2xl object-cover" />}
              <button onClick={() => {
                if (!newCategoryName.trim()) return;
                saveCategories([...categories, { id: uid('cat'), name: newCategoryName.trim(), image: newCategoryImage || undefined }]);
                setNewCategoryName(''); setNewCategoryImage('');
              }} className="mt-4 min-h-14 w-full rounded-2xl bg-red-600 font-black text-white">Criar categoria</button>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black">Categorias</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                  <div key={category.id} className="overflow-hidden rounded-2xl border border-zinc-200">
                    {category.image ? <img src={category.image} className="h-32 w-full object-cover" /> : <div className="flex h-32 items-center justify-center bg-zinc-100 text-4xl">📁</div>}
                    <div className="flex items-center justify-between p-4"><strong>{category.name}</strong><button onClick={() => saveCategories(categories.filter((item) => item.id !== category.id))} className="text-zinc-400 hover:text-red-600"><Trash2 size={19} /></button></div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'themes' && (
          <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
            <div className="space-y-6">
              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2"><Plus className="text-red-600" /><h2 className="text-2xl font-black">Novo tema</h2></div>
                <input value={newThemeName} onChange={(e) => setNewThemeName(e.target.value)} placeholder="Ex.: Bluey" className="mt-5 min-h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 font-bold outline-none focus:border-red-500" />
                <textarea value={newThemeDescription} onChange={(e) => setNewThemeDescription(e.target.value)} placeholder="Descrição curta" className="mt-3 min-h-24 w-full rounded-2xl border-2 border-zinc-200 p-4 font-semibold outline-none focus:border-red-500" />
                <select value={newThemeCategory} onChange={(e) => setNewThemeCategory(e.target.value)} className="mt-3 min-h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 font-bold">
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <label className="mt-3 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 font-bold"><ImagePlus /> Capa do tema<input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverFile(e.target.files?.[0], 'theme')} /></label>
                {newThemeCover && <img src={newThemeCover} className="mt-3 h-32 w-full rounded-2xl object-cover" />}
                <button onClick={() => {
                  if (!newThemeName.trim() || !newThemeCategory) return;
                  const theme: Theme = { id: uid('theme'), name: newThemeName.trim(), categoryId: newThemeCategory, description: newThemeDescription.trim(), coverImage: newThemeCover || undefined, elements: [] };
                  saveThemes([...themes, theme]);
                  setSelectedThemeId(theme.id); setNewThemeName(''); setNewThemeDescription(''); setNewThemeCover('');
                }} className="mt-4 min-h-14 w-full rounded-2xl bg-red-600 font-black text-white">Criar tema</button>
              </section>

              <section className="rounded-3xl bg-white p-4 shadow-sm">
                <p className="px-2 pb-3 font-black">Temas cadastrados</p>
                <div className="max-h-[420px] space-y-2 overflow-auto">
                  {themes.map((theme) => (
                    <button key={theme.id} onClick={() => setSelectedThemeId(theme.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${selectedThemeId === theme.id ? 'bg-red-50 ring-2 ring-red-500' : 'bg-zinc-50'}`}>
                      {theme.coverImage ? <img src={theme.coverImage} className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl">{theme.emoji || '🎂'}</div>}
                      <div className="min-w-0"><p className="truncate font-black">{theme.name}</p><p className="text-sm text-zinc-500">{theme.elements.length} PNGs</p></div>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              {selectedTheme ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div><p className="text-sm font-black uppercase tracking-wider text-red-600">Editar tema</p><h2 className="mt-1 text-3xl font-black">{selectedTheme.name}</h2></div>
                    <button onClick={() => { saveThemes(themes.filter((item) => item.id !== selectedTheme.id)); setSelectedThemeId(''); }} className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 font-bold text-red-600"><Trash2 size={18} /> Excluir tema</button>
                  </div>

                  <label className="mt-6 flex min-h-20 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-lg font-black hover:border-red-400"><Upload /> Adicionar vários PNGs transparentes<input type="file" multiple accept="image/png,image/webp" className="hidden" onChange={(e) => addElements(e.target.files)} /></label>
                  <p className="mt-2 text-sm font-semibold text-zinc-500">Os arquivos entram soltos na folha A4 e recebem posição/tamanho inicial automaticamente.</p>

                  <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedTheme.elements.map((element) => (
                      <div key={element.id} className="rounded-2xl border border-zinc-200 p-3">
                        <div className="flex h-32 items-center justify-center rounded-xl bg-[linear-gradient(45deg,#eee_25%,transparent_25%),linear-gradient(-45deg,#eee_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#eee_75%),linear-gradient(-45deg,transparent_75%,#eee_75%)] bg-[length:20px_20px]"><img src={element.src} className="max-h-28 max-w-full object-contain" /></div>
                        <p className="mt-3 truncate font-black">{element.name}</p>
                        <p className="text-sm text-zinc-500">{(element.widthMm / 10).toFixed(1)} cm</p>
                        <button onClick={() => saveThemes(themes.map((theme) => theme.id === selectedTheme.id ? { ...theme, elements: theme.elements.filter((item) => item.id !== element.id) } : theme))} className="mt-2 text-sm font-bold text-red-600">Remover</button>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p className="text-zinc-500">Selecione um tema.</p>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function ClientApp() {
  const [categories] = useState<Category[]>(() => readLocal(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  const [themes] = useState<Theme[]>(() => readLocal(THEMES_KEY, DEFAULT_THEMES));
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('');
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].family);
  const [elements, setElements] = useState<TopperElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState('');
  const [createdOrder, setCreatedOrder] = useState<TopperOrder | null>(null);

  const filteredThemes = useMemo(() => themes.filter((theme) => {
    const categoryOk = categoryId === 'all' || theme.categoryId === categoryId;
    const searchOk = !search.trim() || theme.name.toLowerCase().includes(search.trim().toLowerCase());
    return categoryOk && searchOk;
  }), [themes, categoryId, search]);

  const selectedElement = elements.find((item) => item.id === selectedElementId);

  const chooseTheme = (theme: Theme) => {
    setSelectedTheme(theme);
    setElements(theme.elements.map((item) => ({ ...item })));
    setSelectedElementId(theme.elements[0]?.id || '');
  };

  const updateElement = (id: string, patch: Partial<TopperElement>) => {
    setElements((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const finishOrder = () => {
    if (!selectedTheme) return;
    const categoryName = categories.find((item) => item.id === selectedTheme.categoryId)?.name || '';
    const order: TopperOrder = {
      code: makeCode(), createdAt: new Date().toISOString(), themeId: selectedTheme.id, themeName: selectedTheme.name, categoryName,
      childName: childName.trim(), age, fontFamily, elements: elements.map((item) => ({ ...item })),
    };
    const orders = readLocal<TopperOrder[]>(ORDERS_KEY, []);
    localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...orders]));
    setCreatedOrder(order);
  };

  const restart = () => {
    setStep(0); setSearch(''); setCategoryId('all'); setSelectedTheme(null); setChildName(''); setAge(''); setFontFamily(FONT_OPTIONS[0].family); setElements([]); setSelectedElementId(''); setCreatedOrder(null);
  };

  if (createdOrder) {
    return (
      <div className="min-h-screen bg-zinc-100 p-5">
        <div className="mx-auto max-w-3xl rounded-[32px] bg-white p-8 text-center shadow-xl md:p-12">
          <CheckCircle2 className="mx-auto text-emerald-600" size={70} />
          <p className="mt-5 font-black uppercase tracking-wider text-emerald-700">Pedido criado</p>
          <h1 className="mt-2 text-4xl font-black">Mostre este código no balcão</h1>
          <div className="mx-auto my-8 max-w-md rounded-3xl bg-zinc-950 px-6 py-8 text-6xl font-black tracking-wider text-white">{createdOrder.code}</div>
          <button onClick={restart} className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-zinc-900 px-7 font-black text-white"><RotateCcw size={20} /> Fazer outro topo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white"><CakeSlice /></div><div><p className="text-xl font-black">Topo Express</p><p className="text-sm text-zinc-500">Monte seu topo de forma simples</p></div></div>
          <a href="#/admin" className="hidden rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-500 md:block">Admin</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-5 md:py-9">
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((label, index) => <div key={label}><div className={`h-2 rounded-full ${index <= step ? 'bg-red-600' : 'bg-zinc-200'}`} /><div className="mt-2 flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${index <= step ? 'bg-zinc-900 text-white' : 'bg-zinc-200'}`}>{index < step ? <Check size={15} /> : index + 1}</span><span className="hidden text-sm font-bold sm:inline">{label}</span></div></div>)}
          </div>
        </div>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          {step === 0 && (
            <div>
              <p className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-red-600"><Sparkles size={17} /> Passo 1 de 4</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Qual é o tema da festa?</h1>
              <p className="mt-2 text-lg text-zinc-600">Toque em uma opção. Você poderá conferir tudo antes de finalizar.</p>

              <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                <button onClick={() => setCategoryId('all')} className={`min-w-28 rounded-2xl border-2 px-4 py-3 font-black ${categoryId === 'all' ? 'border-red-600 bg-red-50' : 'border-zinc-200'}`}>Todos</button>
                {categories.map((category) => (
                  <button key={category.id} onClick={() => setCategoryId(category.id)} className={`min-w-32 overflow-hidden rounded-2xl border-2 text-left ${categoryId === category.id ? 'border-red-600 bg-red-50' : 'border-zinc-200'}`}>
                    {category.image && <img src={category.image} className="h-16 w-full object-cover" />}
                    <span className="block px-4 py-3 font-black">{category.name}</span>
                  </button>
                ))}
              </div>

              <label className="my-5 flex min-h-16 items-center gap-3 rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 focus-within:border-red-500"><Search size={24} className="text-zinc-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-xl font-semibold outline-none" placeholder="Buscar tema..." /></label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {filteredThemes.map((theme) => {
                  const selected = selectedTheme?.id === theme.id;
                  return <button key={theme.id} onClick={() => chooseTheme(theme)} className={`relative min-h-40 overflow-hidden rounded-3xl border-2 text-left ${selected ? 'border-red-600 shadow-lg shadow-red-100' : 'border-zinc-200'}`}>
                    {theme.coverImage ? <img src={theme.coverImage} className="absolute inset-0 h-full w-full object-cover opacity-90" /> : <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-200" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-transparent" />
                    <div className="relative flex h-full flex-col justify-between p-4"><span className="text-5xl">{theme.emoji || '🎂'}</span><div><p className="text-xl font-black">{theme.name}</p><p className="mt-1 text-sm font-semibold text-zinc-700">{theme.description || `${theme.elements.length} elementos`}</p></div></div>
                    {selected && <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white"><Check size={20} /></span>}
                  </button>;
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-4xl">
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 2 de 4</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Agora, só duas informações</h1>
              <p className="mt-2 text-lg text-zinc-600">Digite exatamente como deseja ver no topo.</p>

              <div className="mt-8">
                <label className="mb-2 block text-xl font-extrabold">Nome do aniversariante</label>
                <input value={childName} onChange={(e) => setChildName(e.target.value.slice(0, 24))} placeholder="Ex.: Maria Clara" className="min-h-16 w-full rounded-2xl border-2 border-zinc-200 px-5 text-xl font-semibold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" />
                <p className="mt-2 text-sm font-semibold text-zinc-500">Máximo de 24 caracteres. Se deixar vazio, o topo ficará sem nome.</p>
              </div>

              <div className="mt-7">
                <p className="mb-3 text-xl font-extrabold">Idade</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => <button key={value} onClick={() => setAge(value)} className={`h-14 min-w-16 rounded-2xl border-2 font-bold ${age === value ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200 bg-white'}`}>{value}</button>)}
                  <button onClick={() => setAge('')} className={`h-14 min-w-32 rounded-2xl border-2 px-4 font-black ${age === '' ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200 bg-white'}`}>Sem idade</button>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center gap-2"><Settings2 size={21} className="text-red-600" /><p className="text-xl font-extrabold">Escolha a fonte</p></div>
                <p className="mt-1 text-zinc-500">Temos opções infantis, fortes e script para temas femininos.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {FONT_OPTIONS.map((font) => <button key={font.id} onClick={() => setFontFamily(font.family)} className={`rounded-2xl border-2 p-4 text-left ${fontFamily === font.family ? 'border-red-600 bg-red-50' : 'border-zinc-200'}`}><p className="text-xs font-black uppercase tracking-wider text-zinc-500">{font.kind}</p><p className="mt-2 truncate text-3xl" style={{ fontFamily: font.family }}>{childName || 'Maria Clara'}</p><p className="mt-2 text-sm font-bold text-zinc-500">{font.name}</p></button>)}
                </div>
              </div>
            </div>
          )}

          {step === 2 && selectedTheme && (
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 3 de 4</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Ajuste o topo na folha A4</h1>
              <p className="mt-2 text-lg text-zinc-600">Arraste os elementos. Selecione um para ver o tamanho real em centímetros.</p>
              {elements.length === 0 && <div className="mt-6 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">Este tema ainda não tem PNGs. Entre no Admin → Temas e PNGs e envie os elementos transparentes.</div>}
              <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,520px)_1fr]">
                <div><A4Canvas elements={elements} childName={childName} age={age} fontFamily={fontFamily} selectedId={selectedElementId} setSelectedId={setSelectedElementId} onMove={(id, xMm, yMm) => updateElement(id, { xMm, yMm })} interactive /><p className="mt-3 text-center text-sm font-black text-zinc-500">A4 • 21 × 29,7 cm</p></div>
                <div className="rounded-3xl bg-zinc-50 p-5">
                  <h2 className="text-2xl font-black">Elemento selecionado</h2>
                  {selectedElement ? <div className="mt-5">
                    <div className="flex h-32 items-center justify-center rounded-2xl bg-white"><img src={selectedElement.src} className="max-h-28 max-w-full object-contain" /></div>
                    <p className="mt-4 text-xl font-black">{selectedElement.name}</p>
                    <label className="mt-5 block font-black">Largura: {(selectedElement.widthMm / 10).toFixed(1)} cm</label>
                    <input type="range" min="20" max="120" step="2" value={selectedElement.widthMm} onChange={(e) => updateElement(selectedElement.id, { widthMm: Number(e.target.value) })} className="mt-3 w-full accent-red-600" />
                    <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-zinc-500">X</p><p className="text-xl font-black">{(selectedElement.xMm / 10).toFixed(1)} cm</p></div><div className="rounded-2xl bg-white p-3"><p className="text-xs font-bold text-zinc-500">Y</p><p className="text-xl font-black">{(selectedElement.yMm / 10).toFixed(1)} cm</p></div></div>
                    <div className="mt-4 flex gap-2"><button onClick={() => updateElement(selectedElement.id, { widthMm: Math.max(20, selectedElement.widthMm - 5) })} className="min-h-12 flex-1 rounded-xl border-2 border-zinc-200 bg-white font-black">− Menor</button><button onClick={() => updateElement(selectedElement.id, { widthMm: Math.min(120, selectedElement.widthMm + 5) })} className="min-h-12 flex-1 rounded-xl border-2 border-zinc-200 bg-white font-black">+ Maior</button></div>
                  </div> : <p className="mt-4 text-zinc-500">Clique em um PNG na folha.</p>}
                </div>
              </div>
            </div>
          )}

          {step === 3 && selectedTheme && (
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 4 de 4</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Confira antes de aprovar</h1>
              <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,520px)_1fr]">
                <A4Canvas elements={elements} childName={childName} age={age} fontFamily={fontFamily} />
                <div className="rounded-3xl bg-zinc-50 p-6"><p className="text-sm font-black uppercase tracking-wider text-zinc-500">Resumo</p><div className="mt-5 space-y-3 text-lg"><p><strong>Tema:</strong> {selectedTheme.name}</p><p><strong>Nome:</strong> {childName || 'Sem nome'}</p><p><strong>Idade:</strong> {age ? `${age} anos` : 'Sem idade'}</p><p><strong>Elementos:</strong> {elements.length}</p></div><button onClick={finishOrder} className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 font-black text-white"><CheckCircle2 size={22} /> Aprovar meu topo</button></div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:justify-between">
            <button onClick={() => setStep((value) => Math.max(0, value - 1))} disabled={step === 0} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-zinc-200 px-6 text-lg font-extrabold disabled:opacity-0"><ArrowLeft size={21} /> Voltar</button>
            {step < 3 && <button onClick={() => setStep((value) => Math.min(3, value + 1))} disabled={step === 0 && !selectedTheme} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-8 text-lg font-extrabold text-white disabled:bg-zinc-300">Continuar <ArrowRight size={21} /></button>}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const route = window.location.hash.replace('#/', '') || 'client';
  return route === 'admin' ? <AdminPanel /> : <ClientApp />;
}
