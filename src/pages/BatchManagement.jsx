import { useState, useMemo } from 'react';
import { Layers, Calendar, User, DollarSign, CheckSquare, Square, Trash2 } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';

const HS = {
    blueBase: "#0082a6",
    tealDark: "#195655",
    orange: "#f79962",
    white: "#ffffff",
    fontTitle: "'Open Sans', sans-serif"
};

const BatchManagement = ({ batches = [], setBatches, setFinalizedInvoices, currentUser }) => {
    const [selectedIds, setSelectedIds] = useState([]);

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleConsolidate = () => {
        if (selectedIds.length < 2) return alert("Selecciona al menos 2 lotes para consolidar.");

        if (!window.confirm(`¿Deseas consolidar los ${selectedIds.length} lotes seleccionados en uno solo?`)) return;

        const selectedBatches = batches.filter(b => selectedIds.includes(b.id));
        const consolidatedInvoices = selectedBatches.flatMap(b => b.invoices);

        const newBatchId = `CONS-${new Date().getTime()}`;
        const newBatch = {
            id: newBatchId,
            status: 'finalized',
            createdAt: new Date().toISOString(),
            createdBy: currentUser || 'Admin',
            invoices: consolidatedInvoices,
            mxn: consolidatedInvoices.filter(i => i.currency === 'MXN').reduce((s, i) => s + i.amount, 0),
            usd: consolidatedInvoices.filter(i => i.currency === 'USD').reduce((s, i) => s + i.amount, 0)
        };

        // Eliminar los antiguos y agregar el nuevo
        setBatches(prev => [...prev.filter(b => !selectedIds.includes(b.id)), newBatch]);
        setSelectedIds([]);
        alert(`Lotes consolidados exitosamente en: ${newBatchId}`);
    };

    const handleDeleteBatch = (id) => {
        if (window.confirm("¿Estás seguro de eliminar este lote? Esta acción no se puede deshacer.")) {
            setBatches(prev => prev.filter(b => b.id !== id));
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800" style={{ fontFamily: HS.fontTitle }}>Gestión de Lotes (Batches)</h1>
                    <p className="text-sm text-slate-500">Administra y consolida los lotes generados en la gestión de pagos.</p>
                </div>
                <div className="flex gap-3">
                    {selectedIds.length > 0 && (
                        <Button
                            variant="primary"
                            icon={Layers}
                            onClick={handleConsolidate}
                            className="animate-pulse"
                        >
                            Consolidar Selección ({selectedIds.length})
                        </Button>
                    )}
                </div>
            </div>

            <Card className="p-0 overflow-hidden flex-1 flex flex-col border-slate-200">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-4 py-3 w-10"></th>
                                <th className="px-4 py-3">ID del Batch</th>
                                <th className="px-4 py-3">Fecha y Hora Creación</th>
                                <th className="px-4 py-3">Usuario</th>
                                <th className="px-4 py-3 text-right">Monto MXN</th>
                                <th className="px-4 py-3 text-right">Monto USD</th>
                                <th className="px-4 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {batches.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-20 text-center text-slate-400">
                                        No hay lotes generados. Ve al módulo de Gestión de Pagos V2 para crear uno.
                                    </td>
                                </tr>
                            ) : batches.map((batch) => (
                                <tr key={batch.id} className={`hover:bg-blue-50/30 transition-colors ${selectedIds.includes(batch.id) ? 'bg-blue-50' : ''}`}>
                                    <td className="px-4 py-3">
                                        <button onClick={() => toggleSelect(batch.id)} className="text-primary">
                                            {selectedIds.includes(batch.id) ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300" />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="font-mono font-bold text-primary text-xs">{batch.id}</span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-400" />
                                            {new Date(batch.createdAt).toLocaleString('es-MX')}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-200">
                                                {batch.createdBy?.charAt(0)}
                                            </div>
                                            <span className="font-medium text-slate-700">{batch.createdBy}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-700">
                                        {formatCurrency(batch.mxn)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-600">
                                        {formatCurrency(batch.usd).replace('$', 'USD ')}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleDeleteBatch(batch.id)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default BatchManagement;
