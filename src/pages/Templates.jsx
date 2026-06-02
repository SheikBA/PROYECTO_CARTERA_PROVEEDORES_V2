import { useState, useMemo } from 'react';
import { Search, FileText, Filter, Code, Hash, Mail, Globe, FileSpreadsheet, CheckCircle2, Clock, X } from 'lucide-react';
import { MOCK_TEMPLATES } from '../data/mockData';

const HS = { tealDark: '#195655', blueBase: '#0082a6' };

const CATEGORIA_COLOR = {
    'Host-to-Host': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Comprobación':  'bg-teal-50 text-teal-700 border-teal-200',
    'Referencias':   'bg-amber-50 text-amber-700 border-amber-200',
    'KissFlow':      'bg-purple-50 text-purple-700 border-purple-200',
    'Pago Manual':   'bg-slate-100 text-slate-600 border-slate-200',
};

const TIPO_ICON = {
    TXT:     <Hash size={14} />,
    HTML:    <Mail size={14} />,
    JSON:    <Code size={14} />,
    PATTERN: <Globe size={14} />,
    XLSX:    <FileSpreadsheet size={14} />,
    PDF:     <FileText size={14} />,
};

const CATEGORIAS = ['Todas', ...Array.from(new Set(MOCK_TEMPLATES.map(t => t.categoria)))];

const Templates = () => {
    const [searchTerm, setSearchTerm]       = useState('');
    const [catFiltro, setCatFiltro]         = useState('Todas');
    const [detalle, setDetalle]             = useState(null);

    const filtrados = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return MOCK_TEMPLATES.filter(t => {
            const matchSearch = !term ||
                t.name.toLowerCase().includes(term) ||
                t.id.toLowerCase().includes(term) ||
                t.descripcion?.toLowerCase().includes(term) ||
                t.banco?.toLowerCase().includes(term);
            const matchCat = catFiltro === 'Todas' || t.categoria === catFiltro;
            return matchSearch && matchCat;
        });
    }, [searchTerm, catFiltro]);

    const totalActivas = MOCK_TEMPLATES.filter(t => t.status === 'active').length;
    const totalDraft   = MOCK_TEMPLATES.filter(t => t.status === 'draft').length;
    const totalH2H     = MOCK_TEMPLATES.filter(t => t.categoria === 'Host-to-Host').length;

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-fade-in bg-slate-50/50">

            {/* Cabecera */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                        Configuración de Plantillas
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Cartera de Proveedores · EP-2829
                    </p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 gap-4 shrink-0">
                <div className="bg-white border border-slate-200 border-l-4 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm" style={{ borderLeftColor: HS.blueBase }}>
                    <FileText size={20} className="text-blue-500 shrink-0" />
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{MOCK_TEMPLATES.length}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 border-l-4 border-l-emerald-500 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                    <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Activas</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{totalActivas}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 border-l-4 border-l-indigo-500 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
                    <Globe size={20} className="text-indigo-500 shrink-0" />
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">H2H</p>
                        <p className="text-2xl font-black text-slate-800 leading-none">{totalH2H}</p>
                    </div>
                </div>
            </div>

            {/* Barra de filtros */}
            <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm shrink-0">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, banco, descripción..."
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <Filter size={13} className="text-slate-400 shrink-0" />
                    {CATEGORIAS.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCatFiltro(cat)}
                            className={`px-2.5 py-1 text-[9px] font-black rounded-full border transition-all uppercase tracking-tighter
                                ${catFiltro === cat
                                    ? 'bg-slate-800 text-white border-slate-800'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid de tarjetas */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtrados.length === 0 ? (
                        <div className="col-span-3 py-20 text-center text-slate-400 text-sm italic">
                            No hay plantillas que coincidan con los filtros.
                        </div>
                    ) : filtrados.map(tpl => (
                        <button
                            key={tpl.id}
                            onClick={() => setDetalle(tpl)}
                            className="text-left bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors shrink-0">
                                        {TIPO_ICON[tpl.type] ?? <FileText size={14} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-800 leading-tight truncate">{tpl.name}</p>
                                        <p className="text-[9px] font-mono text-slate-400">{tpl.id} · v{tpl.version}</p>
                                    </div>
                                </div>
                                <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black border ${tpl.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                                    {tpl.status === 'active' ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                                    {tpl.status === 'active' ? 'ACTIVA' : 'DRAFT'}
                                </span>
                            </div>

                            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 mb-3">
                                {tpl.descripcion}
                            </p>

                            <div className="flex items-center justify-between">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-tighter ${CATEGORIA_COLOR[tpl.categoria] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {tpl.categoria}
                                </span>
                                <div className="flex items-center gap-2">
                                    {tpl.banco && (
                                        <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded uppercase">
                                            {tpl.banco}
                                        </span>
                                    )}
                                    <span className="text-[9px] font-mono text-slate-400">{tpl.type}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Panel de detalle */}
            {detalle && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-lg w-full mx-4">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
                                    {TIPO_ICON[detalle.type] ?? <FileText size={18} />}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800">{detalle.name}</p>
                                    <p className="text-[9px] font-mono text-slate-400">{detalle.id} · v{detalle.version}</p>
                                </div>
                            </div>
                            <button onClick={() => setDetalle(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                                {detalle.descripcion}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Categoría</p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-black uppercase ${CATEGORIA_COLOR[detalle.categoria] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                        {detalle.categoria}
                                    </span>
                                </div>
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Formato</p>
                                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-600">
                                        {TIPO_ICON[detalle.type]} {detalle.type}
                                    </span>
                                </div>
                                {detalle.banco && (
                                    <div className="bg-indigo-50 rounded-xl p-3">
                                        <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Banco</p>
                                        <p className="text-[10px] font-black text-indigo-700">{detalle.banco}</p>
                                    </div>
                                )}
                                <div className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Última modificación</p>
                                    <p className="text-[10px] font-mono text-slate-600">{detalle.lastModified}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={() => setDetalle(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Templates;
