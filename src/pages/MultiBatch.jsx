import { useState, useMemo, useRef, useEffect } from 'react';
import {
    Search, Filter, GitMerge, Send, CheckCircle2, ShieldAlert,
    ChevronDown, X, Layers, Unlock, AlertTriangle, Mail, Hash,
    Calendar, User, FileSpreadsheet, DollarSign, Eye, MoreHorizontal,
    EyeOff, Inbox, Landmark
} from 'lucide-react';

// ─── Tokens HS ────────────────────────────────────────────────────────
const HS = {
    blueBase: '#0082a6',
    tealDark: '#195655',
};

const formatCurrency = (amount, currency = 'MXN') =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount || 0);

const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Badge de estado ──────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
    const map = {
        pending: { label: 'PENDIENTE', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        review: { label: 'EN REVISIÓN', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        finalized: { label: 'EN REVISIÓN', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        approved: { label: 'APROBADO', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
        sent: { label: 'ENVIADO', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
        consolidated: { label: 'CONSOLIDADO', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
        closed: { label: 'CERRADO', cls: 'bg-slate-200 text-slate-600 border-slate-300' },
    };
    const { label, cls } = map[status] || map.pending;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider border ${cls}`}>
            {label}
        </span>
    );
};

// ─── Modal de confirmación ────────────────────────────────────────────
const ConfirmModal = ({ dialog, onConfirm, onCancel }) => {
    if (!dialog) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-md w-full mx-4">
                <div className="flex items-start gap-3 mb-5">
                    <div className="p-2 bg-amber-50 rounded-xl shrink-0">
                        <AlertTriangle size={20} className="text-amber-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 leading-snug">{dialog.title}</p>
                        {dialog.body && (
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed whitespace-pre-line">{dialog.body}</p>
                        )}
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel}
                        className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button onClick={onConfirm}
                        className="px-4 py-2 text-xs font-black text-white rounded-lg transition-colors shadow-sm"
                        style={{ backgroundColor: HS.blueBase }}>
                        {dialog.confirmLabel || 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Toast ────────────────────────────────────────────────────────────
const useToast = () => {
    const [toast, setToast] = useState(null);
    const show = (msg) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };
    return { toast, show };
};

const STATUS_OPTIONS = [
    { value: '', label: 'Todos los estados' },
    { value: 'pending', label: 'Pendiente' },
    { value: 'review', label: 'En Revisión' },
    { value: 'finalized', label: 'En Revisión' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'sent', label: 'Enviado' },
    { value: 'consolidated', label: 'Consolidado' },
    { value: 'closed', label: 'Cerrado' },
];

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────
const MultiBatch = ({ batchList = [], setBatchList, currentUser }) => {

    // Convertir batchList del formato de App.jsx al formato interno
    const toBatchItem = (b) => ({
        id: b.id,
        name: b.name || `Propuesta — ${formatDate(b.createdAt)}`,
        status: b.status === 'finalized' ? 'review' : (b.status || 'pending'),
        createdAt: b.createdAt || new Date().toISOString(),
        responsible: b.responsible || currentUser?.name || 'Usuario',
        invoiceCount: b.invoiceCount || 0,
        totalMXN: b.totalMXN || 0,
        totalUSD: b.totalUSD || 0,
        sourceIds: b.sourceIds || [],
        isConsolidation: b.isConsolidation || false,
    });

    const [localBatches, setLocalBatches] = useState(() =>
        (batchList || []).map(toBatchItem)
    );

    // Sincronizar cuando llegan nuevos batches desde PaymentsV2
    useEffect(() => {
        setLocalBatches(prev => {
            const prevIds = new Set(prev.map(b => b.id));
            const newItems = (batchList || [])
                .filter(b => !prevIds.has(b.id))
                .map(toBatchItem);
            return newItems.length > 0 ? [...newItems, ...prev] : prev;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchList]);

    const [selected, setSelected] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [statusDropOpen, setStatusDropOpen] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [detailBatch, setDetailBatch] = useState(null);
    const [showConsolidated, setShowConsolidated] = useState(false);
    const statusDropRef = useRef(null);
    const { toast, show: showToast } = useToast();

    useEffect(() => {
        const handle = (e) => {
            if (statusDropRef.current && !statusDropRef.current.contains(e.target))
                setStatusDropOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // ── Conteo y filtrado ─────────────────────────────────────────────
    const consolidatedCount = useMemo(
        () => localBatches.filter(b => b.status === 'consolidated').length,
        [localBatches]
    );

    const filteredBatches = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return localBatches.filter(b => {
            if (!showConsolidated && b.status === 'consolidated') return false;
            const matchSearch = !term ||
                b.id.toLowerCase().includes(term) ||
                b.name.toLowerCase().includes(term) ||
                (b.responsible || '').toLowerCase().includes(term);
            const matchStatus = !statusFilter || b.status === statusFilter;
            return matchSearch && matchStatus;
        });
    }, [localBatches, searchTerm, statusFilter, showConsolidated]);

    const activeBatchCount = localBatches.filter(
        b => b.status !== 'sent' && b.status !== 'consolidated' && b.status !== 'closed'
    ).length;

    // ── Selección ─────────────────────────────────────────────────────
    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const selectable = filteredBatches.filter(b => b.status !== 'sent' && b.status !== 'closed');
        if (selected.size === selectable.length && selectable.length > 0) {
            setSelected(new Set());
        } else {
            setSelected(new Set(selectable.map(b => b.id)));
        }
    };

    const selectedBatches = filteredBatches.filter(b => selected.has(b.id));
    const canConsolidate = selectedBatches.length >= 2 &&
        selectedBatches.every(b => b.status !== 'sent' && b.status !== 'closed' && !b.isConsolidation);
    const canSend = selected.size >= 1 &&
        selectedBatches.every(b => b.status !== 'sent' && b.status !== 'closed');

    const selectionSummary = useMemo(() => {
        if (selectedBatches.length === 0) return null;
        return {
            invoiceCount: selectedBatches.reduce((s, b) => s + (b.invoiceCount || 0), 0),
            totalMXN: selectedBatches.reduce((s, b) => s + (b.totalMXN || 0), 0),
            totalUSD: selectedBatches.reduce((s, b) => s + (b.totalUSD || 0), 0),
        };
    }, [selectedBatches]);

    // ── Consolidar ────────────────────────────────────────────────────
    const handleConsolidate = () => {
        setConfirmDialog({
            title: `¿Consolidar ${selectedBatches.length} batches en uno solo?`,
            body: `Se creará un nuevo batch unificado con ${selectionSummary?.invoiceCount ?? 0} facturas.\nLos batches originales quedarán marcados como "Consolidado" y podrán liberarse mientras no se hayan enviado.`,
            confirmLabel: 'Consolidar',
            action: 'consolidate',
        });
    };

    const executeConsolidate = () => {
        if (!selectionSummary) return;
        const newId = `BCH-CONS-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
        const names = selectedBatches.map(b => (b.name || '').split('—')[0].trim()).join(' + ');
        const newBatch = {
            id: newId,
            name: `CONSOLIDADO: ${names}`,
            status: 'pending',
            createdAt: new Date().toISOString(),
            responsible: currentUser?.name || 'Usuario',
            invoiceCount: selectionSummary.invoiceCount,
            totalMXN: selectionSummary.totalMXN,
            totalUSD: selectionSummary.totalUSD,
            sourceIds: selectedBatches.map(b => b.id),
            isConsolidation: true,
        };
        setLocalBatches(prev => [newBatch, ...prev.map(b =>
            selected.has(b.id) ? { ...b, status: 'consolidated' } : b
        )]);
        setSelected(new Set([newId]));
        showToast(`Batch consolidado creado: ${newId}`);
    };

    // ── Liberar consolidación ─────────────────────────────────────────
    const handleReleaseConsolidation = (batch) => {
        setConfirmDialog({
            title: `¿Liberar la consolidación "${batch.name}"?`,
            body: 'Los batches originales volverán a estado Pendiente y este batch consolidado será eliminado.',
            confirmLabel: 'Liberar',
            action: 'release',
            payload: batch,
        });
    };

    const executeRelease = (batch) => {
        setLocalBatches(prev =>
            prev
                .map(b => batch.sourceIds.includes(b.id) ? { ...b, status: 'pending' } : b)
                .filter(b => b.id !== batch.id)
        );
        setSelected(prev => { const n = new Set(prev); n.delete(batch.id); return n; });
        showToast('Consolidación liberada. Batches originales restaurados.');
    };

    // ── Enviar ────────────────────────────────────────────────────────
    const handleSend = () => {
        if (!selectionSummary) return;
        const isMulti = selectedBatches.length > 1;
        setConfirmDialog({
            title: isMulti
                ? `¿Enviar ${selectedBatches.length} batches a aprobación?`
                : `¿Enviar "${selectedBatches[0]?.name}" a aprobación?`,
            body: `Se notificará por correo con la información consolidada:\n• ${selectionSummary.invoiceCount} facturas\n• MXN ${formatCurrency(selectionSummary.totalMXN)}\n• USD ${formatCurrency(selectionSummary.totalUSD, 'USD')}\n\nEsta acción no puede revertirse.`,
            confirmLabel: 'Confirmar y Enviar',
            action: 'send',
        });
    };

    const executeSend = () => {
        setLocalBatches(prev =>
            prev.map(b => selected.has(b.id) ? { ...b, status: 'sent' } : b)
        );
        const count = selectedBatches.length;
        setSelected(new Set());
        showToast(`Notificación enviada. ${count} batch${count !== 1 ? 'es' : ''} marcado${count !== 1 ? 's' : ''} como ENVIADO.`);
    };

    // ── Despachador ───────────────────────────────────────────────────
    const handleConfirm = () => {
        const { action, payload } = confirmDialog;
        setConfirmDialog(null);
        if (action === 'consolidate') executeConsolidate();
        if (action === 'send') executeSend();
        if (action === 'release') executeRelease(payload);
    };

    // ── Render ────────────────────────────────────────────────────────
    return (
        <div className="h-full flex flex-col gap-3 animate-fade-in" style={{ fontFamily: "'Roboto', sans-serif" }}>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] animate-fade-in">
                    <div className="bg-slate-800 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                        {toast}
                    </div>
                </div>
            )}

            <ConfirmModal dialog={confirmDialog} onConfirm={handleConfirm} onCancel={() => setConfirmDialog(null)} />

            {/* ── HEADER ──────────────────────────────────────────── */}
            <div className="shrink-0 flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
                <div className="flex items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                            Batches de Facturas
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Gestión y consolidación de lotes para envío a aprobación
                        </p>
                    </div>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
                    <Layers size={11} />
                    {activeBatchCount} Batches Activos
                </span>
            </div>

            {/* ── BARRA DE HERRAMIENTAS ────────────────────────────── */}
            <div className="shrink-0 flex items-center gap-2 flex-wrap">
                {/* Buscador */}
                <div className="relative flex-1 min-w-[180px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar batch, responsable, ID..."
                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-200 shadow-sm"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Filtro de estado */}
                <div className="relative" ref={statusDropRef}>
                    <button
                        onClick={() => setStatusDropOpen(v => !v)}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
                    >
                        <Filter size={13} />
                        {STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || 'Todos los estados'}
                        <ChevronDown size={12} className={`transition-transform ${statusDropOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {statusDropOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1">
                            {STATUS_OPTIONS.filter((o, i, arr) => arr.findIndex(x => x.label === o.label) === i).map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setStatusFilter(opt.value); setStatusDropOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${statusFilter === opt.value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1" />

                {/* Toggle consolidados */}
                {consolidatedCount > 0 && (
                    <button
                        onClick={() => setShowConsolidated(v => !v)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors shadow-sm"
                        style={showConsolidated
                            ? { backgroundColor: '#f3e8ff', borderColor: '#c084fc', color: '#7c3aed' }
                            : { backgroundColor: '#f8fafc', borderColor: '#cbd5e1', color: '#64748b' }
                        }
                    >
                        {showConsolidated ? <Eye size={13} /> : <EyeOff size={13} />}
                        {showConsolidated ? 'Ocultar' : 'Ver'} consolidados ({consolidatedCount})
                    </button>
                )}

                {/* Consolidar */}
                <button
                    onClick={handleConsolidate}
                    disabled={!canConsolidate}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black border rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={canConsolidate
                        ? { borderColor: HS.blueBase, color: HS.blueBase, backgroundColor: '#e0f4f9' }
                        : { borderColor: '#cbd5e1', color: '#94a3b8', backgroundColor: '#f8fafc' }
                    }
                    title="Selecciona 2 o más batches no enviados para consolidar"
                >
                    <GitMerge size={14} />
                    CONSOLIDAR {selected.size >= 2 ? `(${selected.size})` : ''}
                </button>

                {/* Enviar */}
                <button
                    onClick={handleSend}
                    disabled={!canSend}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={canSend
                        ? { background: `linear-gradient(135deg, ${HS.blueBase}, ${HS.tealDark})` }
                        : { backgroundColor: '#94a3b8' }
                    }
                >
                    <Send size={14} />
                    ENVIAR PROPUESTA {canSend ? `(${selected.size})` : ''}
                </button>
            </div>

            {/* ── PANEL DE SELECCIÓN ACTIVA ────────────────────────── */}
            {selectionSummary && (
                <div className="shrink-0 flex items-center gap-4 px-4 py-2.5 rounded-xl border animate-fade-in"
                    style={{ backgroundColor: '#e0f4f9', borderColor: HS.blueBase + '40' }}>
                    <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: HS.blueBase }}>
                        {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
                    </span>
                    <span className="h-3 w-px bg-slate-300" />
                    <span className="text-[10px] text-slate-600 font-semibold flex items-center gap-1">
                        <FileSpreadsheet size={10} />
                        {selectionSummary.invoiceCount} facturas
                    </span>
                    {selectionSummary.totalMXN > 0 && (
                        <span className="text-[10px] text-slate-600 font-semibold">
                            MXN {formatCurrency(selectionSummary.totalMXN)}
                        </span>
                    )}
                    {selectionSummary.totalUSD > 0 && (
                        <span className="text-[10px] font-semibold" style={{ color: HS.blueBase }}>
                            USD {formatCurrency(selectionSummary.totalUSD, 'USD')}
                        </span>
                    )}
                    <button onClick={() => setSelected(new Set())}
                        className="ml-auto text-[9px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1">
                        <X size={11} /> Limpiar selección
                    </button>
                </div>
            )}

            {/* ── TABLA ────────────────────────────────────────────── */}
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <div className="overflow-auto h-full flex flex-col">

                    {localBatches.length === 0 ? (
                        /* Estado vacío */
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-20">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <Inbox size={36} className="text-slate-300" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500">Sin batches generados</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Ve a <span className="font-semibold">Gestión Pagos V2</span>, autoriza facturas y presiona <span className="font-semibold">GENERAR BATCH</span>.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <table className="w-full text-left min-w-[900px]">
                            <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={filteredBatches.length > 0 && selected.size === filteredBatches.filter(b => b.status !== 'sent' && b.status !== 'closed').length && filteredBatches.filter(b => b.status !== 'sent' && b.status !== 'closed').length > 0}
                                            onChange={toggleSelectAll}
                                            className="rounded border-slate-300 accent-blue-600 cursor-pointer"
                                        />
                                    </th>
                                    {[
                                        { icon: Hash, label: 'ID Batch' },
                                        { icon: Layers, label: 'Nombre del Batch' },
                                        { icon: FileSpreadsheet, label: 'Facturas' },
                                        { icon: DollarSign, label: 'Monto Total' },
                                        { icon: Calendar, label: 'Fecha' },
                                        { icon: User, label: 'Responsable' },
                                        { icon: ShieldAlert, label: 'Estado' },
                                        { icon: MoreHorizontal, label: '' },
                                    ].map(({ icon: Icon, label }, i) => (
                                        <th key={i} className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            <div className="flex items-center gap-1.5">
                                                <Icon size={11} className="text-slate-400" />
                                                {label}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredBatches.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center py-12 text-sm text-slate-400">
                                            No hay batches que coincidan con los filtros.
                                        </td>
                                    </tr>
                                ) : filteredBatches.map((batch) => {
                                    const isSelected = selected.has(batch.id);
                                    const isDisabled = batch.status === 'sent' || batch.status === 'closed';
                                    return (
                                        <tr
                                            key={batch.id}
                                            onClick={() => !isDisabled && toggleSelect(batch.id)}
                                            className={`transition-colors ${isDisabled ? 'opacity-60 cursor-default' : 'cursor-pointer'} ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                                        >
                                            {/* Checkbox */}
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    disabled={isDisabled}
                                                    onChange={() => toggleSelect(batch.id)}
                                                    className="rounded border-slate-300 accent-blue-600 cursor-pointer disabled:opacity-30"
                                                />
                                            </td>

                                            {/* ID */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                        {batch.id}
                                                    </span>
                                                    {batch.isConsolidation && (
                                                        <span className="text-[8px] font-black text-purple-600 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-full">
                                                            MERGE
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Nombre */}
                                            <td className="px-4 py-3 max-w-[220px]">
                                                <p className="text-xs font-bold text-slate-800 truncate">{batch.name}</p>
                                                {batch.isConsolidation && batch.sourceIds?.length > 0 && (
                                                    <p className="text-[9px] text-slate-400 mt-0.5">
                                                        Engloba {batch.sourceIds.length} batches
                                                    </p>
                                                )}
                                            </td>

                                            {/* Facturas */}
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-black text-slate-800 tabular-nums">{batch.invoiceCount}</span>
                                                <span className="text-[9px] text-slate-400 ml-1">docs</span>
                                            </td>

                                            {/* Monto */}
                                            <td className="px-4 py-3">
                                                {batch.totalMXN > 0 && (
                                                    <p className="text-xs font-bold text-slate-800 tabular-nums">
                                                        {formatCurrency(batch.totalMXN)}
                                                    </p>
                                                )}
                                                {batch.totalUSD > 0 && (
                                                    <p className="text-xs font-bold tabular-nums" style={{ color: HS.blueBase }}>
                                                        {formatCurrency(batch.totalUSD, 'USD')}
                                                    </p>
                                                )}
                                                {!batch.totalMXN && !batch.totalUSD && (
                                                    <span className="text-slate-300">—</span>
                                                )}
                                            </td>

                                            {/* Fecha */}
                                            <td className="px-4 py-3 text-[11px] text-slate-500">
                                                {formatDate(batch.createdAt)}
                                            </td>

                                            {/* Responsable */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0"
                                                        style={{ backgroundColor: HS.blueBase }}>
                                                        {(batch.responsible || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-[11px] text-slate-500">{batch.responsible}</span>
                                                </div>
                                            </td>

                                            {/* Estado */}
                                            <td className="px-4 py-3">
                                                <StatusBadge status={batch.status} />
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => setDetailBatch(batch)}
                                                        className="p-1.5 rounded-lg transition-colors hover:bg-slate-100"
                                                        title="Ver detalle"
                                                    >
                                                        <Eye size={13} className="text-slate-400" />
                                                    </button>
                                                    {batch.isConsolidation && batch.status !== 'sent' && batch.status !== 'closed' && (
                                                        <button
                                                            onClick={() => handleReleaseConsolidation(batch)}
                                                            className="p-1.5 rounded-lg transition-colors hover:bg-amber-50"
                                                            title="Liberar consolidación"
                                                        >
                                                            <Unlock size={13} className="text-amber-500" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ── PIE ──────────────────────────────────────────────── */}
            {localBatches.length > 0 && (
                <div className="shrink-0 flex items-center justify-between px-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {filteredBatches.length} de {localBatches.length} batch{localBatches.length !== 1 ? 'es' : ''}
                        {consolidatedCount > 0 && !showConsolidated && (
                            <span className="text-purple-500"> · {consolidatedCount} consolidado{consolidatedCount !== 1 ? 's' : ''} oculto{consolidatedCount !== 1 ? 's' : ''}</span>
                        )}
                        {selected.size > 0 && ` · ${selected.size} seleccionado${selected.size !== 1 ? 's' : ''}`}
                    </span>
                    <div className="flex items-center gap-3 text-[9px] font-semibold text-slate-400">
                        {[
                            { cls: 'bg-amber-400', label: 'Pendiente' },
                            { cls: 'bg-blue-500', label: 'En Revisión' },
                            { cls: 'bg-emerald-500', label: 'Aprobado' },
                            { cls: 'bg-slate-400', label: 'Enviado' },
                            { cls: 'bg-purple-500', label: 'Consolidado' },
                            { cls: 'bg-slate-600', label: 'Cerrado' },
                        ].map(({ cls, label }) => (
                            <span key={label} className="flex items-center gap-1">
                                <span className={`w-2 h-2 rounded-full ${cls} inline-block`} />
                                {label}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ── MODAL DETALLE ────────────────────────────────────── */}
            {detailBatch && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
                    onClick={() => setDetailBatch(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-lg w-full mx-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <p className="text-xs font-mono text-slate-400">{detailBatch.id}</p>
                                <h3 className="text-base font-black text-slate-800 mt-0.5 leading-snug">{detailBatch.name}</h3>
                            </div>
                            <button onClick={() => setDetailBatch(null)}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {[
                                { label: 'Facturas', value: `${detailBatch.invoiceCount} documentos` },
                                { label: 'Estado', value: <StatusBadge status={detailBatch.status} /> },
                                { label: 'Responsable', value: detailBatch.responsible },
                                { label: 'Fecha creación', value: formatDate(detailBatch.createdAt) },
                                { label: 'Total MXN', value: formatCurrency(detailBatch.totalMXN) },
                                { label: 'Total USD', value: formatCurrency(detailBatch.totalUSD, 'USD'), highlight: detailBatch.totalUSD > 0 },
                            ].map(({ label, value, highlight }) => (
                                <div key={label} className="bg-slate-50 rounded-xl p-3">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                    <div className={`text-xs font-bold ${highlight ? 'text-blue-600' : 'text-slate-700'}`}>{value}</div>
                                </div>
                            ))}
                        </div>

                        {detailBatch.isConsolidation && detailBatch.sourceIds?.length > 0 && (
                            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 mb-4">
                                <p className="text-[9px] font-black text-purple-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <GitMerge size={10} /> Batches Originales Incluidos
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {detailBatch.sourceIds.map(id => (
                                        <span key={id} className="font-mono text-[9px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{id}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            {detailBatch.isConsolidation && detailBatch.status !== 'sent' && detailBatch.status !== 'closed' && (
                                <button
                                    onClick={() => { setDetailBatch(null); handleReleaseConsolidation(detailBatch); }}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors"
                                >
                                    <Unlock size={12} /> Liberar Consolidación
                                </button>
                            )}
                            {detailBatch.status !== 'sent' && detailBatch.status !== 'closed' && (
                                <button
                                    onClick={() => {
                                        setDetailBatch(null);
                                        setSelected(new Set([detailBatch.id]));
                                        setTimeout(() => handleSend(), 50);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white rounded-lg transition-colors"
                                    style={{ backgroundColor: HS.blueBase }}
                                >
                                    <Mail size={12} /> Enviar este Batch
                                </button>
                            )}
                            <button onClick={() => setDetailBatch(null)}
                                className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiBatch;
