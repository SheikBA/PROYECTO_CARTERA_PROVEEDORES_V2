import React, { useState, useMemo, useRef } from 'react';
import {
    FileText, Upload, Download, CheckCircle2,
    Search, ShieldAlert, RefreshCw, FolderCheck,
    AlertTriangle, X, Layers
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { formatCurrency, formatDate } from '../utils/formatters.js';
import { evaluar } from '../services/MatchService.js';

const HS = {
    tealDark: '#195655',
    blueBase: '#0082a6',
    fontTitle: "'Open Sans', sans-serif"
};

// RN-012: nombre estándar empresa_RFC_banco_payment.pdf
const generarNombreEstandar = (inv) => {
    const empresa = (inv.meta?.company || 'HS').replace(/\s+/g, '_').toUpperCase();
    const rfc = (inv.meta?.rfc || inv.meta?.providerRFC || 'RFC000000000').toUpperCase();
    const banco = (inv.bankId || 'BANCO').replace(/\s+/g, '_').toUpperCase();
    const payment = inv.meta?.numPaymentId || inv.meta?.invoice || inv.id || 'PAY';
    return `${empresa}_${rfc}_${banco}_${payment}.pdf`;
};

// Convierte una factura del trackingData al formato que espera MatchService
const invoiceToGrupo = (inv) => ({
    fecha: inv.processedDate || inv.dueDate || '',
    proveedorId: inv.meta?.vendor_id || inv.providerName || '',
    montoTotal: inv.amount ?? 0,
    concepto: inv.group || inv.meta?.description || '',
    estado: 'en_proceso',
});

// Extrae metadatos del nombre del archivo PDF como proxy de los 4 parámetros
// En producción esto sería OCR/parsing real; aquí usamos el nombre del archivo como fuente
const parsearArchivoPDF = (file, paisId = 'MX') => ({
    fecha: new Date().toISOString().split('T')[0],   // fecha de carga como proxy
    proveedorId: file.name.split('_')[0] || '',       // primer segmento del nombre
    monto: 0,                                          // sin parsing real de PDF en browser
    concepto: '',
    oficial: true,
    paisId,
    nombreOriginal: file.name,
});

const PaymentVerification = ({ trackingData = [], setTrackingData, finalizedInvoices = [] }) => {
    const fileInputRef = useRef(null);
    const fileMasivoRef = useRef(null);

    const [searchTerm, setSearchTerm] = useState('');

    // Resultados de la última carga (individual o masiva)
    const [resultadosCarga, setResultadosCarga] = useState([]);
    // [{ nombreOriginal, nombreRenombrado, estado: 'MATCHEADO'|'SIN_MATCH'|'ERROR', parametros, invoiceId }]

    const [procesando, setProcesando] = useState(false);
    const [toast, setToast] = useState(null);
    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

    // Fuente de grupos para match: trackingData en estado PROCESANDO PAGO
    const gruposParaMatch = useMemo(() => {
        const base = trackingData.filter(i => i.status === 'PROCESANDO PAGO');
        // Completar con finalizedInvoices si no hay tracking aún
        if (base.length === 0) return finalizedInvoices;
        return base;
    }, [trackingData, finalizedInvoices]);

    // KPIs
    const kpis = useMemo(() => {
        const source = trackingData.filter(i => i.status === 'PROCESANDO PAGO' || i.status === 'COMPROBADO (OK)');
        const getStats = (list) => ({
            total: list.length,
            pending: list.filter(i => i.status !== 'COMPROBADO (OK)').length,
            mnPending: list.filter(i => i.status !== 'COMPROBADO (OK)' && i.currency === 'MXN').length,
            usdPending: list.filter(i => i.status !== 'COMPROBADO (OK)' && i.currency === 'USD').length,
        });
        const bankMap = {};
        source.forEach(inv => {
            const bank = inv.bankId || 'Sin Banco';
            if (!bankMap[bank]) bankMap[bank] = new Set();
            bankMap[bank].add(inv.providerName);
        });
        return {
            h2h: getStats(source.filter(i => i.meta?.isH2H)),
            nonH2h: getStats(source.filter(i => !i.meta?.isH2H)),
            banks: bankMap,
        };
    }, [trackingData]);

    const filteredData = useMemo(() => {
        return trackingData.filter(inv => {
            const isRelevant = inv.status === 'PROCESANDO PAGO' || inv.status === 'COMPROBADO (OK)';
            if (!isRelevant) return false;
            const term = searchTerm.toLowerCase();
            return (
                inv.providerName?.toLowerCase().includes(term) ||
                inv.meta?.invoice?.toLowerCase().includes(term) ||
                inv.bankId?.toLowerCase().includes(term)
            );
        });
    }, [trackingData, searchTerm]);

    // --- Lógica de match real (REQ-002 / HU-008 / HU-009) ---
    const procesarArchivos = async (files, paisId = 'MX') => {
        if (!files || files.length === 0) return;
        setProcesando(true);
        const resultados = [];

        for (const file of Array.from(files)) {
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                resultados.push({ nombreOriginal: file.name, estado: 'ERROR', error: 'Solo se aceptan archivos PDF' });
                continue;
            }

            const comprobante = parsearArchivoPDF(file, paisId);

            // Buscar el mejor match entre los grupos disponibles
            let mejorMatch = null;
            let mejorParametros = null;

            for (const grupo of gruposParaMatch) {
                const grupoNorm = invoiceToGrupo(grupo);
                const { matcheado, parametros } = evaluar(comprobante, grupoNorm);
                if (matcheado) {
                    mejorMatch = grupo;
                    mejorParametros = parametros;
                    break;
                }
                // Guardar el mejor intento parcial para mostrar qué parámetros fallaron
                const acertados = Object.values(parametros).filter(Boolean).length;
                if (!mejorParametros || acertados > Object.values(mejorParametros).filter(Boolean).length) {
                    mejorParametros = parametros;
                }
            }

            const nombreRenombrado = mejorMatch ? generarNombreEstandar(mejorMatch) : file.name;
            const estado = mejorMatch ? 'MATCHEADO' : 'SIN_MATCH';

            resultados.push({
                nombreOriginal: file.name,
                nombreRenombrado,
                estado,
                parametros: mejorParametros,
                invoiceId: mejorMatch?.id ?? null,
                proveedorNombre: mejorMatch?.providerName ?? '—',
                monto: mejorMatch?.amount ?? 0,
                moneda: mejorMatch?.currency ?? 'MXN',
            });

            // Si matcheó → actualizar trackingData y persistencia local
            if (mejorMatch) {
                setTrackingData(prev => prev.map(inv =>
                    inv.id === mejorMatch.id
                        ? { ...inv, status: 'COMPROBADO (OK)', verifiedAt: new Date().toISOString(), filePath: nombreRenombrado }
                        : inv
                ));
                const saved = JSON.parse(localStorage.getItem('hs_comprobaciones') || '[]');
                saved.push({ id: mejorMatch.id, path: nombreRenombrado, date: new Date().toISOString() });
                localStorage.setItem('hs_comprobaciones', JSON.stringify(saved));
            }
        }

        setResultadosCarga(resultados);
        setProcesando(false);
        const matcheados = resultados.filter(r => r.estado === 'MATCHEADO').length;
        showToast(`${resultados.length} archivo(s) procesado(s) — ${matcheados} matcheado(s).`);
    };

    const handleCargaIndividual = (e) => {
        const file = e.target.files?.[0];
        if (file) procesarArchivos([file]);
        e.target.value = '';
    };

    const handleCargaMasiva = (e) => {
        const files = e.target.files;
        if (files?.length) procesarArchivos(files);
        e.target.value = '';
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 animate-fade-in bg-slate-50/50">

            {/* CABECERA */}
            <div className="hidden">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase" style={{ fontFamily: HS.fontTitle }}>
                        Comprobación de Pagos
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cartera de Proveedores</span>
                        <span className="px-2 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-600 text-[9px] font-black uppercase">P2</span>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-t-4 border-t-indigo-500 p-4 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pendiente H2H</p>
                    <p className="text-3xl font-black text-slate-800">{kpis.h2h.pending}<span className="text-slate-300 mx-1">/</span>{kpis.h2h.total}</p>
                    <div className="mt-3 flex gap-4 border-t border-slate-100 pt-2">
                        <div><p className="text-[8px] font-bold text-slate-400 uppercase">MN</p><p className="text-xs font-bold">{kpis.h2h.mnPending}</p></div>
                        <div><p className="text-[8px] font-bold text-slate-400 uppercase">USD</p><p className="text-xs font-bold text-blue-600">{kpis.h2h.usdPending}</p></div>
                    </div>
                </Card>
                <Card className="border-t-4 border-t-amber-500 p-4 shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Pendiente Sin H2H</p>
                    <p className="text-3xl font-black text-slate-800">{kpis.nonH2h.pending}<span className="text-slate-300 mx-1">/</span>{kpis.nonH2h.total}</p>
                    <div className="mt-3 flex gap-4 border-t border-slate-100 pt-2">
                        <div><p className="text-[8px] font-bold text-slate-400 uppercase">MN</p><p className="text-xs font-bold">{kpis.nonH2h.mnPending}</p></div>
                        <div><p className="text-[8px] font-bold text-slate-400 uppercase">USD</p><p className="text-xs font-bold text-blue-600">{kpis.nonH2h.usdPending}</p></div>
                    </div>
                </Card>
                <Card className="border-t-4 border-t-teal-600 p-4 shadow-sm overflow-y-auto max-h-[120px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Proveedores por Banco</p>
                    <div className="space-y-1.5">
                        {Object.entries(kpis.banks).map(([bank, providers]) => (
                            <div key={bank} className="flex justify-between items-center text-[10px]">
                                <span className="font-bold text-slate-600 uppercase">{bank}</span>
                                <span className="bg-slate-100 px-1.5 py-0.5 rounded font-black text-slate-500">→ {providers.size} proveedores</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* BARRA DE HERRAMIENTAS — carga individual + masiva (REQ-002) */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Carga individual */}
                    <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleCargaIndividual} />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={procesando}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-60"
                    >
                        <Upload size={14} />
                        {procesando ? 'Procesando...' : 'Cargar PDF'}
                    </button>

                    {/* Carga masiva */}
                    <input ref={fileMasivoRef} type="file" accept=".pdf" multiple className="hidden" onChange={handleCargaMasiva} />
                    <button
                        onClick={() => fileMasivoRef.current?.click()}
                        disabled={procesando}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors shadow-sm disabled:opacity-60"
                    >
                        <Layers size={14} />
                        Carga Masiva (múltiples PDF)
                    </button>

                    {resultadosCarga.length > 0 && (
                        <button
                            onClick={() => setResultadosCarga([])}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={12} /> Limpiar resultados
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 text-blue-700">
                    <FolderCheck size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">
                        Match automático: fecha · proveedor · monto · concepto (RN-014)
                    </span>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Buscar proveedor..."
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* RESULTADOS DE LA ÚLTIMA CARGA (REQ-002 / HU-008 / HU-009) */}
            {resultadosCarga.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden shrink-0">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resultado de carga</span>
                            <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                                {resultadosCarga.filter(r => r.estado === 'MATCHEADO').length} matcheados
                            </span>
                            {resultadosCarga.some(r => r.estado === 'SIN_MATCH') && (
                                <span className="bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                                    {resultadosCarga.filter(r => r.estado === 'SIN_MATCH').length} sin match
                                </span>
                            )}
                            {resultadosCarga.some(r => r.estado === 'ERROR') && (
                                <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-0.5 rounded-full">
                                    {resultadosCarga.filter(r => r.estado === 'ERROR').length} error
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="overflow-auto max-h-52">
                        <table className="w-full text-left text-[10px]">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-slate-400 font-black uppercase tracking-widest text-[8px]">
                                    <th className="px-4 py-2">Archivo original</th>
                                    <th className="px-4 py-2">Nombre renombrado (RN-012)</th>
                                    <th className="px-4 py-2 text-center">Estado</th>
                                    <th className="px-4 py-2 text-center">Fecha</th>
                                    <th className="px-4 py-2 text-center">Proveedor</th>
                                    <th className="px-4 py-2 text-center">Monto</th>
                                    <th className="px-4 py-2 text-center">Concepto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {resultadosCarga.map((r, i) => (
                                    <tr key={i} className={r.estado === 'MATCHEADO' ? 'bg-emerald-50/40' : r.estado === 'ERROR' ? 'bg-red-50/40' : 'bg-amber-50/40'}>
                                        <td className="px-4 py-2 font-mono text-slate-600 truncate max-w-[160px]" title={r.nombreOriginal}>{r.nombreOriginal}</td>
                                        <td className="px-4 py-2 font-mono text-slate-500 truncate max-w-[180px]" title={r.nombreRenombrado}>
                                            {r.estado === 'MATCHEADO' ? <span className="text-emerald-700 font-bold">{r.nombreRenombrado}</span> : <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {r.estado === 'MATCHEADO'
                                                ? <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-0.5 rounded-full">MATCHEADO</span>
                                                : r.estado === 'ERROR'
                                                    ? <span className="bg-red-100 text-red-700 text-[8px] font-black px-2 py-0.5 rounded-full">ERROR</span>
                                                    : <span className="bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full">SIN MATCH</span>}
                                        </td>
                                        {/* Indicadores por parámetro */}
                                        {['fecha', 'proveedor', 'monto', 'concepto'].map(param => (
                                            <td key={param} className="px-4 py-2 text-center">
                                                {r.parametros
                                                    ? r.parametros[param]
                                                        ? <CheckCircle2 size={12} className="text-emerald-500 mx-auto" />
                                                        : <X size={12} className="text-red-400 mx-auto" />
                                                    : <span className="text-slate-300">—</span>}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TABLA PRINCIPAL DE TRACKING */}
            <Card className="flex-1 p-0 overflow-hidden border-slate-200 shadow-xl flex flex-col">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 z-10 bg-slate-800 text-white font-black uppercase text-[9px] tracking-widest">
                            <tr>
                                <th className="p-4">Banco Pagador</th>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4">Grupo</th>
                                <th className="p-4">Fecha Proceso</th>
                                <th className="p-4 text-center">Moneda</th>
                                <th className="p-4 text-right">Monto</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="p-20 text-center text-slate-400 italic text-xs">
                                        No hay facturas pendientes de comprobación. Procesa un batch en el módulo de Pagos.
                                    </td>
                                </tr>
                            ) : filteredData.map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-4 font-bold text-slate-700">{inv.bankId || '—'}</td>
                                    <td className="p-4">
                                        <p className="font-black text-slate-800 uppercase">{inv.providerName}</p>
                                        <p className="text-[9px] text-slate-400 font-mono">{inv.meta?.company}</p>
                                    </td>
                                    <td className="p-4">
                                        <Badge status="secondary" className="text-[9px]">{inv.paymentGroupId || inv.meta?.paymentGroupId || inv.group || 'GENERAL'}</Badge>
                                    </td>
                                    <td className="p-4 text-slate-500 font-mono">{formatDate(inv.processedDate)}</td>
                                    <td className="p-4 text-center font-black text-slate-400">{inv.currency}</td>
                                    <td className="p-4 text-right font-black text-slate-800">{formatCurrency(inv.amount, inv.currency)}</td>
                                    <td className="p-4 text-center">
                                        {inv.status === 'COMPROBADO (OK)' ? (
                                            <div className="flex flex-col items-center gap-0.5">
                                                <Badge status="success" className="text-[8px]">Comprobado</Badge>
                                                {inv.filePath && (
                                                    <span className="text-[7px] text-slate-400 font-mono truncate max-w-[120px]" title={inv.filePath}>
                                                        {inv.filePath}
                                                    </span>
                                                )}
                                            </div>
                                        ) : (
                                            <Badge status="pending" className="text-[8px]">Pendiente</Badge>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {inv.status !== 'COMPROBADO (OK)' ? (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={procesando}
                                                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-[9px] font-black uppercase transition-all border border-blue-200 disabled:opacity-50"
                                            >
                                                Cargar PDF
                                            </button>
                                        ) : (
                                            <button className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors" title={inv.filePath}>
                                                <FileText size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Toast */}
            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-in">
                    <div className="bg-slate-800 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                        {toast}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentVerification;
