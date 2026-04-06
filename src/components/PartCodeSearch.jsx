// src/components/PartCodeSearch.jsx
import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, X, ChevronDown, ChevronUp, ExternalLink,
  Package, Truck, Layers, AlertCircle, Loader2,
  Tag, Wrench, CheckCircle, Info, Filter, BookOpen
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function normalize(str) {
  return (str || '').toUpperCase().replace(/[\s\-_]+/g, '');
}

function getBrandColor(brand) {
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', dot: 'bg-blue-500' },
    { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-500' },
    { bg: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-300', dot: 'bg-violet-500' },
    { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-500' },
    { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', dot: 'bg-rose-500' },
    { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-300', dot: 'bg-cyan-500' },
    { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', dot: 'bg-amber-500' },
    { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300', dot: 'bg-teal-500' },
  ];
  if (!brand) return colors[0];
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Spec labels đẹp hơn cho các key phổ biến
const SPEC_LABELS = {
  'Weight, kg': { label: 'Khối lượng', unit: 'kg', icon: '⚖️' },
  'Track width': { label: 'Chiều rộng xích', unit: 'mm', icon: '📏' },
  'Track pitch': { label: 'Bước xích', unit: 'mm', icon: '🔗' },
  'Inner chain width (A)': { label: 'Chiều rộng trong (A)', unit: 'mm', icon: '↔️' },
  'Outer chain width (B)': { label: 'Chiều rộng ngoài (B)', unit: 'mm', icon: '↔️' },
  'Inner chain guide (C1)': { label: 'Gờ dẫn hướng (C1)', unit: 'mm', icon: '📐' },
  'Rubber thickness (E)': { label: 'Chiều dày cao su (E)', unit: 'mm', icon: '📐' },
  'Guide type': { label: 'Kiểu gờ', unit: '', icon: '🔧' },
  'Part shape': { label: 'Hình dạng', unit: '', icon: '🔷' },
  'Flange outer diameter (ØA)': { label: 'Đường kính mặt bích (ØA)', unit: 'mm', icon: '⭕' },
  'Tread diameter (ØB)': { label: 'Đường kính tang (ØB)', unit: 'mm', icon: '⭕' },
  'Track chain guide (C)': { label: 'Rãnh dẫn xích (C)', unit: 'mm', icon: '📐' },
  'Roller body width (D)': { label: 'Chiều rộng thân lăn (D)', unit: 'mm', icon: '📏' },
  'Overall roller width (F)': { label: 'Chiều rộng tổng (F)', unit: 'mm', icon: '📏' },
  'Overall flange width (G)': { label: 'Rộng mặt bích tổng (G)', unit: 'mm', icon: '📏' },
  'Shaft diameter (ØH)': { label: 'Đường kính trục (ØH)', unit: 'mm', icon: '⭕' },
  'Bolt hole diameter (ØL)': { label: 'Đường kính lỗ bu lông (ØL)', unit: 'mm', icon: '⭕' },
  'Bolt hole pattern (E)': { label: 'Khoảng cách lỗ bu lông (E)', unit: 'mm', icon: '📐' },
  'Bolt hole pattern (M)': { label: 'Khoảng cách lỗ bu lông (M)', unit: 'mm', icon: '📐' },
  'Flange offset (T)': { label: 'Độ lệch mặt bích (T)', unit: 'mm', icon: '📐' },
  'Flange thickness (N)': { label: 'Dày mặt bích (N)', unit: 'mm', icon: '📐' },
  'Track shoe width (W)': { label: 'Chiều rộng guốc (W)', unit: 'mm', icon: '📏' },
  'Grouser height (X)': { label: 'Chiều cao gai (X)', unit: 'mm', icon: '📐' },
  'Link pitch (A)': { label: 'Bước mắt xích (A)', unit: 'mm', icon: '🔗' },
  'Overall link width (O)': { label: 'Rộng mắt xích tổng (O)', unit: 'mm', icon: '📏' },
  'Link height (M)': { label: 'Cao mắt xích (M)', unit: 'mm', icon: '📐' },
};

function getSpecInfo(key) {
  return SPEC_LABELS[key] || { label: key, unit: '', icon: '🔩' };
}

// ─── Score & Search Logic ────────────────────────────────────────────────────

function scoreProduct(query, product, mode) {
  const q = query.trim().toUpperCase();
  if (!q) return 0;

  const pc = (product.pc || '').toUpperCase();
  const name = (product.name || '').toUpperCase();
  const brand = (product.brand || '').toUpperCase();

  if (mode === 'partcode') {
    // Tìm theo partcode
    if (pc === q) return 1000;
    if (pc.startsWith(q)) return 800;
    if (pc.includes(q)) return 600;
    // Check aliases in alt
    for (const a of product.alt || []) {
      const altCode = (a.cd || '').toUpperCase();
      if (altCode === q) return 700;
      if (altCode.includes(q)) return 400;
    }
    // Fuzzy: normalize (strip separators)
    const qNorm = normalize(q);
    const pcNorm = normalize(pc);
    if (pcNorm === qNorm) return 900;
    if (pcNorm.startsWith(qNorm)) return 700;
    if (pcNorm.includes(qNorm)) return 500;
    return 0;
  } else {
    // Tìm theo máy (brand/model)
    let score = 0;
    const qNorm = normalize(q);

    // Kiểm tra trong applicability
    for (const a of product.apply || []) {
      const mo = (a.mo || '').toUpperCase();
      const br = (a.br || '').toUpperCase();
      const moNorm = normalize(mo);
      const brNorm = normalize(br);

      if (mo === q || br === q) score = Math.max(score, 900);
      else if (mo.startsWith(q) || br.startsWith(q)) score = Math.max(score, 700);
      else if (mo.includes(q) || br.includes(q)) score = Math.max(score, 500);
      else if (moNorm.includes(qNorm) || brNorm.includes(qNorm)) score = Math.max(score, 400);
    }

    // Kiểm tra trong vtrack
    for (const v of product.vtrack || []) {
      const mo = (v.mo || '').toUpperCase();
      const sb = (v.sb || '').toUpperCase();
      if (mo === q || sb === q) score = Math.max(score, 850);
      else if (mo.startsWith(q) || sb.startsWith(q)) score = Math.max(score, 650);
      else if (mo.includes(q) || sb.includes(q)) score = Math.max(score, 450);
    }

    return score;
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SpecsGrid({ specs }) {
  const entries = Object.entries(specs).filter(([, v]) => v && v !== '-');
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {entries.map(([key, value]) => {
        const info = getSpecInfo(key);
        return (
          <div key={key} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-base mt-0.5 flex-shrink-0">{info.icon}</span>
            <div className="min-w-0">
              <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide leading-tight mb-0.5">
                {info.label}
              </div>
              <div className="text-sm font-bold text-slate-900">
                {value}{info.unit ? <span className="text-xs font-normal text-slate-500 ml-1">{info.unit}</span> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicabilityTable({ apply, vtrack }) {
  const [filterBrand, setFilterBrand] = useState('');
  const [showAll, setShowAll] = useState(false);
  const LIMIT = 12;

  // Gộp applicability từ trackunit + vtrack
  const allItems = useMemo(() => {
    const seen = new Set();
    const items = [];

    // Từ trackunit applicability
    for (const a of apply || []) {
      const key = `${a.br}|${a.mo}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({ type: a.tp || 'Excavators', brand: a.br, model: a.mo, mod: a.md, src: 'trackunit' });
      }
    }

    // Từ vtrack sources
    for (const v of vtrack || []) {
      const key = `${v.sb}|${v.mo}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push({
          type: v.st?.replace(/_/g, ' ') || 'Excavators',
          brand: v.sb,
          model: v.mo,
          mod: v.vr || '-',
          src: 'vtrack',
          group: v.gr,
          qty: v.qt,
        });
      }
    }

    return items;
  }, [apply, vtrack]);

  const brands = useMemo(() => {
    return [...new Set(allItems.map(i => i.brand).filter(Boolean))].sort();
  }, [allItems]);

  const filtered = filterBrand
    ? allItems.filter(i => i.brand === filterBrand)
    : allItems;

  const displayed = showAll ? filtered : filtered.slice(0, LIMIT);

  if (allItems.length === 0) return (
    <div className="text-slate-400 text-sm italic text-center py-4">Không có dữ liệu tương thích</div>
  );

  return (
    <div>
      {/* Filter by brand */}
      {brands.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setFilterBrand('')}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
              !filterBrand ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
            }`}
          >
            Tất cả ({allItems.length})
          </button>
          {brands.map(br => {
            const c = getBrandColor(br);
            const count = allItems.filter(i => i.brand === br).length;
            return (
              <button
                key={br}
                onClick={() => setFilterBrand(filterBrand === br ? '' : br)}
                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                  filterBrand === br
                    ? `${c.bg} ${c.text} ${c.border}`
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                }`}
              >
                {br} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-left">
              <th className="px-3 py-2 text-xs font-bold text-slate-600 uppercase tracking-wide">Loại máy</th>
              <th className="px-3 py-2 text-xs font-bold text-slate-600 uppercase tracking-wide">Hãng</th>
              <th className="px-3 py-2 text-xs font-bold text-slate-600 uppercase tracking-wide">Model</th>
              <th className="px-3 py-2 text-xs font-bold text-slate-600 uppercase tracking-wide">Version / Seri</th>
              <th className="px-3 py-2 text-xs font-bold text-slate-600 uppercase tracking-wide">SL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {displayed.map((item, idx) => {
              const c = getBrandColor(item.brand);
              return (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-2 text-xs text-slate-500 capitalize">
                    {item.type?.toLowerCase()}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${c.bg} ${c.text}`}>
                      {item.brand}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-slate-900 text-xs">
                    {item.model}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {item.mod !== '-' ? item.mod : (item.group || '-')}
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold text-slate-700">
                    {item.qty || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length > LIMIT && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 w-full py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1"
        >
          {showAll ? <><ChevronUp className="w-4 h-4" /> Ẩn bớt</> : <><ChevronDown className="w-4 h-4" /> Xem thêm {filtered.length - LIMIT} dòng</>}
        </button>
      )}
    </div>
  );
}

function AnaloguesList({ alt }) {
  if (!alt || alt.length === 0) return (
    <div className="text-slate-400 text-sm italic text-center py-4">Không có hàng tương đương</div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {alt.map((a, idx) => {
        const c = getBrandColor(a.br);
        return (
          <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>{a.br}</span>
                <span className="font-mono text-sm font-bold text-slate-900">{a.cd}</span>
              </div>
              {a.nm && (
                <div className="text-xs text-slate-500 mt-0.5 truncate">{a.nm}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VTrackSources({ vtrack }) {
  if (!vtrack || vtrack.length === 0) return null;

  // Group by source brand
  const grouped = vtrack.reduce((acc, v) => {
    const key = `${v.sb}|${v.st}`;
    if (!acc[key]) acc[key] = { brand: v.sb, type: v.st, items: [] };
    acc[key].items.push(v);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      {Object.values(grouped).map((group, gi) => {
        const c = getBrandColor(group.brand);
        return (
          <div key={gi} className="rounded-lg border border-slate-200 overflow-hidden">
            <div className={`flex items-center gap-2 px-3 py-2 ${c.bg} border-b border-slate-200`}>
              <span className={`w-2 h-2 rounded-full ${c.dot}`} />
              <span className={`text-xs font-bold ${c.text}`}>{group.brand}</span>
              <span className="text-xs text-slate-500">— {group.type?.replace(/_/g, ' ').toLowerCase()}</span>
              <span className={`ml-auto text-xs font-semibold ${c.text}`}>{group.items.length} model</span>
            </div>
            <div className="divide-y divide-slate-100">
              {group.items.map((v, vi) => (
                <div key={vi} className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-slate-50">
                  <span className="font-mono text-sm font-bold text-slate-800 min-w-[70px]">{v.mo}</span>
                  {v.vr && <span className="hidden sm:inline text-xs text-slate-400 flex-shrink-0">{v.vr}</span>}
                  <span className="text-xs text-slate-500 truncate flex-1">{v.pn}</span>
                  {v.gr && <span className="hidden sm:inline text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded flex-shrink-0">{v.gr}</span>}
                  {v.qt && <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full flex-shrink-0">×{v.qt}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Product Detail Panel ────────────────────────────────────────────────────

function ProductDetail({ product, onClose }) {
  const [activeTab, setActiveTab] = useState('specs');
  const brandColor = getBrandColor(product.brand);
  const hasSpecs = Object.keys(product.specs || {}).length > 0;
  const hasApply = (product.apply?.length || 0) + (product.vtrack?.length || 0) > 0;
  const hasAlt = product.alt?.length > 0;
  const hasVtrack = product.vtrack?.length > 0;

  const tabs = [
    { id: 'specs', label: 'Thông số', icon: <Wrench className="w-3.5 h-3.5" />, show: hasSpecs },
    { id: 'apply', label: `Tương thích (${(product.apply?.length || 0) + (product.vtrack?.length || 0)})`, icon: <Truck className="w-3.5 h-3.5" />, show: hasApply },
    { id: 'alt', label: `Tương đương (${product.alt?.length || 0})`, icon: <Layers className="w-3.5 h-3.5" />, show: hasAlt },
    { id: 'catalog', label: 'Catalogue VTrack', icon: <BookOpen className="w-3.5 h-3.5" />, show: hasVtrack },
  ].filter(t => t.show);

  // Auto-select first available tab
  useEffect(() => {
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [product.pc]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Product Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-700 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 mb-2">
              <Package className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400 text-xs">Part Code</span>
            </div>

            {/* Part Code */}
            <h2 className="font-mono text-2xl font-black text-white tracking-tight mb-1">
              {product.pc}
            </h2>

            {/* Product Name */}
            {product.name && (
              <p className="text-slate-300 text-sm font-medium mb-3">{product.name}</p>
            )}

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {product.brand && (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${brandColor.bg} ${brandColor.text} ${brandColor.border}`}>
                  <CheckCircle className="w-3 h-3" />
                  {product.brand}
                </span>
              )}
              {product.specs?.['Weight, kg'] && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-700 text-slate-200 rounded-full text-xs font-semibold">
                  ⚖️ {product.specs['Weight, kg']} kg
                </span>
              )}
              {product.specs?.['Track width'] && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-700 text-slate-200 rounded-full text-xs font-semibold">
                  📏 {product.specs['Track width']}mm
                </span>
              )}
              {product.specs?.['Track pitch'] && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-700 text-slate-200 rounded-full text-xs font-semibold">
                  🔗 Pitch {product.specs['Track pitch']}mm
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-xs font-semibold transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Track-Unit
              </a>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50 overflow-x-auto">
          <div className="flex gap-1 px-4 min-w-max">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-xs font-bold border-b-2 transition-all -mb-px whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-md'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="p-4 sm:p-5">
        {activeTab === 'specs' && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-slate-500" />
              Thông số kỹ thuật
            </h3>
            {hasSpecs ? (
              <SpecsGrid specs={product.specs} />
            ) : (
              <div className="text-slate-400 text-sm italic text-center py-8">
                Chưa có thông số kỹ thuật
              </div>
            )}
          </div>
        )}

        {activeTab === 'apply' && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-500" />
              Máy tương thích
            </h3>
            <ApplicabilityTable apply={product.apply} vtrack={product.vtrack} />
          </div>
        )}

        {activeTab === 'alt' && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-500" />
              Hàng tương đương / thay thế
            </h3>
            <AnaloguesList alt={product.alt} />
          </div>
        )}

        {activeTab === 'catalog' && (
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-500" />
              Xuất hiện trong Catalogue VTrack
            </h3>
            <VTrackSources vtrack={product.vtrack} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Search Result Item ──────────────────────────────────────────────────────

function ResultItem({ product, onClick, isSelected }) {
  const c = getBrandColor(product.brand);
  const applyCount = (product.apply?.length || 0) + (product.vtrack?.length || 0);

  return (
    <button
      onClick={() => onClick(product)}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'bg-indigo-50 border-indigo-300 shadow-sm'
          : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-1.5 h-full min-h-[40px] rounded-full flex-shrink-0 ${c.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono font-black text-sm text-slate-900">{product.pc}</span>
            {product.brand && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
                {product.brand}
              </span>
            )}
          </div>
          {product.name && (
            <div className="text-xs text-slate-500 truncate">{product.name}</div>
          )}
          <div className="flex items-center gap-2 mt-1">
            {product.specs?.['Track width'] && (
              <span className="text-[10px] text-slate-400">📏 {product.specs['Track width']}mm</span>
            )}
            {applyCount > 0 && (
              <span className="text-[10px] text-indigo-500 font-semibold">
                Fits {applyCount} model{applyCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {isSelected && (
          <div className="flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-indigo-500" />
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PartCodeSearch() {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchMode, setSearchMode] = useState('partcode'); // 'partcode' | 'machine'
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const inputRef = useRef(null);

  // Load data từ static JSON
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch('/data/partcode_db.json');
        if (!res.ok) throw new Error(`HTTP ${res.status}: Không tải được dữ liệu`);
        const data = await res.json();
        setAllProducts(data.products || []);
        console.log(`✅ Loaded ${data.products?.length} part codes`);
      } catch (err) {
        console.error('❌ Lỗi tải partcode_db.json:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Search results
  const results = useMemo(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) return [];
    const scored = allProducts
      .map(p => ({ product: p, score: scoreProduct(debouncedQuery, p, searchMode) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    return scored.map(({ product }) => product);
  }, [debouncedQuery, allProducts, searchMode]);

  const handleSelect = (product) => {
    setSelectedProduct(product);
    // On mobile: scroll to detail panel
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        document.getElementById('partcode-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedProduct(null);
    inputRef.current?.focus();
  };

  // Stats
  const totalProducts = allProducts.length;
  const totalWithSpecs = allProducts.filter(p => Object.keys(p.specs || {}).length > 0).length;
  const totalWithApply = allProducts.filter(p => (p.apply?.length || 0) + (p.vtrack?.length || 0) > 0).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-600 font-semibold">Đang tải cơ sở dữ liệu part code...</p>
        <p className="text-slate-400 text-sm mt-1">Lần đầu có thể mất vài giây</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
        <p className="text-slate-700 font-bold mb-1">Không tải được dữ liệu</p>
        <p className="text-slate-500 text-sm font-mono bg-red-50 px-3 py-1 rounded">{error}</p>
        <p className="text-slate-400 text-xs mt-3 text-center max-w-sm">
          Hãy chạy script <code className="bg-slate-100 px-1 rounded">generate_partcode_db.py</code> để tạo file dữ liệu
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 text-center">
          <div className="text-xl sm:text-2xl font-black text-slate-900">{totalProducts.toLocaleString()}</div>
          <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium leading-tight">Part Codes</div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 text-center">
          <div className="text-xl sm:text-2xl font-black text-indigo-600">{totalWithSpecs.toLocaleString()}</div>
          <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium leading-tight">Có thông số</div>
        </div>
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-slate-200 text-center">
          <div className="text-xl sm:text-2xl font-black text-emerald-600">{totalWithApply.toLocaleString()}</div>
          <div className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium leading-tight">Có tương thích</div>
        </div>
      </div>

      {/* Search Box */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-4 sm:mb-6">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:block">Tìm theo:</span>
          <div className="inline-flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
              onClick={() => { setSearchMode('partcode'); setSearchQuery(''); setSelectedProduct(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                searchMode === 'partcode'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Part Code
            </button>
            <button
              onClick={() => { setSearchMode('machine'); setSearchQuery(''); setSelectedProduct(null); }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wide transition-all ${
                searchMode === 'machine'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Dòng máy
            </button>
          </div>
          <span className="text-xs text-slate-400 ml-auto hidden sm:block">
            {searchMode === 'partcode'
              ? 'VD: V230X48X66, VA140400, ...'
              : 'VD: HITACHI, R15-7, PC200, CATERPILLAR, ...'}
          </span>
        </div>

        {/* Input */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={
              searchMode === 'partcode'
                ? 'Nhập mã part code để tra cứu...'
                : 'Nhập tên hãng hoặc model máy...'
            }
            className={`w-full pl-12 pr-10 py-3.5 text-sm border-2 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent transition-all bg-white text-slate-900 placeholder:text-slate-400 font-mono ${
              searchMode === 'partcode'
                ? 'border-indigo-300 focus:ring-indigo-400'
                : 'border-emerald-300 focus:ring-emerald-400'
            }`}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Result count */}
        {debouncedQuery.trim().length >= 2 && (
          <div className="mt-2 text-xs text-slate-500">
            {results.length === 0
              ? 'Không tìm thấy kết quả phù hợp'
              : `Tìm thấy ${results.length} kết quả${results.length === 50 ? ' (hiển thị 50 đầu)' : ''}`}
          </div>
        )}
      </div>

      {/* Main Layout: Results List + Detail Panel */}
      {debouncedQuery.trim().length >= 2 ? (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
          {/* Results List */}
          <div className="space-y-2">
            {results.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">Không tìm thấy</p>
                <p className="text-slate-400 text-xs mt-1">
                  {searchMode === 'partcode'
                    ? 'Thử nhập mã khác hoặc kiểm tra chính tả'
                    : 'Thử nhập tên hãng khác: CATERPILLAR, KOMATSU, HITACHI...'}
                </p>
              </div>
            ) : (
              results.map(product => (
                <ResultItem
                  key={product.pc}
                  product={product}
                  onClick={handleSelect}
                  isSelected={selectedProduct?.pc === product.pc}
                />
              ))
            )}
          </div>

          {/* Detail Panel */}
          <div id="partcode-detail" className="lg:sticky lg:top-[145px]">
            {selectedProduct ? (
              <ProductDetail
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
              />
            ) : (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-semibold">Chọn một part code</p>
                <p className="text-slate-400 text-sm mt-1">để xem thông tin chi tiết</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State - Hướng dẫn sử dụng */
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <h3 className="text-base font-bold text-slate-700 mb-5 flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-500" />
            Hướng dẫn tra cứu
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-indigo-800">Tìm theo Part Code</span>
              </div>
              <p className="text-xs text-indigo-600 mb-3">Nhập mã sản phẩm để xem toàn bộ thông tin</p>
              <div className="space-y-1">
                {['V230X48X66', 'VA140400', 'V300X52.5X90W', 'V350X56X96'].map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setSearchMode('partcode'); setSearchQuery(ex); }}
                    className="block w-full text-left font-mono text-xs text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-100 px-2 py-1.5 rounded border border-indigo-200 transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-800">Tìm theo Dòng máy</span>
              </div>
              <p className="text-xs text-emerald-600 mb-3">Nhập hãng hoặc model để xem phụ tùng phù hợp</p>
              <div className="space-y-1">
                {['CATERPILLAR', 'HITACHI', 'R15-7', 'PC200'].map(ex => (
                  <button
                    key={ex}
                    onClick={() => { setSearchMode('machine'); setSearchQuery(ex); }}
                    className="block w-full text-left font-mono text-xs text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-100 px-2 py-1.5 rounded border border-emerald-200 transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
