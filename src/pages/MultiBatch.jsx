import { Fragment, useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    Search, Filter, Send, CheckCircle2, ShieldAlert,
    ChevronDown, X, Layers, Unlock, AlertTriangle, Hash,
    Calendar, User, FileSpreadsheet, DollarSign, Eye, MoreHorizontal,
    EyeOff, Inbox, Landmark, RefreshCw, MessageSquare
} from 'lucide-react';

// â”€â”€â”€ Tokens HS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HS = {
    blueBase: '#0082a6',
    tealDark: '#195655',
};

import { formatCurrency, formatDate } from '../utils/formatters.js';
import { BALANCE_VALIDATION_STAGES, formatBalanceValidationMessage, getBalanceValidationHit } from '../utils/balanceValidation.js';
import { CATALOG_BANCOS_INICIAL } from '../data/catalogs.js';

// â”€â”€â”€ Badge de estado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const StatusBadge = ({ status }) => {
    const map = {
        pending: { label: 'PENDIENTE', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
        review: { label: 'EN REVISIÓN', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        finalized: { label: 'EN REVISIÓN', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
        approved: { label: 'AUTORIZADO', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
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

// â”€â”€â”€ Modal de confirmaciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    { value: 'approved', label: 'Autorizado' },
    { value: 'sent', label: 'Enviado' },
    { value: 'consolidated', label: 'Consolidado' },
    { value: 'closed', label: 'Cerrado' },
];

// â”€â”€â”€ COMPONENTE PRINCIPAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MultiBatch = ({ batchList = [], setBatchList, setRawInvoices, currentUser, finalizedInvoices = [], activeBatch = null }) => {

    const getInvoiceListTotals = (invoices, useParcialidad = true) => (invoices || []).reduce((acc, inv) => {
        const amount = useParcialidad ? (inv?.parcialidad?.importe || inv?.amount || 0) : (inv?.amount || 0);
        if (inv?.currency === 'USD') acc.totalUSD += amount;
        else acc.totalMXN += amount;
        return acc;
    }, { totalMXN: 0, totalUSD: 0 });

    const totalsMatch = (batch, invoices) => {
        if (!Array.isArray(invoices) || invoices.length === 0) return false;
        const effectiveTotals = getInvoiceListTotals(invoices);
        const fullTotals = getInvoiceListTotals(invoices, false);
        const effectiveOk = Math.abs((batch?.totalMXN || 0) - effectiveTotals.totalMXN) < 0.01
            && Math.abs((batch?.totalUSD || 0) - effectiveTotals.totalUSD) < 0.01;
        const fullOk = Math.abs((batch?.totalMXN || 0) - fullTotals.totalMXN) < 0.01
            && Math.abs((batch?.totalUSD || 0) - fullTotals.totalUSD) < 0.01;
        const countOk = !batch?.invoiceCount || batch.invoiceCount === invoices.length;
        return countOk && (effectiveOk || fullOk);
    };

    const getFallbackInvoices = (batch) => {
        if (activeBatch?.id === batch?.id && Array.isArray(activeBatch?.invoices) && activeBatch.invoices.length > 0) {
            return activeBatch.invoices;
        }

        const finalizedArr = Array.isArray(finalizedInvoices) ? finalizedInvoices : [];
        if (activeBatch?.id === batch?.id && totalsMatch(batch, finalizedArr)) {
            return finalizedArr;
        }

        return [];
    };

    // Convertir batchList del formato de App.jsx al formato interno
    const toBatchItem = (b) => {
        const hasSavedInvoiceList = Array.isArray(b.invoices) && (b.invoices.length > 0 || b.hasStoredInvoices);
        const savedInvoices = Array.isArray(b.invoices) ? b.invoices : [];
        const invoices = hasSavedInvoiceList ? savedInvoices : getFallbackInvoices(b);

        return {
            id: b.id,
            name: b.name || `Propuesta - ${formatDate(b.createdAt)}`,
            status: b.status === 'finalized' ? 'review' : (b.status || 'pending'),
            createdAt: b.createdAt || new Date().toISOString(),
            responsible: b.responsible || currentUser?.name || 'Usuario',
            invoiceCount: b.invoiceCount || invoices.length || 0,
            totalMXN: b.totalMXN || 0,
            totalUSD: b.totalUSD || 0,
            sourceIds: b.sourceIds || [],
            isConsolidation: b.isConsolidation || false,
            invoices,
            hasStoredInvoices: b.hasStoredInvoices || hasSavedInvoiceList,
            providerComments: b.providerComments || {},
        };
    };

    const [localBatches, setLocalBatches] = useState(() =>
        (batchList || []).map(toBatchItem)
    );

    // Sincronizar cuando llegan nuevos batches desde PaymentsV2
    useEffect(() => {
        setLocalBatches(prev => {
            const previousById = new Map(prev.map(b => [b.id, b]));
            return (batchList || []).map(batch => {
                const incoming = toBatchItem(batch);
                const previous = previousById.get(incoming.id);
                if (!previous) return incoming;

                return {
                    ...incoming,
                    ...previous,
                    invoices: previous.invoices?.length ? previous.invoices : incoming.invoices,
                    providerComments: {
                        ...(incoming.providerComments || {}),
                        ...(previous.providerComments || {}),
                    },
                };
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [batchList, finalizedInvoices, activeBatch]);

    const [selected, setSelected] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [statusDropOpen, setStatusDropOpen] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [detailBatch, setDetailBatch] = useState(null);
    const [collapsedDetailGroups, setCollapsedDetailGroups] = useState({});
    const [commentDialog, setCommentDialog] = useState(null);
    const [commentDraft, setCommentDraft] = useState('');
    const [showConsolidated, setShowConsolidated] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [proposalSending, setProposalSending] = useState(false);
    const [proposalProgress, setProposalProgress] = useState(0);
    const [proposalLoaderMessage, setProposalLoaderMessage] = useState('');
    const statusDropRef = useRef(null);
    const proposalTimerRef = useRef(null);
    const { toast, show: showToast } = useToast();

    // REQ-034: refresca la lista preservando estado de UI (filtros, selecciones, secciones expandidas)
    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        // Guardamos estado previo para restaurarlo si el fetch falla
        const prevSelected = new Set(selected);
        const prevSearch = searchTerm;
        const prevStatus = statusFilter;
        const prevConsolidated = showConsolidated;
        setIsRefreshing(true);
        try {
            // TODO DEC-022: reemplazar por llamada real al endpoint cuando estÃ© disponible el API de batches
            // Por ahora re-sincroniza desde la prop batchList (fuente de verdad de App.jsx)
            setLocalBatches(() => (batchList || []).map(toBatchItem));
            setSearchTerm(prevSearch);
            setStatusFilter(prevStatus);
            setShowConsolidated(prevConsolidated);
            setSelected(prevSelected);
            showToast('Lista de batches actualizada.');
        } catch {
            // Restaurar estado previo ante error (datos no se pierden)
            setSearchTerm(prevSearch);
            setStatusFilter(prevStatus);
            setShowConsolidated(prevConsolidated);
            setSelected(prevSelected);
            showToast('Error al refrescar. Intenta de nuevo.');
        } finally {
            setIsRefreshing(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRefreshing, selected, searchTerm, statusFilter, showConsolidated, batchList]);

    useEffect(() => () => {
        if (proposalTimerRef.current) clearTimeout(proposalTimerRef.current);
    }, []);

    useEffect(() => {
        const handle = (e) => {
            if (statusDropRef.current && !statusDropRef.current.contains(e.target))
                setStatusDropOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // â”€â”€ Conteo y filtrado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    const approvedBatches = useMemo(
        () => localBatches.filter(b => b.status === 'approved'),
        [localBatches]
    );

    // â”€â”€ SelecciÃ³n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    const canViewSelectedDetail = selectedBatches.length > 0;

    const selectionSummary = useMemo(() => {
        if (selectedBatches.length === 0) return null;
        return {
            invoiceCount: selectedBatches.reduce((s, b) => s + (b.invoiceCount || 0), 0),
            totalMXN: selectedBatches.reduce((s, b) => s + (b.totalMXN || 0), 0),
            totalUSD: selectedBatches.reduce((s, b) => s + (b.totalUSD || 0), 0),
        };
    }, [selectedBatches]);

    // -- Detalle individual / masivo ----------------------------------
    const getBatchInvoices = useCallback((batch) => {
        if (!batch) return [];
        if (Array.isArray(batch.invoices) && batch.invoices.length > 0) return batch.invoices;
        if (batch.isConsolidation && Array.isArray(batch.sourceIds)) {
            return localBatches
                .filter(b => batch.sourceIds.includes(b.id))
                .flatMap(b => Array.isArray(b.invoices) ? b.invoices : []);
        }
        return [];
    }, [localBatches]);

    const buildDetailPayload = useCallback((batches) => {
        const batchArr = (batches || []).filter(Boolean);
        const invoices = batchArr.flatMap(batch =>
            getBatchInvoices(batch).map(inv => ({
                ...inv,
                _batchId: batch.id,
                _batchName: batch.name,
            }))
        );
        const providerComments = batchArr.reduce((acc, batch) => ({
            ...acc,
            ...(batch.providerComments || {}),
        }), {});
        const fallbackSummary = {
            invoiceCount: batchArr.reduce((s, b) => s + (b.invoiceCount || 0), 0),
            totalMXN: batchArr.reduce((s, b) => s + (b.totalMXN || 0), 0),
            totalUSD: batchArr.reduce((s, b) => s + (b.totalUSD || 0), 0),
        };
        const invoiceSummary = {
            invoiceCount: invoices.length,
            totalMXN: invoices.filter(i => i.currency !== 'USD').reduce((s, i) => s + (i.parcialidad?.importe || i.amount || 0), 0),
            totalUSD: invoices.filter(i => i.currency === 'USD').reduce((s, i) => s + (i.parcialidad?.importe || i.amount || 0), 0),
        };
        const isMassDetail = batchArr.length > 1;
        const single = batchArr[0];

        return {
            id: isMassDetail ? `DETALLE-${batchArr.length}-BATCHES` : single?.id,
            name: isMassDetail ? `Detalle masivo de ${batchArr.length} batches` : single?.name,
            status: isMassDetail ? 'review' : single?.status,
            createdAt: isMassDetail ? new Date().toISOString() : single?.createdAt,
            responsible: isMassDetail ? currentUser?.name || 'Usuario' : single?.responsible,
            invoiceCount: invoices.length > 0 ? invoiceSummary.invoiceCount : fallbackSummary.invoiceCount,
            totalMXN: invoices.length > 0 ? invoiceSummary.totalMXN : fallbackSummary.totalMXN,
            totalUSD: invoices.length > 0 ? invoiceSummary.totalUSD : fallbackSummary.totalUSD,
            sourceIds: batchArr.map(b => b.id),
            isConsolidation: !!single?.isConsolidation && !isMassDetail,
            isMassDetail,
            invoices,
            providerComments,
            sourceBatches: batchArr,
            releaseBatch: !isMassDetail && single?.isConsolidation ? single : null,
        };
    }, [currentUser?.name, getBatchInvoices]);

    const openBatchDetail = useCallback((batches) => {
        setCollapsedDetailGroups({});
        setDetailBatch(buildDetailPayload(Array.isArray(batches) ? batches : [batches]));
    }, [buildDetailPayload]);

    const handleViewSelectedDetail = () => {
        if (!canViewSelectedDetail) return;
        openBatchDetail(selectedBatches);
    };
    // â”€â”€ Liberar consolidación â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ Enviar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleSend = () => {
        if (!approvedProposalSummary.batchCount) {
            showToast('No hay batches autorizados para enviar.');
            return;
        }

        const amountLines = [
            approvedProposalSummary.totalMXN > 0 ? `• MXN ${formatCurrency(approvedProposalSummary.totalMXN, 'MXN')}` : null,
            approvedProposalSummary.totalUSD > 0 ? `• USD ${formatCurrency(approvedProposalSummary.totalUSD, 'USD')}` : null,
        ].filter(Boolean).join('\n') || `• MXN ${formatCurrency(0, 'MXN')}`;
        const approvedProposalInvoices = approvedBatches.flatMap(batch => getBatchInvoices(batch));
        const balanceValidation = getBalanceValidationHit(approvedProposalInvoices, BALANCE_VALIDATION_STAGES.SEND_PROPOSAL);
        const balanceValidationBody = balanceValidation
            ? `\n\n${formatBalanceValidationMessage(balanceValidation, formatCurrency)}\n\nSelecciona "Enviar de todos modos" para continuar.`
            : '';

        setConfirmDialog({
            title: `¿Enviar propuesta con ${approvedProposalSummary.batchCount} batch${approvedProposalSummary.batchCount !== 1 ? 'es' : ''} autorizado${approvedProposalSummary.batchCount !== 1 ? 's' : ''}?`,
            body: `Se enviará la propuesta con:\n• ${approvedProposalSummary.providerCount} proveedor${approvedProposalSummary.providerCount !== 1 ? 'es' : ''}\n• ${approvedProposalSummary.invoiceCount} factura${approvedProposalSummary.invoiceCount !== 1 ? 's' : ''}\n${amountLines}\n\nAl confirmar, los batches autorizados se enviarán y dejarán de mostrarse en esta vista.${balanceValidationBody}`,
            confirmLabel: balanceValidation ? 'Enviar de todos modos' : 'Enviar propuesta',
            action: 'sendApprovedProposal',
            payload: { batchIds: approvedProposalSummary.batchIds },
        });
    };

    const executeSendApprovedProposal = (payload) => {
        const batchIds = payload?.batchIds || [];
        if (batchIds.length === 0) return;
        const ids = new Set(batchIds);
        const progressSteps = [12, 28, 45, 63, 78, 91, 100];

        if (proposalTimerRef.current) clearTimeout(proposalTimerRef.current);
        setProposalProgress(0);
        setProposalLoaderMessage('ENVIANDO PROPUESTA');
        setProposalSending(true);

        const runStep = (stepIndex = 0) => {
            proposalTimerRef.current = setTimeout(() => {
                const nextProgress = progressSteps[stepIndex];
                setProposalProgress(nextProgress);

                if (nextProgress < 100) {
                    runStep(stepIndex + 1);
                    return;
                }

                setProposalLoaderMessage('PROPUESTA ENVIADA');
                proposalTimerRef.current = setTimeout(() => {
                    setLocalBatches(prev => prev.filter(b => !ids.has(b.id)));
                    if (setBatchList) {
                        setBatchList(prev => (prev || []).filter(b => !ids.has(b.id)));
                    }
                    setSelected(prev => {
                        const next = new Set(prev);
                        ids.forEach(id => next.delete(id));
                        return next;
                    });
                    setProposalSending(false);
                    setProposalProgress(0);
                    setProposalLoaderMessage('');
                    showToast(`Propuesta enviada. ${batchIds.length} batch${batchIds.length !== 1 ? 'es' : ''} concluido${batchIds.length !== 1 ? 's' : ''}.`);
                }, 900);
            }, stepIndex === 0 ? 180 : 360);
        };

        runStep();
    };

    // â”€â”€ Despachador â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleConfirm = () => {
        const { action, payload } = confirmDialog;
        setConfirmDialog(null);
        if (action === 'sendApprovedProposal') executeSendApprovedProposal(payload);
        if (action === 'release') executeRelease(payload);
        if (action === 'authorizeDetailBatch') executeAuthorizeDetailBatch(payload);
        if (action === 'excludeInvoice') executeExcludeInvoice(payload);
        if (action === 'excludeBatch') executeExcludeBatch(payload);
    };

    const getInvoiceBankInfo = (invoice) => {
        const meta = invoice?.meta || {};
        const bankId = invoice?.bankId || meta.banco || meta.bancos || meta.banco_id || '';
        const bankMeta = CATALOG_BANCOS_INICIAL.find(b => String(b.id).trim() === String(bankId).trim());
        const bankName = meta.nombre_de_banco || meta.banco_nombre || meta.bank_name || bankMeta?.bank || '';
        const account = meta.bank_account || meta.cuenta_bancaria || meta.cuenta || meta.clabe || meta.account || bankMeta?.bank_account || '';
        return { bankName, account, bankId };
    };

    const getInvoiceAmount = (invoice) => invoice?.parcialidad?.importe || invoice?.amount || 0;

    const getInvoiceIdentity = (invoice) => {
        const meta = invoice?.meta || {};
        return String(meta.invoice || invoice?.id || invoice?._detailIndex || '').trim();
    };

    const isSameInvoice = (left, right) => {
        const leftIdentity = getInvoiceIdentity(left);
        const rightIdentity = getInvoiceIdentity(right);
        return !!leftIdentity && leftIdentity === rightIdentity;
    };

    const recalculateBatchTotals = (invoices) => {
        const totals = getInvoiceListTotals(invoices);
        return {
            invoiceCount: invoices.length,
            totalMXN: totals.totalMXN,
            totalUSD: totals.totalUSD,
        };
    };

    const buildExcludedInvoiceForUniverse = (invoice, batchId) => {
        const {
            _batchId,
            _batchName,
            _detailIndex,
            _authStatus,
            ...cleanInvoice
        } = invoice || {};

        return {
            ...cleanInvoice,
            status: 'pending',
            batchExclusion: {
                status: 'excluded',
                batchId,
                excludedAt: new Date().toISOString(),
            },
            meta: {
                ...(cleanInvoice.meta || {}),
                exclusion_status: 'excluded_from_batch',
                excluded_from_batch_id: batchId,
            },
        };
    };

    const handleExcludeInvoice = (invoice) => {
        const meta = invoice?.meta || {};
        const invoiceLabel = meta.invoice || invoice?.id || 'seleccionada';
        const providerLabel = invoice?.providerName || meta.name || 'Sin proveedor';

        setConfirmDialog({
            title: `¿Excluir la factura ${invoiceLabel}?`,
            body: `Proveedor: ${providerLabel}\n\nEsta accion quitara la factura del batch y recalculara los totales. La exclusion es confirmativa para evitar cambios accidentales en la propuesta.`,
            confirmLabel: 'Excluir factura',
            action: 'excludeInvoice',
            payload: {
                batchId: invoice?._batchId || detailBatch?.id,
                invoice,
            },
        });
    };

    const executeExcludeInvoice = ({ batchId, invoice } = {}) => {
        if (!batchId || !invoice) return;

        const removeInvoiceFromBatch = (batch) => {
            if (batch.id !== batchId) return batch;
            const currentInvoices = Array.isArray(batch.invoices) ? batch.invoices : [];
            const nextInvoices = currentInvoices.filter(item => !isSameInvoice(item, invoice));
            return {
                ...batch,
                invoices: nextInvoices,
                hasStoredInvoices: true,
                ...recalculateBatchTotals(nextInvoices),
            };
        };

        setLocalBatches(prev => prev.map(removeInvoiceFromBatch));
        if (setBatchList) {
            setBatchList(prev => (prev || []).map(removeInvoiceFromBatch));
        }

        if (setRawInvoices) {
            const excludedInvoice = buildExcludedInvoiceForUniverse(invoice, batchId);
            setRawInvoices(prev => {
                const current = Array.isArray(prev) ? prev : [];
                const withoutDuplicate = current.filter(item => !isSameInvoice(item, excludedInvoice));
                return [excludedInvoice, ...withoutDuplicate];
            });
        }

        setDetailBatch(prev => {
            if (!prev) return prev;
            const nextInvoices = (prev.invoices || []).filter(item =>
                !((item._batchId || prev.id) === batchId && isSameInvoice(item, invoice))
            );
            return {
                ...prev,
                invoices: nextInvoices,
                sourceBatches: (prev.sourceBatches || []).map(removeInvoiceFromBatch),
                releaseBatch: prev.releaseBatch ? removeInvoiceFromBatch(prev.releaseBatch) : prev.releaseBatch,
                ...recalculateBatchTotals(nextInvoices),
            };
        });

        showToast(`Factura ${getInvoiceIdentity(invoice)} excluida del batch.`);
    };

    const handleExcludeBatch = () => {
        if (!detailBatch?.invoices?.length) {
            showToast('Este batch no tiene facturas para excluir.');
            return;
        }

        const batchIds = detailBatch.sourceIds?.length ? detailBatch.sourceIds : [detailBatch.id];
        const batchLabel = detailBatch.isMassDetail
            ? `${batchIds.length} batches seleccionados`
            : detailBatch.name || detailBatch.id;

        setConfirmDialog({
            title: `¿Excluir Batch "${batchLabel}"?`,
            body: `Se quitará el batch de la lista de propuestas y sus ${detailBatch.invoices.length} factura${detailBatch.invoices.length !== 1 ? 's' : ''} regresarán al universo de facturas con la etiqueta Excluida.\n\nEsta acción es confirmativa para evitar cambios accidentales en la propuesta.`,
            confirmLabel: 'Excluir Batch',
            action: 'excludeBatch',
            payload: {
                batchIds,
                invoices: detailBatch.invoices,
                batchId: detailBatch.id,
            },
        });
    };

    const executeExcludeBatch = ({ batchIds = [], invoices = [], batchId } = {}) => {
        const ids = new Set((batchIds.length ? batchIds : [batchId]).filter(Boolean));
        const invoiceList = Array.isArray(invoices) ? invoices : [];
        if (ids.size === 0 || invoiceList.length === 0) return;

        const excludedInvoices = invoiceList.map(invoice =>
            buildExcludedInvoiceForUniverse(invoice, invoice?._batchId || batchId)
        );

        if (setRawInvoices) {
            setRawInvoices(prev => {
                const current = Array.isArray(prev) ? prev : [];
                const withoutDuplicates = current.filter(item =>
                    !excludedInvoices.some(excluded => isSameInvoice(item, excluded))
                );
                return [...excludedInvoices, ...withoutDuplicates];
            });
        }

        setLocalBatches(prev => prev.filter(batch => !ids.has(batch.id)));
        if (setBatchList) {
            setBatchList(prev => (prev || []).filter(batch => !ids.has(batch.id)));
        }
        setSelected(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.delete(id));
            return next;
        });
        setDetailBatch(null);

        showToast(`Batch excluido. ${excludedInvoices.length} factura${excludedInvoices.length !== 1 ? 's' : ''} regresaron al universo.`);
    };

    const approvedProposalSummary = useMemo(() => {
        const providerKeys = new Set();
        const summary = approvedBatches.reduce((acc, batch) => {
            const invoices = getBatchInvoices(batch);
            acc.batchIds.push(batch.id);
            acc.batchCount += 1;

            if (invoices.length === 0) {
                acc.invoiceCount += batch.invoiceCount || 0;
                acc.totalMXN += batch.totalMXN || 0;
                acc.totalUSD += batch.totalUSD || 0;
                return acc;
            }

            invoices.forEach(inv => {
                const meta = inv.meta || {};
                const company = meta.company || inv.company || 'Sin compañía';
                const provider = inv.providerName || meta.name || meta.supplier_id || meta.vendor_id || 'Sin proveedor';
                const currency = inv.currency === 'USD' ? 'USD' : 'MXN';
                const amount = getInvoiceAmount(inv);

                providerKeys.add(`${company}::${provider}`);
                acc.invoiceCount += 1;
                if (currency === 'USD') acc.totalUSD += amount;
                else acc.totalMXN += amount;
            });

            return acc;
        }, {
            batchIds: [],
            batchCount: 0,
            invoiceCount: 0,
            totalMXN: 0,
            totalUSD: 0,
        });

        return {
            ...summary,
            providerCount: providerKeys.size,
        };
    }, [approvedBatches, getBatchInvoices]);

    const canSendProposal = approvedProposalSummary.batchCount > 0 && !proposalSending;

    const detailGroups = useMemo(() => {
        if (!detailBatch?.invoices?.length) return [];
        const groups = new Map();

        detailBatch.invoices.forEach((inv, idx) => {
            const meta = inv.meta || {};
            const company = meta.company || inv.company || 'Sin compañía';
            const provider = inv.providerName || meta.name || 'Sin proveedor';
            const key = `${company}::${provider}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    company,
                    provider,
                    invoices: [],
                    batchIds: new Set(),
                    totalMXN: 0,
                    totalUSD: 0,
                });
            }
            const group = groups.get(key);
            const amount = getInvoiceAmount(inv);
            group.invoices.push({ ...inv, _detailIndex: idx });
            if (inv._batchId) group.batchIds.add(inv._batchId);
            if (inv.currency === 'USD') group.totalUSD += amount;
            else group.totalMXN += amount;
        });

        return Array.from(groups.values())
            .map(group => ({
                ...group,
                batchIds: Array.from(group.batchIds),
                comment: detailBatch.providerComments?.[group.key] || '',
            }))
            .sort((a, b) =>
                `${a.company} ${a.provider}`.localeCompare(`${b.company} ${b.provider}`)
            );
    }, [detailBatch]);

    const toggleDetailGroup = (groupKey) => {
        setCollapsedDetailGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
    };

    const updateBatchStatus = useCallback((batchIds, status) => {
        const ids = new Set(batchIds);
        setLocalBatches(prev => prev.map(b => ids.has(b.id) ? { ...b, status } : b));
        if (setBatchList) {
            setBatchList(prev => (prev || []).map(b => ids.has(b.id) ? { ...b, status } : b));
        }
    }, [setBatchList]);

    const updateProviderComment = useCallback((batchIds, groupKey, value) => {
        const ids = new Set((batchIds || []).filter(Boolean));
        const comment = value.trim();
        const applyComment = (batch) => {
            if (!ids.has(batch.id)) return batch;
            const providerComments = { ...(batch.providerComments || {}) };
            if (comment) providerComments[groupKey] = comment;
            else delete providerComments[groupKey];
            return { ...batch, providerComments };
        };

        setLocalBatches(prev => prev.map(applyComment));
        if (setBatchList) {
            setBatchList(prev => (prev || []).map(applyComment));
        }
    }, [setBatchList]);

    const openProviderCommentModal = (group) => {
        setCommentDialog({
            groupKey: group.key,
            company: group.company,
            provider: group.provider,
            invoiceCount: group.invoices.length,
            batchIds: group.batchIds?.length ? group.batchIds : detailBatch?.sourceIds || [],
        });
        setCommentDraft(group.comment || '');
    };

    const closeProviderCommentModal = () => {
        setCommentDialog(null);
        setCommentDraft('');
    };

    const handleSaveProviderComment = () => {
        if (!commentDialog) return;
        const comment = commentDraft.trim();
        updateProviderComment(commentDialog.batchIds, commentDialog.groupKey, comment);
        setDetailBatch(prev => {
            if (!prev) return prev;
            const providerComments = { ...(prev.providerComments || {}) };
            if (comment) providerComments[commentDialog.groupKey] = comment;
            else delete providerComments[commentDialog.groupKey];
            return { ...prev, providerComments };
        });
        closeProviderCommentModal();
        showToast(comment ? 'Comentario guardado.' : 'Comentario eliminado.');
    };

    const executeAuthorizeDetailBatch = () => {
        if (!detailBatch?.id || detailBatch.isMassDetail) return;
        updateBatchStatus([detailBatch.id], 'approved');
        setDetailBatch(prev => prev ? { ...prev, status: 'approved' } : prev);
        showToast(`Batch ${detailBatch.id} autorizado.`);
    };

    const handleAuthorizeDetailBatch = () => {
        if (!detailBatch?.id || detailBatch.isMassDetail) return;
        const balanceValidation = getBalanceValidationHit(detailBatch.invoices || [], BALANCE_VALIDATION_STAGES.AUTHORIZE_PROPOSAL);
        if (!balanceValidation) {
            executeAuthorizeDetailBatch();
            return;
        }

        setConfirmDialog({
            title: 'Validacion de balance antes de autorizar',
            body: `${formatBalanceValidationMessage(balanceValidation, formatCurrency)}\n\nSelecciona "Autorizar de todos modos" para continuar.`,
            confirmLabel: 'Autorizar de todos modos',
            action: 'authorizeDetailBatch',
            payload: { batchId: detailBatch.id },
        });
    };

    const singleDetailGroup = detailGroups.length === 1 ? detailGroups[0] : null;

    const renderProviderCommentButton = (group, compact = false) => (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                openProviderCommentModal(group);
            }}
            title={group.comment || 'Agregar comentarios del proveedor'}
            className={`inline-flex items-center gap-1.5 rounded-lg border font-black transition-colors whitespace-nowrap ${compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-[10px]'} ${group.comment
                ? 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}
        >
            <MessageSquare size={compact ? 11 : 12} />
            {group.comment ? 'Editar comentarios' : 'Agregar comentarios'}
        </button>
    );

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

            {proposalSending && (
                <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full mx-4 text-center">
                        <div className={`mx-auto mb-4 w-12 h-12 rounded-2xl flex items-center justify-center ${proposalProgress >= 100 ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                            {proposalProgress >= 100 ? (
                                <CheckCircle2 size={24} className="text-emerald-600" />
                            ) : (
                                <RefreshCw size={24} className="text-blue-600 animate-spin" />
                            )}
                        </div>
                        <p className="text-sm font-black text-slate-800 uppercase tracking-wide">
                            {proposalLoaderMessage || 'ENVIANDO PROPUESTA'}
                        </p>
                        <p className="text-3xl font-black text-slate-800 tabular-nums mt-3">
                            {proposalProgress}%
                        </p>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
                            <div
                                className={`h-full rounded-full transition-all duration-300 ${proposalProgress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                style={{ width: `${proposalProgress}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {commentDialog && (
                <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in"
                    onClick={closeProviderCommentModal}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-lg w-full mx-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div className="flex items-start gap-3 min-w-0">
                                <div className="p-2 bg-blue-50 rounded-xl shrink-0">
                                    <MessageSquare size={18} className="text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Comentarios del proveedor</p>
                                    <h3 className="text-sm font-black text-slate-800 mt-1 truncate">{commentDialog.provider}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 truncate">{commentDialog.company}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                                        {commentDialog.invoiceCount} factura{commentDialog.invoiceCount !== 1 ? 's' : ''} relacionada{commentDialog.invoiceCount !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeProviderCommentModal}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                                <X size={18} />
                            </button>
                        </div>

                        <textarea
                            autoFocus
                            value={commentDraft}
                            onChange={e => setCommentDraft(e.target.value)}
                            placeholder="Agregar comentario para este proveedor..."
                            className="w-full min-h-[140px] resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                        />

                        <div className="flex flex-wrap justify-end gap-2 mt-4">
                            <button onClick={closeProviderCommentModal}
                                className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button onClick={() => setCommentDraft('')}
                                className="px-4 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                                Limpiar
                            </button>
                            <button onClick={handleSaveProviderComment}
                                className="px-4 py-2 text-xs font-black text-white rounded-lg transition-colors shadow-sm"
                                style={{ backgroundColor: HS.blueBase }}>
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* â”€â”€ HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="shrink-0 flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
                <div className="hidden">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                            Lista de propuestas de pago
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Gestión y consolidación de lotes para envío a aprobación
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* REQ-034: botÃ³n refresco - preserva filtros y selecciones activas */}
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        title="Refrescar lista de batches"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                        {isRefreshing ? 'Actualizando...' : 'Refrescar'}
                    </button>
                    <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                        <Layers size={11} />
                        {activeBatchCount} Batches Activos
                    </span>
                </div>
            </div>

            {/* â”€â”€ BARRA DE HERRAMIENTAS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

                {/* Ver detalle */}
                <button
                    onClick={handleViewSelectedDetail}
                    disabled={!canViewSelectedDetail}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black border rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={canViewSelectedDetail
                        ? { borderColor: HS.blueBase, color: HS.blueBase, backgroundColor: '#e0f4f9' }
                        : { borderColor: '#cbd5e1', color: '#94a3b8', backgroundColor: '#f8fafc' }
                    }
                    title="Selecciona uno o más batches para ver el detalle"
                >
                    <Eye size={14} />
                    VER DETALLE {selected.size > 0 ? `(${selected.size})` : ''}
                </button>

                {/* Enviar */}
                <button
                    onClick={handleSend}
                    disabled={!canSendProposal}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white rounded-lg transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    style={canSendProposal
                        ? { background: `linear-gradient(135deg, ${HS.blueBase}, ${HS.tealDark})` }
                        : { backgroundColor: '#94a3b8' }
                    }
                >
                    <Send size={14} />
                    ENVIAR PROPUESTA {approvedProposalSummary.batchCount > 0 ? `(${approvedProposalSummary.batchCount})` : ''}
                </button>
            </div>

            {/* â”€â”€ PANEL DE SELECCIÃ“N ACTIVA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

            {/* â”€â”€ TABLA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <div className="overflow-auto h-full flex flex-col">

                    {localBatches.length === 0 ? (
                        /* Estado vacÃ­o */
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-20">
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <Inbox size={36} className="text-slate-300" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-500">Sin batches generados</p>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Ve a <span className="font-semibold">Gestión Pagos</span>, autoriza facturas y presiona <span className="font-semibold">GENERAR BATCH</span>.
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
                                                    <span className="text-slate-300">-</span>
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
                                                        onClick={() => openBatchDetail(batch)}
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

            {/* â”€â”€ PIE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                            { cls: 'bg-emerald-500', label: 'Autorizado' },
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

            {/* MODAL DETALLE */}
            {detailBatch && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
                    onClick={() => setDetailBatch(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-[1400px] w-[min(98vw,1400px)] max-h-[86vh] mx-2 flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4 mb-4 shrink-0">
                            <div className="min-w-0">
                                <p className="text-xs font-mono text-slate-400 truncate">{detailBatch.id}</p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2 min-w-0">
                                    <h3 className="text-base font-black text-slate-800 leading-snug truncate">{detailBatch.name}</h3>
                                    {singleDetailGroup && (
                                        <>
                                            <span className="text-slate-300">/</span>
                                            <span className="text-xs font-black text-slate-700 uppercase tracking-wide truncate max-w-[320px]" title={singleDetailGroup.provider}>
                                                {singleDetailGroup.provider}
                                            </span>
                                            {renderProviderCommentButton(singleDetailGroup, true)}
                                        </>
                                    )}
                                </div>
                                {detailBatch.isMassDetail && (
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        Detalle masivo de {detailBatch.sourceBatches?.length || 0} batches seleccionados
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setDetailBatch(null)}
                                className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors shrink-0">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4 shrink-0">
                            {[
                                { label: 'Facturas', value: `${detailBatch.invoiceCount} documentos` },
                                { label: 'Estado', value: detailBatch.isMassDetail ? 'DETALLE MASIVO' : <StatusBadge status={detailBatch.status} /> },
                                { label: 'Responsable', value: detailBatch.responsible },
                                { label: 'Fecha', value: detailBatch.isMassDetail ? 'Selección actual' : formatDate(detailBatch.createdAt) },
                                { label: 'Total MXN', value: formatCurrency(detailBatch.totalMXN) },
                                { label: 'Total USD', value: formatCurrency(detailBatch.totalUSD, 'USD'), highlight: detailBatch.totalUSD > 0 },
                            ].map(({ label, value, highlight }) => (
                                <div key={label} className="bg-slate-50 rounded-xl p-3 min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 truncate">{label}</p>
                                    <div className={`text-xs font-bold truncate ${highlight ? 'text-blue-600' : 'text-slate-700'}`}>{value}</div>
                                </div>
                            ))}
                        </div>

                        {detailBatch.sourceIds?.length > 1 && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 shrink-0">
                                <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Layers size={10} /> Batches incluidos
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {detailBatch.sourceIds.map(id => (
                                        <span key={id} className="font-mono text-[9px] bg-white text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full">{id}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="border border-slate-200 rounded-xl overflow-hidden flex-1 min-h-[260px]">
                            <div className="overflow-auto h-full">
                                <table className="w-full min-w-[1140px] text-left text-xs">
                                    <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                                        <tr className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                            {detailBatch.isMassDetail && <th className="px-3 py-3">Batch</th>}
                                            <th className="px-3 py-3">Proveedor</th>
                                            <th className="px-3 py-3">ID Prov.</th>
                                            <th className="px-3 py-3">Factura</th>
                                            <th className="px-3 py-3">Vencimiento</th>
                                            <th className="px-3 py-3">Moneda</th>
                                            <th className="px-3 py-3 text-right">Importe</th>
                                            <th className="px-3 py-3">Banco</th>
                                            <th className="px-3 py-3">Cuenta</th>
                                            <th className="px-3 py-3 text-center">Accion</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {detailGroups.length === 0 ? (
                                            <tr>
                                                <td colSpan={detailBatch.isMassDetail ? 10 : 9} className="px-4 py-12 text-center text-slate-400">
                                                    Este batch no tiene detalle de facturas guardado. Genera nuevamente el batch desde Gestión de Pagos para conservar el detalle.
                                                </td>
                                            </tr>
                                        ) : detailGroups.map(group => {
                                            const isCollapsed = collapsedDetailGroups[group.key];
                                            return (
                                                <Fragment key={group.key}>
                                                    <tr className="bg-slate-50/80">
                                                        <td colSpan={detailBatch.isMassDetail ? 10 : 9} className="px-3 py-2">
                                                            <div className="w-full flex items-center gap-2">
                                                                <button
                                                                    onClick={() => toggleDetailGroup(group.key)}
                                                                    className="min-w-0 flex-1 flex items-center gap-2 text-left"
                                                                >
                                                                    <ChevronDown size={13} className={`text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{group.company}</span>
                                                                    <span className="text-slate-300">/</span>
                                                                    <span className="text-[10px] font-bold text-slate-600 truncate">{group.provider}</span>
                                                                    <span className="ml-auto text-[9px] font-black text-slate-400">{group.invoices.length} factura{group.invoices.length !== 1 ? 's' : ''}</span>
                                                                    {group.totalMXN > 0 && <span className="text-[9px] font-mono text-slate-500">{formatCurrency(group.totalMXN, 'MXN')}</span>}
                                                                    {group.totalUSD > 0 && <span className="text-[9px] font-mono text-blue-600">{formatCurrency(group.totalUSD, 'USD')}</span>}
                                                                </button>
                                                                {!singleDetailGroup && renderProviderCommentButton(group, true)}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {!isCollapsed && group.invoices.map((inv) => {
                                                        const bank = getInvoiceBankInfo(inv);
                                                        const meta = inv.meta || {};
                                                        return (
                                                            <tr key={`${inv._batchId || detailBatch.id}-${inv.id || meta.invoice || inv._detailIndex}`} className="hover:bg-slate-50/80 transition-colors">
                                                                {detailBatch.isMassDetail && (
                                                                    <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">{inv._batchId}</td>
                                                                )}
                                                                <td className="px-3 py-2 font-bold text-slate-700 max-w-[220px] truncate" title={inv.providerName || meta.name}>{inv.providerName || meta.name || ''}</td>
                                                                <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">{meta.supplier_id || meta.vendor_id || meta.vendorId || ''}</td>
                                                                <td className="px-3 py-2 font-mono font-bold text-slate-700 whitespace-nowrap">{meta.invoice || inv.id || ''}</td>
                                                                <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatDate(inv.dueDate)}</td>
                                                                <td className="px-3 py-2 font-bold text-slate-400">{inv.currency || 'MXN'}</td>
                                                                <td className="px-3 py-2 text-right font-black text-slate-800 whitespace-nowrap">{formatCurrency(getInvoiceAmount(inv), inv.currency || 'MXN')}</td>
                                                                <td className="px-3 py-2 text-slate-600 max-w-[180px] truncate" title={bank.bankName}>{bank.bankName}</td>
                                                                <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">{bank.account}</td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleExcludeInvoice(inv)}
                                                                        title="Excluir factura del batch"
                                                                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-rose-100 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 transition-colors"
                                                                    >
                                                                        <X size={13} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 shrink-0">
                            {detailBatch.invoices?.length > 0 && (
                                <button
                                    onClick={handleExcludeBatch}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors"
                                >
                                    <X size={12} /> Excluir Batch
                                </button>
                            )}
                            {detailBatch.releaseBatch && detailBatch.status !== 'sent' && detailBatch.status !== 'closed' && (
                                <button
                                    onClick={() => { const batchToRelease = detailBatch.releaseBatch; setDetailBatch(null); handleReleaseConsolidation(batchToRelease); }}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors"
                                >
                                    <Unlock size={12} /> Liberar Consolidación
                                </button>
                            )}
                            {!detailBatch.isMassDetail && detailBatch.status !== 'approved' && detailBatch.status !== 'sent' && detailBatch.status !== 'closed' && (
                                <button
                                    onClick={handleAuthorizeDetailBatch}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white rounded-lg transition-colors"
                                    style={{ backgroundColor: HS.blueBase }}
                                >
                                    <CheckCircle2 size={12} /> AUTORIZAR
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




