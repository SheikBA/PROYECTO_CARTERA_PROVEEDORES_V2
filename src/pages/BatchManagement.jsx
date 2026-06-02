import { useState } from 'react';
import { Layers, Calendar, CheckSquare, Square, Trash2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { formatCurrency, formatDate } from '../utils/formatters.js';

const BatchManagement = ({ batches = [], setBatches, setFinalizedInvoices, currentUser }) => {
    const [selectedIds, setSelectedIds] = useState([]);
    const [confirm, setConfirm]         = useState(null);
    // confirm: { titulo, mensaje, onConfirm, variante } | null
    const [toast, setToast]             = useState(null);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
    const showConfirm = (titulo, mensaje, onConfirm, variante = 'warning') =>
        setConfirm({ titulo, mensaje, onConfirm, variante });

    const toggleSelect = (id) =>
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

    const handleConsolidate = () => {
        if (selectedIds.length < 2) { showToast('Selecciona al menos 2 lotes para consolidar.'); return; }
        showConfirm(
            'Consolidar lotes',
            `¿Consolidar los ${selectedIds.length} lotes seleccionados en uno solo? Los lotes originales serán reemplazados.`,
            () => {
                const selectedBatches = batches.filter(b => selectedIds.includes(b.id));
                const consolidatedInvoices = selectedBatches.flatMap(b => b.invoices ?? []);
                const newBatchId = `CONS-${Date.now()}`;
                const newBatch = {
                    id: newBatchId,
                    status: 'finalized',
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser?.name || 'Admin',
                    invoices: consolidatedInvoices,
                    mxn: consolidatedInvoices.filter(i => i.currency === 'MXN').reduce((s, i) => s + (i.amount ?? 0), 0),
                    usd: consolidatedInvoices.filter(i => i.currency === 'USD').reduce((s, i) => s + (i.amount ?? 0), 0),
                };
                setBatches(prev => [...prev.filter(b => !selectedIds.includes(b.id)), newBatch]);
                setSelectedIds([]);
                showToast(`Lotes consolidados en: ${newBatchId}`);
            },
            'info'
        );
    };

    const handleDeleteBatch = (id) => {
        showConfirm(
            'Eliminar lote',
            '¿Eliminar este lote? Las facturas asociadas quedarán sin batch asignado. Esta acción no se puede deshacer.',
            () => {
                setBatches(prev => prev.filter(b => b.id !== id));
                setSelectedIds(prev => prev.filter(i => i !== id));
                showToast('Lote eliminado.');
            },
            'danger'
        );
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-fade-in">

            {/* Cabecera */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Gestión de Lotes</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Administra y consolida los batches generados en Gestión de Pagos
                    </p>
                </div>
                {selectedIds.length > 0 && (
                    <Button variant="primary" icon={Layers} onClick={handleConsolidate} className="animate-pulse">
                        Consolidar Selección ({selectedIds.length})
                    </Button>
                )}
            </div>

            {/* Tabla */}
            <Card className="p-0 overflow-hidden flex-1 flex flex-col border-slate-200">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-4 py-3 w-10"></th>
                                <th className="px-4 py-3">ID del Batch</th>
                                <th className="px-4 py-3">Fecha Creación</th>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3 text-right">Monto MXN</th>
                                <th className="px-4 py-3 text-right">Monto USD</th>
                                <th className="px-4 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {batches.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-20 text-center text-slate-400 text-xs italic">
                                        No hay lotes generados. Ve a Gestión de Pagos V2 para crear uno.
                                    </td>
                                </tr>
                            ) : batches.map(batch => (
                                <tr key={batch.id} className={`hover:bg-blue-50/30 transition-colors ${selectedIds.includes(batch.id) ? 'bg-blue-50' : ''}`}>
                                    <td className="px-4 py-3">
                                        <button onClick={() => toggleSelect(batch.id)} className="text-primary">
                                            {selectedIds.includes(batch.id)
                                                ? <CheckSquare size={18} />
                                                : <Square size={18} className="text-slate-300" />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-bold text-primary text-xs">{batch.id}</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={13} className="text-slate-400 shrink-0" />
                                            <span className="text-xs">{formatDate(batch.createdAt)}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200 shrink-0">
                                                {batch.createdBy?.charAt(0)?.toUpperCase()}
                                            </div>
                                            <span className="font-medium text-slate-700 text-xs">{batch.createdBy}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700 text-xs">
                                        {formatCurrency(batch.mxn)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600 text-xs">
                                        {formatCurrency(batch.usd, 'USD')}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleDeleteBatch(batch.id)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            title="Eliminar lote"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Modal de confirmación */}
            {confirm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full mx-4">
                        <div className="flex items-start gap-3 mb-5">
                            <div className={`p-2 rounded-xl shrink-0 ${confirm.variante === 'danger' ? 'bg-red-50' : 'bg-blue-50'}`}>
                                {confirm.variante === 'danger'
                                    ? <AlertTriangle size={20} className="text-red-500" />
                                    : <CheckCircle2 size={20} className="text-blue-500" />}
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-800">{confirm.titulo}</p>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{confirm.mensaje}</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setConfirm(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => { confirm.onConfirm(); setConfirm(null); }}
                                className={`px-4 py-2 text-xs font-black text-white rounded-lg transition-colors ${confirm.variante === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] animate-fade-in">
                    <div className="bg-slate-800 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                        {toast}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BatchManagement;
