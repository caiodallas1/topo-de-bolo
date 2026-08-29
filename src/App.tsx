import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
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
  RefreshCw,
  RotateCcw,
  Search,
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

function CutlineFilter({ id = 'cutline' }: { id?: string }) {
  return (
    <filter id={id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
      <feMorphology in="SourceAlpha" operator="dilate" radius="0.75" result="expanded" />
      <feComposite in="expanded" in2="SourceAlpha" operator="out" result="ring" />
      <feFlood floodColor="#9ca3af" floodOpacity="1" result="cutColor" />
      <feComposite in="cutColor" in2="ring" operator="in" result="outline" />
      <feMerge>
        <feMergeNode in="outline" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}

function buildSvg(order: Pick<TopperOrder, 'elements' | 'childName' | 'age' | 'fontFamily'>) {
  const images = order.elements.map((element) => {
    const aspect = element.aspect || 1;
    const height = element.widthMm / aspect;
    return `<image href="${element.src}" x="${element.xMm}" y="${element.yMm}" width="${element.widthMm}" height="${height}" preserveAspectRatio="xMidYMid meet" filter="url(#cutlineExport)" />`;
  }).join('');

  const name = order.childName
    ? `<text x="105" y="256" text-anchor="middle" font-family="${escapeXml(order.fontFamily)}" font-size="15" font-weight="700" fill="#111">${escapeXml(order.childName)}</text>`
    : '';
  const age = order.age
    ? `<text x="105" y="276" text-anchor="middle" font-family="${escapeXml(order.fontFamily)}" font-size="11" font-weight="700" fill="#111">${escapeXml(order.age)} anos</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 210 297">
    <defs>
      <filter id="cutlineExport" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feMorphology in="SourceAlpha" operator="dilate" radius="0.75" result="expanded"/>
        <feComposite in="expanded" in2="SourceAlpha" operator="out" result="ring"/>
        <feFlood flood-color="#9ca3af" flood-opacity="1" result="cutColor"/>
        <feComposite in="cutColor" in2="ring" operator="in" result="outline"/>
        <feMerge><feMergeNode in="outline"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>
    <rect width="210" height="297" fill="white"/>${images}${name}${age}
  </svg>`;
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
      <defs><CutlineFilter /></defs>
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
              filter="url(#cutline)"
              onPointerDown={(event) => {
                if (!interactive) return;
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
              <rect x={element.xMm} y={element.yMm} width={element.widthMm} height={height} fill="none" stroke="#ef4444" strokeWidth="1.1" strokeDasharray="3 2" pointerEvents="none" />
            )}
          </g>
        );
      })}
      {childName && <text x="105" y="256" textAnchor="middle" fontFamily={fontFamily} fontSize="15" fontWeight="700" fill="#111">{childName}</text>}
      {age && <text x="105" y="276" textAnchor="middle" fontFamily={fontFamily} fontSize="11" fontWeight="700" fill="#111">{age} anos</text>}
    </svg>
  );
}

function OrderDetails({ order }: { order: TopperOrder }) {
  return (
    <div className="grid gap-7 lg:grid-cols-[430px_1fr]">
      <A4Canvas elements={order.elements} childName={order.childName} age={order.age} fontFamily={order.fontFamily} />
      <div className="rounded-3xl bg-zinc-50 p-6">
        <p className="text-sm font-black uppercase tracking-wider text-red-600">{order.code}</p>
        <h2 className="mt-2 text-3xl font-black">{order.themeName}</h2>
        <p className="mt-1 text-sm font-bold text-zinc-500">{new Date(order.createdAt).toLocaleString('pt-BR')}</p>
        <div className="mt-5 space-y-3 text-lg">
          <p><strong>Categoria:</strong> {order.categoryName}</p>
          <p><strong>Nome:</strong> {order.childName || 'Sem nome'}</p>
          <p><strong>Idade:</strong> {order.age ? `${order.age} anos` : 'Sem idade'}</p>
          <p><strong>Elementos:</strong> {order.elements.length}</p>
        </div>
        <button onClick={() => downloadOrderPng(order, `${order.code}-${order.themeName}.png`)} className="mt-7 flex min-h-14 items-center gap-2 rounded-2xl bg-emerald-600 px-6 font-black text-white hover:bg-emerald-700">
          <Download size={21} /> Baixar A4 em PNG
        </button>
      </div>
    </div>
  );
}

function AdminPanel() {
  const [categories, setCategories] = useState<Category[]>(() => readLocal(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  const [themes, setThemes] = useState<Theme[]>(() => readLocal(THEMES_KEY, DEFAULT_THEMES));
  const [orders, setOrders] = useState<TopperOrder[]>(() => readLocal(ORDERS_KEY, []));
  const [tab, setTab] = useState<'orders' | 'categories' | 'themes'>('orders');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderCode, setSelectedOrderCode] = useState('');
  const [selectedThemeId, setSelectedThemeId] = useState(themes[0]?.id || '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryImage, setNewCategoryImage] = useState('');
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeDescription, setNewThemeDescription] = useState('');
  const [newThemeCategory, setNewThemeCategory] = useState(categories[0]?.id || '');
  const [newThemeCover, setNewThemeCover] = useState('');

  const refreshOrders = () => setOrders(readLocal<TopperOrder[]>(ORDERS_KEY, []));

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === ORDERS_KEY) refreshOrders();
    };
    window.addEventListener('storage', onStorage);
    const timer = window.setInterval(refreshOrders, 2000);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(timer);
    };
  }, []);

  const saveCategories = (next: Category[]) => {
    setCategories(next);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(next));
  };
  const saveThemes = (next: Theme[]) => {
    setThemes(next);
    localStorage.setItem(THEMES_KEY, JSON.stringify(next));
  };

  const selectedTheme = themes.find((item) => item.id === selectedThemeId);
  const sortedOrders = useMemo(() => [...orders].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)), [orders]);
  const foundOrder = orderSearch.trim()
    ? orders.find((order) => order.code.toLowerCase() === orderSearch.trim().toLowerCase())
    : orders.find((order) => order.code === selectedOrderCode) || sortedOrders[0];

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
    const nextThemes = themes.map((theme) => theme.id === selectedTheme.id ? { ...theme, elements: [...theme.elements, ...created] } : theme);
    saveThemes(nextThemes);
  };

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-800 bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3"><LayoutDashboard /><div><p className="text-xl font-black">Topo Express Admin</p><p className="text-xs text-zinc-400">Catálogo e produção</p></div></div>
          <a href="#/" className="rounded-xl bg-white px-4 py-2 font-bold text-zinc-900">Abrir cliente</a>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-5">
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ['orders', 'Pedidos'], ['categories', 'Categorias'], ['themes', 'Temas'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as 'orders' | 'categories' | 'themes')} className={`rounded-xl px-5 py-3 font-black ${tab === id ? 'bg-red-600 text-white' : 'bg-white text-zinc-700'}`}>{label}</button>
          ))}
        </div>

        {tab === 'orders' && (
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black">Pedidos recentes</h1>
                <p className="mt-2 text-zinc-600">Os novos topos aparecem aqui automaticamente.</p>
              </div>
              <button onClick={refreshOrders} className="flex min-h-12 items-center gap-2 rounded-xl border border-zinc-200 px-4 font-bold"><RefreshCw size={18} /> Atualizar agora</button>
            </div>

            <div className="mt-5 flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={21} />
                <input value={orderSearch} onChange={(e) => setOrderSearch(e.target.value.toUpperCase())} placeholder="Buscar por código, ex.: TB1842" className="min-h-14 w-full rounded-2xl border-2 border-zinc-200 pl-12 pr-5 text-lg font-black uppercase outline-none focus:border-red-500" />
              </div>
            </div>

            {!orderSearch && sortedOrders.length > 0 && (
              <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {sortedOrders.slice(0, 8).map((order) => (
                  <button key={`${order.code}-${order.createdAt}`} onClick={() => { setSelectedOrderCode(order.code); setOrderSearch(''); }} className={`rounded-2xl border-2 p-4 text-left transition ${foundOrder?.code === order.code ? 'border-red-500 bg-red-50' : 'border-zinc-200 hover:border-zinc-400'}`}>
                    <div className="flex items-center justify-between gap-3"><strong className="text-lg">{order.code}</strong><span className="text-xs font-bold text-zinc-400">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                    <p className="mt-2 truncate font-black">{order.themeName}</p>
                    <p className="truncate text-sm text-zinc-500">{order.childName || 'Sem nome'}{order.age ? ` • ${order.age} anos` : ''}</p>
                  </button>
                ))}
              </div>
            )}

            {sortedOrders.length === 0 && <p className="mt-6 rounded-2xl bg-zinc-50 p-6 text-center font-bold text-zinc-500">Nenhum topo foi gerado ainda.</p>}
            {orderSearch && !foundOrder && <p className="mt-6 rounded-2xl bg-amber-50 p-4 font-bold text-amber-900">Pedido não encontrado.</p>}
            {foundOrder && <div className="mt-8 border-t border-zinc-200 pt-8"><OrderDetails order={foundOrder} /></div>}
          </section>
        )}

        {tab === 'categories' && (
          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wider text-red-600">Organização do catálogo</p>
              <div className="mt-2 flex items-center gap-2"><FolderPlus /><h2 className="text-2xl font-black">Nova categoria</h2></div>
              <p className="mt-2 text-sm text-zinc-500">Categoria é um grupo de temas. Ex.: Infantil, Feminino, Futebol.</p>
              <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Ex.: Infantil" className="mt-5 min-h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 font-bold outline-none focus:border-red-500" />
              <label className="mt-4 flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 font-bold"><ImagePlus /> Imagem da categoria<input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverFile(e.target.files?.[0], 'category')} /></label>
              {newCategoryImage && <img src={newCategoryImage} className="mt-3 h-28 w-full rounded-2xl object-cover" />}
              <button onClick={() => {
                if (!newCategoryName.trim()) return;
                saveCategories([...categories, { id: uid('cat'), name: newCategoryName.trim(), image: newCategoryImage || undefined }]);
                setNewCategoryName(''); setNewCategoryImage('');
              }} className="mt-4 min-h-14 w-full rounded-2xl bg-red-600 font-black text-white">Criar categoria</button>
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black">Categorias cadastradas</h2>
              <p className="mt-1 text-zinc-500">Aqui aparecem só os grupos. Os temas são cadastrados na aba Temas.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => {
                  const themeCount = themes.filter((theme) => theme.categoryId === category.id).length;
                  return (
                    <div key={category.id} className="overflow-hidden rounded-2xl border border-zinc-200">
                      {category.image ? <img src={category.image} className="h-32 w-full object-cover" /> : <div className="flex h-32 items-center justify-center bg-zinc-100 text-4xl">📁</div>}
                      <div className="p-4">
                        <div className="flex items-center justify-between gap-3"><strong>{category.name}</strong><button onClick={() => { if (themeCount === 0) saveCategories(categories.filter((item) => item.id !== category.id)); }} className={`text-zinc-400 ${themeCount === 0 ? 'hover:text-red-600' : 'cursor-not-allowed opacity-30'}`} title={themeCount ? 'Remova ou mova os temas desta categoria primeiro' : 'Excluir categoria'}><Trash2 size={19} /></button></div>
                        <p className="mt-1 text-sm font-semibold text-zinc-500">{themeCount} {themeCount === 1 ? 'tema' : 'temas'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {tab === 'themes' && (
          <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
            <div className="space-y-6">
              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <p className="text-xs font-black uppercase tracking-wider text-red-600">Conteúdo da categoria</p>
                <div className="mt-2 flex items-center gap-2"><Plus /><h2 className="text-2xl font-black">Novo tema</h2></div>
                <p className="mt-2 text-sm text-zinc-500">Tema é o produto que o cliente escolhe. Ex.: Bluey dentro da categoria Infantil.</p>
                <input value={newThemeName} onChange={(e) => setNewThemeName(e.target.value)} placeholder="Ex.: Bluey" className="mt-5 min-h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 font-bold outline-none focus:border-red-500" />
                <select value={newThemeCategory} onChange={(e) => setNewThemeCategory(e.target.value)} className="mt-3 min-h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 font-bold">
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <textarea value={newThemeDescription} onChange={(e) => setNewThemeDescription(e.target.value)} placeholder="Descrição curta" className="mt-3 min-h-24 w-full rounded-2xl border-2 border-zinc-200 p-4 font-semibold outline-none focus:border-red-500" />
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
                <div className="max-h-[480px] space-y-2 overflow-auto">
                  {themes.map((theme) => {
                    const category = categories.find((item) => item.id === theme.categoryId);
                    return (
                      <button key={theme.id} onClick={() => setSelectedThemeId(theme.id)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left ${selectedThemeId === theme.id ? 'bg-red-50 ring-2 ring-red-500' : 'bg-zinc-50'}`}>
                        {theme.coverImage ? <img src={theme.coverImage} className="h-12 w-12 rounded-xl object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl">{theme.emoji || '🎂'}</div>}
                        <div className="min-w-0 flex-1"><p className="truncate font-black">{theme.name}</p><p className="text-sm text-zinc-500">{category?.name || 'Sem categoria'} • {theme.elements.length} PNGs</p></div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              {selectedTheme ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-wider text-red-600">Tema</p>
                      <h2 className="mt-1 text-3xl font-black">{selectedTheme.name}</h2>
                      <p className="mt-1 font-semibold text-zinc-500">Categoria: {categories.find((c) => c.id === selectedTheme.categoryId)?.name || 'Sem categoria'}</p>
                    </div>
                    <button onClick={() => { saveThemes(themes.filter((item) => item.id !== selectedTheme.id)); setSelectedThemeId(''); }} className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 font-bold text-red-600"><Trash2 size={18} /> Excluir tema</button>
                  </div>

                  <label className="mt-6 flex min-h-20 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-lg font-black hover:border-red-400">
                    <Upload /> Adicionar PNGs transparentes
                    <input type="file" accept="image/png" multiple className="hidden" onChange={(e) => addElements(e.target.files)} />
                  </label>
                  <p className="mt-2 text-sm font-semibold text-zinc-500">Cada PNG vira um elemento separado e recebe automaticamente um contorno cinza fino de corte.</p>

                  <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {selectedTheme.elements.map((element) => (
                      <div key={element.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
                        <div className="flex aspect-square items-center justify-center rounded-xl bg-white p-3"><img src={element.src} className="max-h-full max-w-full object-contain" /></div>
                        <div className="mt-3 flex items-center justify-between gap-2"><strong className="truncate">{element.name}</strong><button onClick={() => saveThemes(themes.map((theme) => theme.id === selectedTheme.id ? { ...theme, elements: theme.elements.filter((item) => item.id !== element.id) } : theme))} className="text-zinc-400 hover:text-red-600"><Trash2 size={18} /></button></div>
                        <p className="mt-1 text-xs font-bold text-zinc-500">Largura inicial: {(element.widthMm / 10).toFixed(1)} cm</p>
                      </div>
                    ))}
                  </div>
                  {selectedTheme.elements.length === 0 && <p className="mt-8 rounded-2xl bg-zinc-50 p-8 text-center font-bold text-zinc-500">Nenhum PNG cadastrado neste tema ainda.</p>}
                </>
              ) : <p className="py-20 text-center font-bold text-zinc-500">Selecione um tema ao lado.</p>}
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('');
  const [fontFamily, setFontFamily] = useState(FONT_OPTIONS[0].family);
  const [elements, setElements] = useState<TopperElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState('');
  const [order, setOrder] = useState<TopperOrder | null>(null);

  const filteredThemes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return themes.filter((theme) => {
      const categoryOk = categoryFilter === 'all' || theme.categoryId === categoryFilter;
      const searchOk = !term || theme.name.toLowerCase().includes(term) || theme.description?.toLowerCase().includes(term);
      return categoryOk && searchOk;
    });
  }, [themes, search, categoryFilter]);

  const selectedElement = elements.find((item) => item.id === selectedElementId);

  const selectTheme = (theme: Theme) => {
    setSelectedTheme(theme);
    setElements(theme.elements.map((item) => ({ ...item })));
    setSelectedElementId(theme.elements[0]?.id || '');
  };

  const next = () => {
    if (step === 0 && !selectedTheme) return;
    setStep((value) => Math.min(3, value + 1));
  };
  const previous = () => setStep((value) => Math.max(0, value - 1));

  const updateElement = (id: string, patch: Partial<TopperElement>) => {
    setElements((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const finish = () => {
    if (!selectedTheme) return;
    const category = categories.find((item) => item.id === selectedTheme.categoryId);
    const created: TopperOrder = {
      code: makeCode(),
      createdAt: new Date().toISOString(),
      themeId: selectedTheme.id,
      themeName: selectedTheme.name,
      categoryName: category?.name || 'Sem categoria',
      childName: childName.trim(),
      age,
      fontFamily,
      elements,
    };
    const oldOrders = readLocal<TopperOrder[]>(ORDERS_KEY, []);
    localStorage.setItem(ORDERS_KEY, JSON.stringify([created, ...oldOrders]));
    setOrder(created);
  };

  const restart = () => {
    setStep(0); setSearch(''); setCategoryFilter('all'); setSelectedTheme(null); setChildName(''); setAge(''); setFontFamily(FONT_OPTIONS[0].family); setElements([]); setSelectedElementId(''); setOrder(null);
  };

  if (order) {
    return (
      <div className="min-h-screen bg-zinc-100 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[32px] bg-white p-8 text-center shadow-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={46} /></div>
          <p className="mt-5 text-sm font-black uppercase tracking-wider text-emerald-700">Pedido criado</p>
          <h1 className="mt-2 text-4xl font-black">Seu topo foi aprovado!</h1>
          <p className="mt-3 text-lg text-zinc-600">Mostre este código no balcão.</p>
          <div className="mx-auto my-8 max-w-md rounded-3xl bg-zinc-950 px-6 py-8 text-white"><p className="text-sm font-bold uppercase tracking-[.2em] text-zinc-400">Código</p><p className="mt-2 text-6xl font-black">{order.code}</p></div>
          <button onClick={restart} className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-zinc-900 px-8 text-lg font-black text-white"><RotateCcw size={20} /> Fazer outro topo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white"><CakeSlice size={26} /></div><div><p className="text-xl font-black">Topo Express</p><p className="text-sm font-medium text-zinc-500">Escolha, personalize e aprove</p></div></div>
          <a href="#/admin" className="text-sm font-bold text-zinc-400 hover:text-zinc-900">Admin</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-7 rounded-2xl border border-zinc-200 bg-white p-4 md:p-5">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((label, index) => (
              <div key={label}><div className={`h-2 rounded-full ${index <= step ? 'bg-red-600' : 'bg-zinc-200'}`} /><div className="mt-2 flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${index <= step ? 'bg-zinc-900 text-white' : 'bg-zinc-200'}`}>{index < step ? <Check size={15} /> : index + 1}</span><span className="truncate text-xs font-bold md:text-sm">{label}</span></div></div>
            ))}
          </div>
        </div>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          {step === 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-red-600"><Sparkles size={17} /> Passo 1 de 4</p>
              <h1 className="text-3xl font-black md:text-4xl">Qual é o tema da festa?</h1>
              <p className="mt-2 text-lg text-zinc-600">Escolha uma categoria ou pesquise diretamente pelo tema.</p>

              <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                <button onClick={() => setCategoryFilter('all')} className={`min-w-fit rounded-2xl border-2 px-5 py-3 font-black ${categoryFilter === 'all' ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200 bg-white'}`}>Todos</button>
                {categories.map((category) => (
                  <button key={category.id} onClick={() => setCategoryFilter(category.id)} className={`flex min-w-fit items-center gap-2 rounded-2xl border-2 px-4 py-3 font-black ${categoryFilter === category.id ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200 bg-white'}`}>
                    {category.image && <img src={category.image} className="h-8 w-8 rounded-lg object-cover" />} {category.name}
                  </button>
                ))}
              </div>

              <label className="my-5 flex min-h-16 items-center gap-3 rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 focus-within:border-red-500"><Search size={24} className="text-zinc-500" /><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-xl font-semibold outline-none" placeholder="Buscar tema..." /></label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {filteredThemes.map((theme) => {
                  const selected = selectedTheme?.id === theme.id;
                  return (
                    <button key={theme.id} onClick={() => selectTheme(theme)} className={`relative min-h-40 overflow-hidden rounded-3xl border-2 text-left ${selected ? 'border-red-600 shadow-lg shadow-red-100' : 'border-zinc-200'}`}>
                      {theme.coverImage ? <img src={theme.coverImage} className="absolute inset-0 h-full w-full object-cover opacity-35" /> : <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-amber-50" />}
                      <div className="relative flex h-full flex-col justify-between p-5"><span className="text-5xl">{theme.emoji || '🎂'}</span><div><p className="text-xl font-black">{theme.name}</p><p className="mt-1 text-sm font-semibold text-zinc-700">{theme.description || `${theme.elements.length} elementos`}</p></div></div>
                      {selected && <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white"><Check size={20} /></span>}
                    </button>
                  );
                })}
              </div>
              {filteredThemes.length === 0 && <p className="rounded-2xl bg-zinc-50 p-8 text-center font-bold text-zinc-500">Nenhum tema encontrado nessa categoria.</p>}
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-4xl">
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 2 de 4</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Agora, só duas informações</h1>
              <p className="mt-2 text-lg text-zinc-600">Digite exatamente como deseja ver no topo.</p>

              <div className="mt-8">
                <label className="mb-2 block text-xl font-extrabold">Nome do aniversariante</label>
                <input value={childName} onChange={(e) => setChildName(e.target.value.slice(0, 24))} placeholder="Ex.: Maria Clara" className="min-h-16 w-full rounded-2xl border-2 border-zinc-200 px-5 text-xl font-bold outline-none focus:border-red-500" />
                <p className="mt-2 text-sm font-semibold text-zinc-500">Máximo de 24 caracteres. Se deixar vazio, o topo ficará sem nome.</p>
              </div>

              <div className="mt-7">
                <p className="mb-3 text-xl font-extrabold">Idade</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => <button key={value} onClick={() => setAge(value)} className={`h-16 w-16 rounded-2xl border-2 font-black ${age === value ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200 bg-white'}`}>{value}</button>)}
                  <button onClick={() => setAge('')} className={`min-h-16 rounded-2xl border-2 px-5 font-black ${age === '' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white'}`}>Sem idade</button>
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 text-xl font-extrabold">Escolha a fonte</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {FONT_OPTIONS.map((font) => (
                    <button key={font.id} onClick={() => setFontFamily(font.family)} className={`rounded-2xl border-2 p-4 text-left ${fontFamily === font.family ? 'border-red-600 bg-red-50' : 'border-zinc-200'}`}>
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-400">{font.kind}</span>
                      <span className="mt-2 block text-3xl" style={{ fontFamily: font.family }}>{childName || 'Maria Clara'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && selectedTheme && (
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 3 de 4</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Ajuste seu topo no A4</h1>
              <p className="mt-2 text-lg text-zinc-600">Arraste os elementos. O contorno cinza representa a linha de corte.</p>
              <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,520px)_1fr]">
                <A4Canvas elements={elements} childName={childName} age={age} fontFamily={fontFamily} selectedId={selectedElementId} setSelectedId={setSelectedElementId} onMove={(id, xMm, yMm) => updateElement(id, { xMm, yMm })} interactive />
                <div className="rounded-3xl bg-zinc-50 p-6">
                  <h2 className="text-2xl font-black">Elemento selecionado</h2>
                  {selectedElement ? (
                    <div className="mt-5 space-y-5">
                      <p className="text-xl font-black">{selectedElement.name}</p>
                      <div><div className="flex justify-between font-bold"><span>Largura</span><span>{(selectedElement.widthMm / 10).toFixed(1)} cm</span></div><input type="range" min="20" max="120" step="1" value={selectedElement.widthMm} onChange={(e) => updateElement(selectedElement.id, { widthMm: Number(e.target.value) })} className="mt-2 w-full" /></div>
                      <div className="grid grid-cols-2 gap-3"><button onClick={() => updateElement(selectedElement.id, { widthMm: Math.max(20, selectedElement.widthMm - 5) })} className="min-h-14 rounded-2xl border-2 border-zinc-200 bg-white font-black">− Menor</button><button onClick={() => updateElement(selectedElement.id, { widthMm: Math.min(120, selectedElement.widthMm + 5) })} className="min-h-14 rounded-2xl bg-zinc-900 font-black text-white">+ Maior</button></div>
                      <div className="grid grid-cols-2 gap-3 text-sm font-bold"><div className="rounded-xl bg-white p-3">X: {(selectedElement.xMm / 10).toFixed(1)} cm</div><div className="rounded-xl bg-white p-3">Y: {(selectedElement.yMm / 10).toFixed(1)} cm</div></div>
                    </div>
                  ) : <p className="mt-5 text-zinc-500">Clique em um PNG na folha.</p>}
                  <div className="mt-7 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-600"><strong>A4 real:</strong> 21 × 29,7 cm. As medidas exibidas são as medidas de impressão.</div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && selectedTheme && (
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 4 de 4</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Confira o A4 final</h1>
              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,520px)_1fr]">
                <A4Canvas elements={elements} childName={childName} age={age} fontFamily={fontFamily} />
                <div className="rounded-3xl bg-zinc-50 p-6"><h2 className="text-2xl font-black">Resumo</h2><div className="mt-5 space-y-3 text-lg"><p><strong>Tema:</strong> {selectedTheme.name}</p><p><strong>Nome:</strong> {childName || 'Sem nome'}</p><p><strong>Idade:</strong> {age ? `${age} anos` : 'Sem idade'}</p><p><strong>Elementos:</strong> {elements.length}</p></div><p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-900">Ao aprovar, esse A4 fica salvo no pedido e aparece automaticamente no painel da produção.</p></div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:justify-between">
            <button onClick={previous} disabled={step === 0} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-zinc-200 px-6 text-lg font-extrabold disabled:opacity-0"><ArrowLeft size={21} /> Voltar</button>
            {step < 3 ? <button onClick={next} disabled={step === 0 && !selectedTheme} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-8 text-lg font-extrabold text-white disabled:bg-zinc-300">Continuar <ArrowRight size={21} /></button> : <button onClick={finish} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 text-lg font-extrabold text-white"><CheckCircle2 size={22} /> Aprovar meu topo</button>}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [hash, setHash] = useState(window.location.hash || '#/');
  useEffect(() => {
    const onHash = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return hash.startsWith('#/admin') ? <AdminPanel /> : <ClientApp />;
}
