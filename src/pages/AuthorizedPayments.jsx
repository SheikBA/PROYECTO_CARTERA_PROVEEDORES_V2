import { useEffect, useMemo, useState } from 'react';
import {
    Building2,
    Download,
    Search,
    ChevronLeft,
    ChevronRight,
    ShieldAlert,
    Users,
    FileText,
    Tag,
    FolderPlus,
    CheckCircle2,
    RefreshCw,
    Send,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Pencil,
    Save,
} from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { formatCurrency } from '../utils/formatters.js';

const PAGE_SIZE = 15;

const H2H_PROCESS_STEPS = [
    'Generando archivo H2H',
    'Ejecutando accion .BAT',
    'Validando respuesta bancaria',
    'Migrando registros',
];

const LOCAL_PAYMENT_BANKS = [
    { id: 'BBVA-MXN-01', bank: 'BANCOMER', bank_account: '', currency_code: 'MXN', company: 'MULTI', tipo: 'H2H', description: 'BANCOMER MXN' },
    { id: 'BBVA-USD-01', bank: 'BANCOMER', bank_account: '', currency_code: 'USD', company: 'MULTI', tipo: 'H2H', description: 'BANCOMER USD' },
];

const normalizeText = (value = '') =>
    String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();

const getInvoiceRowId = (invoice) =>
    String(
        invoice?.id ||
        invoice?.uuid ||
        invoice?.meta?.fiscal_folio ||
        invoice?.meta?.invoice ||
        `${invoice?.providerName || 'proveedor'}-${invoice?.amount || 0}-${invoice?.currency || ''}`
    );

const getMeta = (invoice) => invoice?.meta || {};

const getProviderKey = (invoice) =>
    normalizeText(invoice?.providerName || getMeta(invoice).name || getMeta(invoice).provider || 'Sin proveedor');

const getDeclaredBankName = (invoice) => {
    const meta = getMeta(invoice);
    return (
        meta.nombre_de_banco ||
        meta.banco_nombre ||
        meta.bank_name ||
        invoice?.nombre_de_banco ||
        ''
    );
};

const getRefValue = (invoice, key) => {
    const meta = getMeta(invoice);
    if (key === 'ref1') return invoice?.ref1 || meta.transac_ref_c || meta.ref1 || '';
    return invoice?.ref2 || meta.transac_num_c || meta.ref2 || '';
};

const getPaymentLabel = (invoice) => {
    const meta = getMeta(invoice);
    if (invoice?.label || meta.etiqueta || meta.label) return invoice?.label || meta.etiqueta || meta.label;
    if (meta.hasFiscalError) return 'Error fiscal';
    if (invoice?.meta?.isPartial || invoice?.partialAmount) return 'Parcial';
    return 'Sin etiqueta';
};

const getPaymentStatus = (invoice) => {
    const status = invoice?.status || invoice?._authStatus || getMeta(invoice).estado_vfdi || 'pending';
    const normalized = normalizeText(status);
    if (normalized === 'PENDING') return 'Pendiente';
    if (normalized === 'AUTHORIZED') return 'Autorizado';
    if (normalized === 'REVIEW') return 'En revision';
    if (normalized === 'VIGENTE') return 'Vigente';
    return status;
};

const getStatusBadgeTone = (status) => {
    const normalized = normalizeText(status);
    if (normalized.includes('AUTORIZ') || normalized.includes('VIGENTE') || normalized.includes('PROCES')) return 'success';
    if (normalized.includes('RECHAZ') || normalized.includes('ERROR')) return 'danger';
    return 'pending';
};

const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const normalizeSortValue = (value) => {
    if (typeof value === 'number') return value;
    if (value === null || value === undefined) return '';
    return normalizeText(value);
};

const paymentGroupButtonStyle = (disabled = false) => ({
    background: disabled
        ? 'linear-gradient(#f8fafc,#f8fafc) padding-box, linear-gradient(135deg,#cbd5e1,#e2e8f0) border-box'
        : 'linear-gradient(#ffffff,#ffffff) padding-box, linear-gradient(135deg,#0082a6,#10b981,#6366f1) border-box',
});

const CreatePaymentGroupAction = ({ onClick, disabled = false, tooltip = 'Crear grupo de pago' }) => (
    <div className="relative inline-flex group">
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label="Crear grupo de pago"
            style={paymentGroupButtonStyle(disabled)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-lg border-2 border-transparent text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:translate-y-0"
        >
            <FolderPlus size={16} />
        </button>
        <span
            role="tooltip"
            className="pointer-events-none absolute right-0 top-full z-30 mt-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
        >
            {tooltip}
        </span>
    </div>
);

const EditPaymentAction = ({ isEditing, onClick, disabled = false }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={isEditing ? 'Guardar cambios' : 'Editar pago'}
        title={isEditing ? 'Guardar datos' : 'Editar banco pagador y tipo de pago'}
        className={`inline-flex h-8 items-center justify-center gap-1 rounded-lg border text-[10px] font-black uppercase tracking-wide shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${
            isEditing
                ? 'min-w-[86px] border-emerald-200 bg-emerald-600 px-2 text-white focus:ring-emerald-300 hover:bg-emerald-700'
                : 'w-8 border-slate-200 bg-white text-slate-600 focus:ring-primary/20 hover:border-primary/30 hover:text-primary disabled:bg-slate-50 disabled:text-slate-300'
        }`}
    >
        {isEditing ? (
            <>
                <Save size={14} />
                <span>Guardar</span>
            </>
        ) : (
            <Pencil size={15} />
        )}
    </button>
);

const AuthorizedPayments = ({ finalizedInvoices, setFinalizedInvoices, setTrackingData, setRejectedInvoices, activeBatch, catalogs }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'provider', direction: 'asc' });
    const [grupoFilter, setGrupoFilter] = useState('');
    const [paymentGroupFilter, setPaymentGroupFilter] = useState('');
    const [paymentGroupNotice, setPaymentGroupNotice] = useState('');
    const [selectedRows, setSelectedRows] = useState({});
    const [bankOverrides, setBankOverrides] = useState({});
    const [paymentTypeOverrides, setPaymentTypeOverrides] = useState({});
    const [paymentGroupIds, setPaymentGroupIds] = useState({});
    const [processedRows, setProcessedRows] = useState({});
    const [paymentGroupConfirm, setPaymentGroupConfirm] = useState(null);
    const [paymentGroupProgress, setPaymentGroupProgress] = useState(null);
    const [h2hConfirm, setH2hConfirm] = useState(null);
    const [h2hProcessProgress, setH2hProcessProgress] = useState(null);
    const [editRowConfirm, setEditRowConfirm] = useState(null);
    const [editingRows, setEditingRows] = useState({});
    const [h2hProcessedGroupIds, setH2hProcessedGroupIds] = useState({});
    const [isBankSummaryVisible, setIsBankSummaryVisible] = useState(true);

    const CATALOG_BANCOS = Array.isArray(catalogs?.banks) ? catalogs.banks : [];
    const CATALOG_GRUPOS = Array.isArray(catalogs?.groups) ? catalogs.groups : [];
    const invoicesBase = useMemo(() => finalizedInvoices || [], [finalizedInvoices]);

    const bankOptions = useMemo(() => {
        const map = new Map();
        const addBank = (bank) => {
            if (!bank?.id) return;
            if (!map.has(String(bank.id))) map.set(String(bank.id), { ...bank, id: String(bank.id) });
        };

        [...CATALOG_BANCOS, ...LOCAL_PAYMENT_BANKS].forEach(addBank);

        invoicesBase.forEach((invoice) => {
            const declaredName = getDeclaredBankName(invoice);
            if (!declaredName) return;

            const normalizedDeclared = normalizeText(declaredName);
            const currency = invoice?.currency || getMeta(invoice).currency_code || 'MXN';
            const existing = Array.from(map.values()).find((bank) => {
                const bankName = normalizeText(bank.bank);
                const description = normalizeText(bank.description);
                const sameCurrency = !bank.currency_code || normalizeText(bank.currency_code) === normalizeText(currency);
                return sameCurrency && (
                    bankName === normalizedDeclared ||
                    normalizedDeclared.includes(bankName) ||
                    description.includes(normalizedDeclared)
                );
            });

            if (existing) return;

            addBank({
                id: String(getMeta(invoice).banco_id || `${normalizedDeclared}-${currency}`),
                bank: declaredName,
                bank_account: '',
                currency_code: currency,
                company: getMeta(invoice).company || invoice?.company || '',
                tipo: 'H2H',
                description: `${declaredName} ${currency}`,
            });
        });

        return Array.from(map.values()).sort((a, b) => `${a.bank} ${a.currency_code}`.localeCompare(`${b.bank} ${b.currency_code}`));
    }, [CATALOG_BANCOS, invoicesBase]);

    const findBank = (bankId) => bankOptions.find((bank) => String(bank.id) === String(bankId));

    const resolveAssociatedBankId = (invoice) => {
        const rawBankId = invoice?.bankId ? String(invoice.bankId) : '';
        const rawMetaBankId = getMeta(invoice).banco_id ? String(getMeta(invoice).banco_id) : '';
        const declaredName = getDeclaredBankName(invoice);
        const rawIsPending = !rawBankId || normalizeText(rawBankId).startsWith('PENDIENTE');

        if (!rawIsPending && findBank(rawBankId)) return rawBankId;
        if (rawMetaBankId && findBank(rawMetaBankId)) return rawMetaBankId;

        if (declaredName) {
            const normalizedDeclared = normalizeText(declaredName);
            const currency = invoice?.currency || getMeta(invoice).currency_code || '';
            const matchWithCurrency = bankOptions.find((bank) => {
                const bankName = normalizeText(bank.bank);
                const description = normalizeText(bank.description);
                const sameCurrency = !currency || !bank.currency_code || normalizeText(bank.currency_code) === normalizeText(currency);
                return sameCurrency && (
                    bankName === normalizedDeclared ||
                    normalizedDeclared.includes(bankName) ||
                    description.includes(normalizedDeclared)
                );
            });

            if (matchWithCurrency) return matchWithCurrency.id;
        }

        return '';
    };

    const providerDefaultBankIds = useMemo(() => {
        const providerBanks = new Map();

        invoicesBase.forEach((invoice) => {
            const bankId = resolveAssociatedBankId(invoice);
            if (!bankId) return;

            const providerKey = getProviderKey(invoice);
            if (!providerBanks.has(providerKey)) providerBanks.set(providerKey, new Set());
            providerBanks.get(providerKey).add(String(bankId));
        });

        const defaults = new Map();
        providerBanks.forEach((bankIds, providerKey) => {
            if (bankIds.size === 1) {
                defaults.set(providerKey, Array.from(bankIds)[0]);
            }
        });

        return defaults;
    }, [invoicesBase, bankOptions]);

    const getDefaultBankId = (invoice) => {
        return providerDefaultBankIds.get(getProviderKey(invoice)) || '';
    };

    const getEffectiveBankId = (invoice) => {
        const rowId = getInvoiceRowId(invoice);
        return bankOverrides[rowId] ?? getDefaultBankId(invoice);
    };

    const getBankName = (bankId) => findBank(bankId)?.bank || bankId || 'Sin banco pagador';

    const getEffectivePaymentType = (invoice) => {
        const rowId = getInvoiceRowId(invoice);
        if (paymentTypeOverrides[rowId]) return paymentTypeOverrides[rowId];
        const bank = findBank(getEffectiveBankId(invoice));
        return bank?.tipo === 'MANUAL' ? 'Manual' : 'H2H';
    };

    const gruposDisponibles = useMemo(() => {
        const grupos = new Set(invoicesBase.map(inv => inv.group || getMeta(inv).group_proveedor || 'Sin Grupo'));
        return Array.from(grupos).sort();
    }, [invoicesBase]);

    const paymentGroupOptions = useMemo(() => (
        Array.from(new Set(Object.values(paymentGroupIds).filter(Boolean))).sort()
    ), [paymentGroupIds]);

    const invoicesParaKpi = useMemo(() => {
        return invoicesBase.filter(inv => {
            const rowId = getInvoiceRowId(inv);
            const groupName = inv.group || getMeta(inv).group_proveedor || 'Sin Grupo';
            const currentPaymentGroupId = paymentGroupIds[rowId] || '';
            const matchGrupo = !grupoFilter || groupName === grupoFilter;
            const matchPaymentGroup = !paymentGroupFilter || currentPaymentGroupId === paymentGroupFilter;
            return matchGrupo && matchPaymentGroup;
        });
    }, [invoicesBase, grupoFilter, paymentGroupFilter, paymentGroupIds]);

    const kpis = useMemo(() => {
        const mxn = invoicesParaKpi.filter(i => i.currency === 'MXN').reduce((s, i) => s + i.amount, 0);
        const usd = invoicesParaKpi.filter(i => i.currency === 'USD').reduce((s, i) => s + i.amount, 0);
        const providers = new Set(invoicesParaKpi.map(i => i.providerName)).size;
        const errors = invoicesParaKpi.filter(i => i.meta?.hasFiscalError).length;
        return { total: invoicesParaKpi.length, mxn, usd, providers, errors };
    }, [invoicesParaKpi]);

    const companyTotals = useMemo(() => {
        const map = new Map();

        invoicesParaKpi.forEach((invoice) => {
            const meta = getMeta(invoice);
            const company = meta.company || invoice.company || 'Sin empresa';
            const currency = normalizeText(invoice.currency || meta.currency_code || 'MXN');
            const amount = Number(invoice.amount) || 0;

            if (!map.has(company)) {
                map.set(company, {
                    company,
                    mxn: 0,
                    usd: 0,
                    count: 0,
                });
            }

            const node = map.get(company);
            if (currency === 'USD') {
                node.usd += amount;
            } else {
                node.mxn += amount;
            }
            node.count += 1;
        });

        return Array.from(map.values()).sort((a, b) => (b.mxn + b.usd) - (a.mxn + a.usd));
    }, [invoicesParaKpi]);

    const bankCurrencyTotals = useMemo(() => {
        const map = new Map();

        invoicesParaKpi.forEach((invoice) => {
            const meta = getMeta(invoice);
            const bankId = getEffectiveBankId(invoice);
            const bankMeta = findBank(bankId);
            const bankName = bankMeta?.bank || 'Sin banco pagador';
            const currency = normalizeText(invoice.currency || meta.currency_code || 'MXN');
            const amount = Number(invoice.amount) || 0;
            const key = normalizeText(bankName) || 'SIN-BANCO-PAGADOR';

            if (!map.has(key)) {
                map.set(key, {
                    id: key,
                    bankName,
                    mxn: 0,
                    usd: 0,
                    count: 0,
                });
            }

            const node = map.get(key);
            if (currency === 'USD') {
                node.usd += amount;
            } else {
                node.mxn += amount;
            }
            node.count += 1;
        });

        return Array.from(map.values()).sort((a, b) => (b.mxn + b.usd) - (a.mxn + a.usd));
    }, [invoicesParaKpi, bankOverrides, bankOptions]);

    const bankSummary = useMemo(() => {
        const map = new Map();

        invoicesParaKpi.forEach((invoice) => {
            const bankId = getEffectiveBankId(invoice);
            const bankMeta = findBank(bankId);
            const key = bankId || 'SIN-BANCO-PAGADOR';
            const name = bankMeta?.bank || 'Sin banco pagador';
            const currency = bankMeta?.currency_code || invoice.currency || 'MXN';

            if (!map.has(key)) {
                map.set(key, {
                    id: key,
                    name,
                    currency,
                    amount: 0,
                    count: 0,
                    providers: new Set(),
                });
            }

            const node = map.get(key);
            node.amount += invoice.amount || 0;
            node.count += 1;
            node.providers.add(invoice.providerName || 'Sin proveedor');
        });

        return Array.from(map.values())
            .map(item => ({ ...item, providerCount: item.providers.size }))
            .sort((a, b) => b.amount - a.amount);
    }, [invoicesParaKpi, bankOverrides, bankOptions]);

    const filtered = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return invoicesBase.filter(inv => {
            const rowId = getInvoiceRowId(inv);
            const groupName = inv.group || getMeta(inv).group_proveedor || 'Sin Grupo';
            const currentPaymentGroupId = paymentGroupIds[rowId] || '';
            const bankId = getEffectiveBankId(inv);
            const bankName = getBankName(bankId);
            const matchGrupo = !grupoFilter || groupName === grupoFilter;
            const matchPaymentGroup = !paymentGroupFilter || currentPaymentGroupId === paymentGroupFilter;
            const matchSearch = !term ||
                String(inv.providerName || '').toLowerCase().includes(term) ||
                String(getMeta(inv).invoice || '').toLowerCase().includes(term) ||
                String(bankName || '').toLowerCase().includes(term) ||
                String(bankId || '').toLowerCase().includes(term) ||
                String(currentPaymentGroupId || '').toLowerCase().includes(term);
            return matchGrupo && matchPaymentGroup && matchSearch;
        });
    }, [invoicesBase, searchTerm, grupoFilter, paymentGroupFilter, paymentGroupIds, bankOverrides, bankOptions]);

    const getInvoiceSortValue = (invoice, sortKey) => {
        const rowId = getInvoiceRowId(invoice);
        const meta = getMeta(invoice);
        const bankId = getEffectiveBankId(invoice);
        const bank = findBank(bankId);
        const paymentGroupId = paymentGroupIds[rowId] || '';
        const isProcessed = Boolean(paymentGroupId || processedRows[rowId]);

        switch (sortKey) {
            case 'selected':
                return selectedRows[rowId] ? 1 : 0;
            case 'company':
                return meta.company || invoice.company || '';
            case 'paymentGroup':
                return paymentGroupId || '';
            case 'provider':
                return invoice.providerName || meta.name || '';
            case 'providerGroup':
                return invoice.group || meta.group_proveedor || 'Sin Grupo';
            case 'bank':
                return bank?.bank || '';
            case 'paymentType':
                return getEffectivePaymentType(invoice);
            case 'currency':
                return invoice.currency || meta.currency_code || '';
            case 'amount':
                return Number(invoice.amount) || 0;
            case 'swift':
                return bank?.swift || meta.swift || meta.swift_c || '';
            case 'label':
                return getPaymentLabel(invoice);
            case 'status':
                return processedRows[rowId] || (isProcessed ? 'Procesado' : getPaymentStatus(invoice));
            case 'actions':
                return isProcessed ? 1 : 0;
            default:
                return '';
        }
    };

    const sortedFiltered = useMemo(() => {
        const directionFactor = sortConfig.direction === 'desc' ? -1 : 1;

        return [...filtered].sort((a, b) => {
            const valueA = normalizeSortValue(getInvoiceSortValue(a, sortConfig.key));
            const valueB = normalizeSortValue(getInvoiceSortValue(b, sortConfig.key));

            if (valueA < valueB) return -1 * directionFactor;
            if (valueA > valueB) return 1 * directionFactor;

            const tieA = normalizeSortValue(`${a.providerName || ''}-${getMeta(a).invoice || a.id || ''}`);
            const tieB = normalizeSortValue(`${b.providerName || ''}-${getMeta(b).invoice || b.id || ''}`);
            if (tieA < tieB) return -1;
            if (tieA > tieB) return 1;
            return 0;
        });
    }, [filtered, sortConfig, selectedRows, paymentGroupIds, processedRows, bankOverrides, paymentTypeOverrides, bankOptions]);

    const totalPages = Math.ceil(sortedFiltered.length / PAGE_SIZE) || 1;
    const paginated = sortedFiltered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const selectedVisibleCount = sortedFiltered.filter(invoice => selectedRows[getInvoiceRowId(invoice)]).length;
    const selectedVisibleInvoices = sortedFiltered.filter(invoice => selectedRows[getInvoiceRowId(invoice)]);
    const unprocessedFilteredInvoices = sortedFiltered.filter(invoice => !paymentGroupIds[getInvoiceRowId(invoice)] && !processedRows[getInvoiceRowId(invoice)]);
    const isAllVisibleSelected = sortedFiltered.length > 0 && selectedVisibleCount === sortedFiltered.length;
    const isPartiallyVisibleSelected = selectedVisibleCount > 0 && !isAllVisibleSelected;
    const h2hReadySelectedInvoices = selectedVisibleInvoices.filter(invoice => {
        const rowId = getInvoiceRowId(invoice);
        return Boolean(paymentGroupIds[rowId]) && !editingRows[rowId] && getEffectivePaymentType(invoice) === 'H2H';
    });
    const h2hReadySelectedCount = h2hReadySelectedInvoices.length;
    const hasBatch = Boolean(activeBatch);
    const hasInvoices = invoicesBase.length > 0;
    const emptyTableTitle = hasBatch && hasInvoices ? 'Sin facturas para mostrar' : 'Sin información de pagos';
    const emptyTableMessage = !hasBatch
        ? 'Aun no existe un batch finalizado. Los elementos se llenaran cuando se genere informacion.'
        : !hasInvoices
            ? 'El batch actual aun no contiene facturas autorizadas.'
            : paymentGroupFilter
                ? `No hay facturas en el grupo de pago "${paymentGroupFilter}" con los filtros actuales.`
                : grupoFilter
                ? `No hay facturas en el grupo "${grupoFilter}" con los filtros actuales.`
                : 'No se encontraron facturas con los filtros aplicados.';

    const createPaymentGroupId = (targets) => {
        const hasH2H = targets.some(invoice => getEffectivePaymentType(invoice) === 'H2H');
        const prefix = hasH2H ? 'H2H' : 'MAN';
        const suffix = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5).padEnd(5, '0');
        return `${prefix}${suffix}`.slice(0, 8);
    };

    const getProviderSteps = (targets) => {
        const map = new Map();
        targets.forEach(invoice => {
            const provider = invoice.providerName || 'Sin proveedor';
            if (!map.has(provider)) {
                map.set(provider, {
                    provider,
                    count: 0,
                    paymentType: getEffectivePaymentType(invoice),
                    bankName: getBankName(getEffectiveBankId(invoice)),
                });
            }
            map.get(provider).count += 1;
        });
        return Array.from(map.values());
    };

    const getCurrencyTotals = (targets) => {
        const map = new Map();
        targets.forEach(invoice => {
            const currency = invoice.currency || getMeta(invoice).currency_code || 'MXN';
            const current = map.get(currency) || { currency, amount: 0, count: 0 };
            current.amount += Number(invoice.amount) || 0;
            current.count += 1;
            map.set(currency, current);
        });
        return Array.from(map.values()).sort((a, b) => a.currency.localeCompare(b.currency));
    };

    const getInvoicesWithoutAssignedBank = (targets) => (
        targets.filter(invoice => !getEffectiveBankId(invoice))
    );

    const getTargetPaymentGroups = (targets) => (
        Array.from(new Set(targets.map(invoice => paymentGroupIds[getInvoiceRowId(invoice)]).filter(Boolean))).sort()
    );

    const hasBankRejectionSignal = (invoice) => {
        const meta = getMeta(invoice);
        const fields = [
            invoice?.bankStatus,
            invoice?.bankResponse,
            invoice?.status,
            meta.bankStatus,
            meta.bank_response,
            meta.bank_response_status,
            meta.estado_banco,
            meta.h2h_status,
            meta.h2hStatus,
            meta.rejectionReason,
            meta.motivo_rechazo,
        ];

        return fields.some(value => {
            const normalized = normalizeText(value || '');
            return normalized.includes('RECHAZ') || normalized.includes('DECLIN') || normalized.includes('ERROR BANCO');
        });
    };

    const buildFlowInvoice = (invoice, status, paymentType, extra = {}) => {
        const rowId = getInvoiceRowId(invoice);
        const bankId = getEffectiveBankId(invoice);
        const bankMeta = findBank(bankId);
        const paymentGroupId = paymentGroupIds[rowId] || extra.paymentGroupId || '';
        const now = extra.timestamp || new Date().toISOString();
        const isH2H = paymentType === 'H2H';

        return {
            ...invoice,
            bankId,
            paymentGroupId,
            trackingId: extra.trackingId || `TRK-${Math.floor(Math.random() * 90000 + 10000)}`,
            processedDate: now.split('T')[0],
            status,
            batchId: activeBatch?.id || invoice?.batchId || 'MANUAL',
            rejectedAt: extra.rejectedAt,
            rejectionReason: extra.rejectionReason,
            meta: {
                ...(invoice.meta || {}),
                isH2H,
                paymentMethod: paymentType,
                banco_pagador_id: bankId,
                banco_pagador: bankMeta?.bank || bankId,
                paymentGroupId,
                h2hBatAction: extra.batAction || 'EXEC_BAT_H2H',
                h2hProcessedAt: now,
                bankResult: extra.bankResult,
                rejectedByBank: extra.bankResult === 'rejected',
            },
            auditLog: [
                ...(Array.isArray(invoice.auditLog) ? invoice.auditLog : []),
                {
                    event: extra.bankResult === 'rejected' ? 'H2H_BANK_REJECTED' : 'H2H_BAT_EXECUTED',
                    timestamp: now,
                    user: 'Sistema',
                    details: extra.rejectionReason || `Grupo ${paymentGroupId || 'sin grupo'} procesado por BAT H2H`,
                },
            ],
        };
    };

    const openCreatePaymentGroupConfirm = (invoice = null) => {
        const selectedUnprocessed = selectedVisibleInvoices.filter(item => !paymentGroupIds[getInvoiceRowId(item)] && !processedRows[getInvoiceRowId(item)]);
        const targets = invoice
            ? (!paymentGroupIds[getInvoiceRowId(invoice)] && !processedRows[getInvoiceRowId(invoice)] ? [invoice] : [])
            : (selectedUnprocessed.length > 0 ? selectedUnprocessed : unprocessedFilteredInvoices);
        if (targets.length === 0) return;

        const invoicesWithoutBank = getInvoicesWithoutAssignedBank(targets);
        if (invoicesWithoutBank.length > 0) {
            const firstInvoice = invoicesWithoutBank[0];
            const firstLabel = getMeta(firstInvoice).invoice || firstInvoice.id || firstInvoice.providerName || 'registro';
            setPaymentGroupConfirm(null);
            setPaymentGroupNotice(`No se puede crear el grupo de pago: ${invoicesWithoutBank.length} factura${invoicesWithoutBank.length !== 1 ? 's' : ''} sin banco pagador asignado. Revisa ${firstLabel}.`);
            return;
        }

        const groupId = createPaymentGroupId(targets);
        const providers = getProviderSteps(targets);

        setPaymentGroupConfirm({
            targets,
            groupId,
            providers,
            mode: invoice ? 'single' : (selectedUnprocessed.length > 0 ? 'selected' : 'visible'),
        });
    };

    const openProcessH2HConfirm = () => {
        if (h2hReadySelectedInvoices.length === 0) return;
        const paymentGroups = getTargetPaymentGroups(h2hReadySelectedInvoices);
        const reprocessGroups = paymentGroups.filter(groupId => h2hProcessedGroupIds[groupId]);
        const hasDetectedBankRejection = h2hReadySelectedInvoices.some(hasBankRejectionSignal);
        setH2hConfirm({
            targets: h2hReadySelectedInvoices,
            providers: getProviderSteps(h2hReadySelectedInvoices),
            currencyTotals: getCurrencyTotals(h2hReadySelectedInvoices),
            paymentGroups,
            reprocessGroups,
            isReprocess: reprocessGroups.length > 0,
            bankResult: hasDetectedBankRejection ? 'rejected' : 'success',
        });
    };

    const confirmProcessH2H = () => {
        if (!h2hConfirm) return;
        const rowIds = h2hConfirm.targets.map(getInvoiceRowId);
        const paymentGroups = h2hConfirm.paymentGroups || getTargetPaymentGroups(h2hConfirm.targets);
        setSelectedRows(prev => {
            const next = { ...prev };
            rowIds.forEach(rowId => {
                delete next[rowId];
            });
            return next;
        });
        setH2hProcessedGroupIds(prev => {
            const next = { ...prev };
            paymentGroups.forEach(groupId => {
                next[groupId] = true;
            });
            return next;
        });
        setH2hProcessProgress({
            ...h2hConfirm,
            paymentGroups,
            progress: 0,
            status: 'running',
            currentStepIndex: 0,
        });
        setPaymentGroupNotice('');
        setH2hConfirm(null);
    };

    const finishProcessH2H = (progressState) => {
        const timestamp = new Date().toISOString();
        const forceRejected = progressState.bankResult === 'rejected';
        const successful = [];
        const rejected = [];

        progressState.targets.forEach(invoice => {
            const paymentType = getEffectivePaymentType(invoice);
            const isRejectedByBank = forceRejected || hasBankRejectionSignal(invoice);

            if (isRejectedByBank) {
                rejected.push(buildFlowInvoice(invoice, 'RECHAZADO BANCO', paymentType, {
                    timestamp,
                    rejectedAt: timestamp,
                    rejectionReason: paymentType === 'H2H'
                        ? 'Rechazo del banco durante procesamiento H2H'
                        : 'Rechazo del banco durante procesamiento manual',
                    bankResult: 'rejected',
                }));
                return;
            }

            successful.push(buildFlowInvoice(invoice, 'PROCESANDO PAGO', paymentType, {
                timestamp,
                bankResult: 'success',
            }));
        });

        const movedRowIds = new Set(progressState.targets.map(getInvoiceRowId));

        if (setTrackingData && successful.length > 0) {
            setTrackingData(prev => {
                const existing = new Set((prev || []).map(item => getInvoiceRowId(item)));
                const nextSuccessful = successful.filter(item => !existing.has(getInvoiceRowId(item)));
                return [...(prev || []), ...nextSuccessful];
            });
        }

        if (setRejectedInvoices && rejected.length > 0) {
            setRejectedInvoices(prev => {
                const existing = new Set((prev || []).map(item => getInvoiceRowId(item)));
                const nextRejected = rejected.filter(item => !existing.has(getInvoiceRowId(item)));
                return [...(prev || []), ...nextRejected];
            });
        }

        if (setFinalizedInvoices) {
            setFinalizedInvoices(prev => (prev || []).filter(invoice => !movedRowIds.has(getInvoiceRowId(invoice))));
        }

        setSelectedRows(prev => {
            const next = { ...prev };
            movedRowIds.forEach(rowId => {
                delete next[rowId];
            });
            return next;
        });
        setPaymentGroupIds(prev => {
            const next = { ...prev };
            movedRowIds.forEach(rowId => {
                delete next[rowId];
            });
            return next;
        });
        setProcessedRows(prev => {
            const next = { ...prev };
            movedRowIds.forEach(rowId => {
                delete next[rowId];
            });
            return next;
        });

        const successText = successful.length > 0
            ? `${successful.length} registro${successful.length !== 1 ? 's' : ''} migrado${successful.length !== 1 ? 's' : ''} a Comprobacion de pagos`
            : '';
        const rejectedH2HCount = rejected.filter(invoice => invoice.meta?.isH2H).length;
        const rejectedManualCount = rejected.length - rejectedH2HCount;
        const rejectedParts = [
            rejectedH2HCount > 0 ? `${rejectedH2HCount} a Rechazados H2H` : '',
            rejectedManualCount > 0 ? `${rejectedManualCount} a Rechazados` : '',
        ].filter(Boolean);
        const rejectedText = rejectedParts.length > 0
            ? `Rechazo banco: ${rejectedParts.join(' | ')}`
            : '';

        setPaymentGroupNotice([successText, rejectedText].filter(Boolean).join(' | ') || 'Proceso H2H finalizado.');
    };

    const openEditRowConfirm = (invoice) => {
        const rowId = getInvoiceRowId(invoice);
        const meta = getMeta(invoice);

        setEditRowConfirm({
            rowId,
            provider: invoice.providerName || 'Sin proveedor',
            invoiceLabel: meta.invoice || invoice.id || rowId,
            paymentGroupId: paymentGroupIds[rowId] || '',
        });
    };

    const confirmEditRow = () => {
        if (!editRowConfirm) return;
        setEditingRows(prev => ({ ...prev, [editRowConfirm.rowId]: true }));
        setPaymentGroupNotice(`Edicion habilitada para ${editRowConfirm.invoiceLabel}. Guarda los cambios para reprocesar el grupo de pago.`);
        setEditRowConfirm(null);
    };

    const saveEditedRow = (invoice) => {
        const rowId = getInvoiceRowId(invoice);
        const bankId = getEffectiveBankId(invoice);
        const paymentType = getEffectivePaymentType(invoice);

        if (!bankId) {
            setPaymentGroupNotice('Selecciona un banco pagador antes de guardar los cambios.');
            return;
        }

        setEditingRows(prev => {
            const next = { ...prev };
            delete next[rowId];
            return next;
        });

        const paymentGroupId = paymentGroupIds[rowId];
        const reprocessText = paymentType === 'H2H'
            ? 'Selecciona el registro y usa PROCESAR H2H para reprocesar el grupo.'
            : 'El registro quedo como pago Manual y ya no entra al proceso H2H.';

        setPaymentGroupNotice(`Datos guardados${paymentGroupId ? ` para el grupo ${paymentGroupId}` : ''}. ${reprocessText}`);
    };

    const startCreatePaymentGroup = () => {
        if (!paymentGroupConfirm) return;
        setPaymentGroupProgress({
            ...paymentGroupConfirm,
            progress: 0,
            currentProviderIndex: 0,
            status: 'running',
        });
        setPaymentGroupConfirm(null);
    };

    const finishCreatePaymentGroup = (progressState) => {
        const rowIds = progressState.targets.map(getInvoiceRowId);
        setPaymentGroupIds(prev => {
            const next = { ...prev };
            rowIds.forEach(rowId => {
                next[rowId] = progressState.groupId;
            });
            return next;
        });
        setProcessedRows(prev => {
            const next = { ...prev };
            rowIds.forEach(rowId => {
                next[rowId] = 'Procesado';
            });
            return next;
        });
        setSelectedRows(prev => {
            const next = { ...prev };
            rowIds.forEach(rowId => {
                delete next[rowId];
            });
            return next;
        });
        setPaymentGroupNotice(`Grupo de pago ${progressState.groupId} creado para ${progressState.providers.length} proveedor${progressState.providers.length !== 1 ? 'es' : ''} / ${progressState.targets.length} factura${progressState.targets.length !== 1 ? 's' : ''}.`);
    };

    useEffect(() => {
        if (!paymentGroupProgress || paymentGroupProgress.status !== 'running') return undefined;

        const timer = setInterval(() => {
            setPaymentGroupProgress(prev => {
                if (!prev || prev.status !== 'running') return prev;
                const nextProgress = Math.min(prev.progress + 8, 100);
                const providerCount = Math.max(prev.providers.length, 1);
                const currentProviderIndex = Math.min(
                    Math.floor((nextProgress / 100) * providerCount),
                    providerCount - 1
                );

                if (nextProgress >= 100) {
                    const doneState = {
                        ...prev,
                        progress: 100,
                        currentProviderIndex: providerCount - 1,
                        status: 'done',
                    };
                    finishCreatePaymentGroup(doneState);
                    setTimeout(() => setPaymentGroupProgress(null), 900);
                    return doneState;
                }

                return {
                    ...prev,
                    progress: nextProgress,
                    currentProviderIndex,
                };
            });
        }, 220);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentGroupProgress?.status]);

    useEffect(() => {
        if (!h2hProcessProgress || h2hProcessProgress.status !== 'running') return undefined;

        const timer = setInterval(() => {
            setH2hProcessProgress(prev => {
                if (!prev || prev.status !== 'running') return prev;

                const nextProgress = Math.min(prev.progress + 7, 100);
                const currentStepIndex = Math.min(
                    Math.floor((nextProgress / 100) * H2H_PROCESS_STEPS.length),
                    H2H_PROCESS_STEPS.length - 1
                );

                if (nextProgress >= 100) {
                    const doneState = {
                        ...prev,
                        progress: 100,
                        currentStepIndex: H2H_PROCESS_STEPS.length - 1,
                        status: 'done',
                    };
                    finishProcessH2H(doneState);
                    setTimeout(() => setH2hProcessProgress(null), 1100);
                    return doneState;
                }

                return {
                    ...prev,
                    progress: nextProgress,
                    currentStepIndex,
                };
            });
        }, 260);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [h2hProcessProgress?.status]);

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
        setPage(1);
    };

    const renderSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={12} className="text-slate-300" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={12} className="text-primary" />
            : <ArrowDown size={12} className="text-primary" />;
    };

    const renderSortableHeader = (key, label, className = 'p-3', align = 'left') => {
        const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start';
        const activeClass = sortConfig.key === key ? 'text-primary' : 'text-slate-500';

        return (
            <th className={`${className} bg-slate-50`}>
                <button
                    type="button"
                    onClick={() => handleSort(key)}
                    className={`flex w-full items-center gap-1.5 ${justifyClass} whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-colors hover:text-primary ${activeClass}`}
                    title={`Ordenar por ${label}`}
                >
                    <span className="min-w-0 truncate">{label}</span>
                    {renderSortIcon(key)}
                </button>
            </th>
        );
    };

    const renderSelectionHeader = () => (
        <th className="p-3 text-center w-[124px] bg-slate-50">
            <div className="flex items-center justify-center gap-2">
                <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    disabled={sortedFiltered.length === 0}
                    ref={(node) => {
                        if (node) node.indeterminate = isPartiallyVisibleSelected;
                    }}
                    onChange={(event) => handleSelectAllVisible(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                    aria-label="Seleccionar todas las facturas visibles"
                    title="Seleccionar todo"
                />
                <button
                    type="button"
                    onClick={() => handleSort('selected')}
                    className={`flex items-center gap-1 whitespace-nowrap text-[10px] font-black uppercase tracking-widest transition-colors hover:text-primary ${sortConfig.key === 'selected' ? 'text-primary' : 'text-slate-500'}`}
                    title="Ordenar por seleccionadas"
                >
                    <span>Todo</span>
                    {renderSortIcon('selected')}
                </button>
            </div>
        </th>
    );

    const handleSelectRow = (rowId, checked) => {
        setSelectedRows(prev => ({ ...prev, [rowId]: checked }));
    };

    const handleSelectAllVisible = (checked) => {
        setSelectedRows(prev => {
            const next = { ...prev };
            sortedFiltered.forEach(invoice => {
                const rowId = getInvoiceRowId(invoice);
                if (checked) {
                    next[rowId] = true;
                } else {
                    delete next[rowId];
                }
            });
            return next;
        });
    };

    const handleBankChange = (rowId, bankId) => {
        if ((paymentGroupIds[rowId] || processedRows[rowId]) && !editingRows[rowId]) return;
        setBankOverrides(prev => ({ ...prev, [rowId]: bankId }));
    };

    const handlePaymentTypeChange = (rowId, paymentType) => {
        if ((paymentGroupIds[rowId] || processedRows[rowId]) && !editingRows[rowId]) return;
        setPaymentTypeOverrides(prev => ({ ...prev, [rowId]: paymentType }));
    };

    const handleExport = () => {
        const headers = [
            'Seleccionar',
            'Empresa',
            'Grupo de Pago',
            'Proveedor',
            'Grupo de proveedor',
            'Banco pagador',
            'Tipo de pago',
            'Moneda',
            'Monto',
            'swift',
            'Referencia 1',
            'Referencia 2',
            'Etiqueta',
            'Estado',
        ];

        const rows = sortedFiltered.map((invoice) => {
            const rowId = getInvoiceRowId(invoice);
            const meta = getMeta(invoice);
            const bank = findBank(getEffectiveBankId(invoice));
            return [
                selectedRows[rowId] ? 'Si' : 'No',
                meta.company || invoice.company || '',
                paymentGroupIds[rowId] || '',
                invoice.providerName || '',
                invoice.group || meta.group_proveedor || 'Sin Grupo',
                bank?.bank || '',
                getEffectivePaymentType(invoice),
                invoice.currency || meta.currency_code || '',
                invoice.amount ?? 0,
                bank?.swift || meta.swift || meta.swift_c || '',
                getRefValue(invoice, 'ref1'),
                getRefValue(invoice, 'ref2'),
                getPaymentLabel(invoice),
                processedRows[rowId] || getPaymentStatus(invoice),
            ];
        });

        const csv = [headers, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `pagos_autorizados_${activeBatch?.id ?? 'batch'}.csv`;
        link.click();
    };

    return (
        <div className="h-full min-w-0 flex flex-col space-y-4 p-3 animate-fade-in sm:space-y-6 sm:p-6">
            {paymentGroupNotice && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-semibold text-primary">
                    {paymentGroupNotice}
                </div>
            )}

            {paymentGroupConfirm && (
                <div className="fixed inset-0 z-[180] flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-sm animate-fade-in">
                    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-6">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-transparent text-primary shadow-sm" style={paymentGroupButtonStyle(false)}>
                                <FolderPlus size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-black uppercase tracking-wide text-slate-800">Crear grupo de pago</p>
                                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                    Se generara el grupo <span className="font-mono font-black text-primary">{paymentGroupConfirm.groupId}</span> para {paymentGroupConfirm.targets.length} factura{paymentGroupConfirm.targets.length !== 1 ? 's' : ''} y {paymentGroupConfirm.providers.length} proveedor{paymentGroupConfirm.providers.length !== 1 ? 'es' : ''}.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 max-h-44 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                            {paymentGroupConfirm.providers.map(provider => (
                                <div key={provider.provider} className="flex items-center justify-between gap-3 border-b border-white py-2 last:border-b-0">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-black text-slate-700">{provider.provider}</p>
                                        <p className="text-[10px] font-bold text-slate-400">{provider.count} factura{provider.count !== 1 ? 's' : ''} | {provider.bankName}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${provider.paymentType === 'H2H' ? 'border-indigo-200 bg-indigo-50 text-indigo-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                                        {provider.paymentType}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentGroupConfirm(null)}
                                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={startCreatePaymentGroup}
                                className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-blue-700"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {editRowConfirm && (
                <div className="fixed inset-0 z-[182] flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-6">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 shadow-sm">
                                <ShieldAlert size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-black uppercase tracking-wide text-slate-800">Editar pago autorizado</p>
                                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                    Se habilitaran Banco pagador y Tipo de pago para este registro. Al guardar podras reprocesar el grupo de pago.
                                </p>
                                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                    <p className="truncate text-xs font-black text-slate-700">{editRowConfirm.provider}</p>
                                    <p className="font-mono text-[10px] font-bold text-slate-400">
                                        {editRowConfirm.invoiceLabel}{editRowConfirm.paymentGroupId ? ` | ${editRowConfirm.paymentGroupId}` : ''}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setEditRowConfirm(null)}
                                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmEditRow}
                                className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-amber-600"
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {h2hConfirm && (
                <div className="fixed inset-0 z-[185] flex items-center justify-center bg-slate-900/45 p-3 backdrop-blur-sm animate-fade-in">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-6">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm">
                                <Send size={20} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-black uppercase tracking-wide text-slate-800">Procesar H2H</p>
                                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">
                                    Se enviaran {h2hConfirm.providers.length} proveedor{h2hConfirm.providers.length !== 1 ? 'es' : ''} y {h2hConfirm.targets.length} registro{h2hConfirm.targets.length !== 1 ? 's' : ''}.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {h2hConfirm.currencyTotals.map(item => (
                                <div key={item.currency} className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">{item.currency}</p>
                                    <p className="mt-1 text-lg font-black text-slate-800">{formatCurrency(item.amount, item.currency)}</p>
                                    <p className="text-[10px] font-bold text-emerald-700">{item.count} registro{item.count !== 1 ? 's' : ''}</p>
                                </div>
                            ))}
                        </div>

                        {h2hConfirm.isReprocess && (
                            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-800">
                                <p className="font-black uppercase tracking-wide">Este grupo de pago ya se ha procesado anteriormente, requiere reprocesar?</p>
                                <p className="mt-1">Debes considerar que esto podria generar un pago duplicado.</p>
                                {h2hConfirm.reprocessGroups?.length > 0 && (
                                    <p className="mt-2 font-mono text-[10px] font-black text-amber-700">
                                        {h2hConfirm.reprocessGroups.join(', ')}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400" htmlFor="h2h-bank-result">
                                Respuesta banco
                            </label>
                            <select
                                id="h2h-bank-result"
                                value={h2hConfirm.bankResult || 'success'}
                                onChange={(event) => setH2hConfirm(prev => prev ? { ...prev, bankResult: event.target.value } : prev)}
                                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200"
                            >
                                <option value="success">Aceptado por banco</option>
                                <option value="rejected">Rechazado por banco</option>
                            </select>
                        </div>

                        <div className="mt-4 max-h-44 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                            {h2hConfirm.providers.map(provider => (
                                <div key={provider.provider} className="flex items-center justify-between gap-3 border-b border-white py-2 last:border-b-0">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-black text-slate-700">{provider.provider}</p>
                                        <p className="text-[10px] font-bold text-slate-400">{provider.count} registro{provider.count !== 1 ? 's' : ''} | {provider.bankName}</p>
                                    </div>
                                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                                        H2H
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setH2hConfirm(null)}
                                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmProcessH2H}
                                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-emerald-700"
                            >
                                {h2hConfirm.isReprocess ? 'Continuar' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {h2hProcessProgress && (
                <div className="fixed inset-0 z-[188] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm animate-fade-in">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Procesar H2H</p>
                                <h3 className="mt-1 truncate font-mono text-2xl font-black text-slate-800">
                                    {(h2hProcessProgress.paymentGroups || []).join(', ') || 'H2H'}
                                </h3>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    {h2hProcessProgress.targets.length} registro{h2hProcessProgress.targets.length !== 1 ? 's' : ''} | Accion .BAT
                                </p>
                            </div>
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${h2hProcessProgress.status === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                {h2hProcessProgress.status === 'done' ? <CheckCircle2 size={24} /> : <RefreshCw size={24} className="animate-spin" />}
                            </div>
                        </div>

                        <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-600">
                                <span>{h2hProcessProgress.status === 'done' ? 'Completado' : H2H_PROCESS_STEPS[h2hProcessProgress.currentStepIndex] || 'Procesando'}</span>
                                <span className="font-mono">{h2hProcessProgress.progress}%</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 transition-all duration-200"
                                    style={{ width: `${h2hProcessProgress.progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {H2H_PROCESS_STEPS.map((step, index) => {
                                const isDone = h2hProcessProgress.status === 'done' || index < h2hProcessProgress.currentStepIndex;
                                const isActive = h2hProcessProgress.status === 'running' && index === h2hProcessProgress.currentStepIndex;

                                return (
                                    <div
                                        key={step}
                                        className={`rounded-xl border px-3 py-2 text-xs font-bold ${isDone
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : isActive
                                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                                : 'border-slate-100 bg-slate-50 text-slate-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {isDone ? <CheckCircle2 size={14} /> : isActive ? <RefreshCw size={14} className="animate-spin" /> : <span className="h-3.5 w-3.5 rounded-full border border-slate-200" />}
                                            <span>{step}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-5 max-h-44 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                            {h2hProcessProgress.providers.map(provider => (
                                <div key={provider.provider} className="flex items-center justify-between gap-3 border-b border-white py-2 last:border-b-0">
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-black text-slate-700">{provider.provider}</p>
                                        <p className="text-[10px] font-bold text-slate-400">{provider.count} registro{provider.count !== 1 ? 's' : ''} | {provider.bankName}</p>
                                    </div>
                                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${h2hProcessProgress.bankResult === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                                        {h2hProcessProgress.bankResult === 'rejected' ? 'Rechazado' : 'Aceptado'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {paymentGroupProgress && (
                <div className="fixed inset-0 z-[190] flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm animate-fade-in">
                    <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl sm:rounded-2xl sm:p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Creacion de grupo de pago</p>
                                <h3 className="mt-1 font-mono text-2xl font-black text-slate-800">{paymentGroupProgress.groupId}</h3>
                            </div>
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${paymentGroupProgress.status === 'done' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-primary'}`}>
                                {paymentGroupProgress.status === 'done' ? <CheckCircle2 size={24} /> : <RefreshCw size={24} className="animate-spin" />}
                            </div>
                        </div>

                        <div className="mt-5">
                            <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-600">
                                <span>{paymentGroupProgress.status === 'done' ? 'Completado' : 'Procesando proveedores'}</span>
                                <span className="font-mono">{paymentGroupProgress.progress}%</span>
                            </div>
                            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-emerald-500 to-indigo-500 transition-all duration-200"
                                    style={{ width: `${paymentGroupProgress.progress}%` }}
                                />
                            </div>
                        </div>

                        <div className="mt-5 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-3">
                            {paymentGroupProgress.providers.map((provider, index) => {
                                const isDone = paymentGroupProgress.status === 'done' || index < paymentGroupProgress.currentProviderIndex;
                                const isActive = paymentGroupProgress.status === 'running' && index === paymentGroupProgress.currentProviderIndex;

                                return (
                                    <div key={provider.provider} className="flex items-center justify-between gap-3 border-b border-white py-2 last:border-b-0">
                                        <div className="min-w-0">
                                            <p className="truncate text-xs font-black text-slate-700">{provider.provider}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{provider.count} factura{provider.count !== 1 ? 's' : ''} | {provider.paymentType}</p>
                                        </div>
                                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black ${isDone
                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            : isActive
                                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 bg-white text-slate-400'
                                            }`}>
                                            {isDone ? 'Creado' : isActive ? 'Creando' : 'En cola'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Card padding="p-3" className="h-[104px] border-l-4 border-emerald-500 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[9px] font-black text-slate-400 uppercase tracking-wide">Total por compañía</p>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-700">
                            {companyTotals.length}
                        </span>
                    </div>
                    <div className="mt-2 max-h-[58px] space-y-1 overflow-y-auto pr-1">
                        {companyTotals.length === 0 && (
                            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-400">
                                Sin compañías
                            </div>
                        )}
                        {companyTotals.map((item) => (
                            <div key={item.company} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-slate-50 px-2 py-1">
                                <span className="min-w-0 truncate text-[10px] font-black uppercase text-slate-700">
                                    {item.company}
                                </span>
                                <div className="text-right leading-tight">
                                    <p className="text-[9px] font-black text-emerald-700">{formatCurrency(item.mxn, 'MXN')}</p>
                                    <p className="text-[9px] font-black text-blue-700">{formatCurrency(item.usd, 'USD')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card padding="p-3" className="h-[104px] border-l-4 border-blue-500 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[9px] font-black text-slate-400 uppercase tracking-wide">Total por banco por moneda</p>
                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700">
                            {bankCurrencyTotals.length}
                        </span>
                    </div>
                    <div className="mt-2 max-h-[58px] space-y-1 overflow-y-auto pr-1">
                        {bankCurrencyTotals.length === 0 && (
                            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-400">
                                Sin bancos
                            </div>
                        )}
                        {bankCurrencyTotals.map((item) => (
                            <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-slate-50 px-2 py-1">
                                <span className="min-w-0 truncate text-[10px] font-black uppercase text-slate-700">
                                    {item.bankName}
                                </span>
                                <div className="text-right leading-tight">
                                    <p className="text-[9px] font-black text-emerald-700">{formatCurrency(item.mxn, 'MXN')}</p>
                                    <p className="text-[9px] font-black text-blue-700">{formatCurrency(item.usd, 'USD')}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card padding="p-3" className="h-[104px] border-l-4 border-indigo-400 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Facturas</p>
                        <FileText size={14} className="text-indigo-400" />
                    </div>
                    <p className="text-xl font-black text-slate-800">{kpis.total}</p>
                </Card>
                <Card padding="p-3" className="h-[104px] border-l-4 border-violet-400 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Proveedores</p>
                        <Users size={14} className="text-violet-400" />
                    </div>
                    <p className="text-xl font-black text-slate-800">{kpis.providers}</p>
                </Card>
                <Card padding="p-3" className={`h-[104px] border-l-4 flex flex-col justify-between ${kpis.errors > 0 ? 'border-red-400' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Inconsistencias</p>
                        <ShieldAlert size={14} className={kpis.errors > 0 ? 'text-red-400' : 'text-slate-300'} />
                    </div>
                    <p className={`text-xl font-black ${kpis.errors > 0 ? 'text-red-600' : 'text-slate-400'}`}>{kpis.errors}</p>
                </Card>
            </div>

            <div className={`min-h-0 flex-1 grid grid-cols-1 ${isBankSummaryVisible ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-3 overflow-hidden sm:gap-6`}>
                {isBankSummaryVisible && (
                    <div className="flex max-h-[220px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white lg:col-span-1 lg:max-h-none">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Building2 size={14} /> Resumen por Banco
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsBankSummaryVisible(false)}
                                title="Ocultar resumen por banco"
                                aria-label="Ocultar resumen por banco"
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <ChevronLeft size={14} />
                            </button>
                        </div>
                        <div className="p-2 space-y-1 overflow-y-auto flex-1">
                            {bankSummary.length === 0 && (
                                <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-xs font-semibold text-slate-400">
                                    Sin bancos para resumir
                                </div>
                            )}
                            {bankSummary.map(b => (
                                <div key={b.id} className="px-3 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 transition-colors">
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-xs font-bold text-slate-700 leading-tight">{b.name}</span>
                                        <Badge status={b.currency === 'USD' ? 'success' : 'info'}>{b.currency}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-[10px] text-slate-400">{b.providerCount} proveedores | {b.count} facturas</span>
                                        <span className="text-xs font-black text-slate-800">{formatCurrency(b.amount)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <Card className={`${isBankSummaryVisible ? 'lg:col-span-3' : 'lg:col-span-1'} min-h-[420px] p-0 flex flex-col overflow-hidden`}>
                    <div className="border-b border-slate-100 bg-slate-50 p-2 sm:p-3">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            {!isBankSummaryVisible && (
                                <button
                                    type="button"
                                    onClick={() => setIsBankSummaryVisible(true)}
                                    className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-slate-600 transition-colors hover:bg-blue-50 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:w-auto"
                                    title="Mostrar resumen por banco"
                                >
                                    <Building2 size={14} />
                                    Mostrar resumen
                                    <ChevronRight size={12} />
                                </button>
                            )}
                            <div className="relative min-w-0 w-full flex-none sm:min-w-[220px] sm:flex-1 xl:max-w-[360px]">
                                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por proveedor, factura o banco..."
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                />
                            </div>
                            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 xl:justify-end">
                                <div className="relative h-10 w-full sm:w-auto sm:shrink-0">
                                    <Tag size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
                                    <select
                                        value={grupoFilter}
                                        onChange={e => { setGrupoFilter(e.target.value); setPage(1); }}
                                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-blue-200 sm:min-w-[180px]"
                                    >
                                        <option value="">Todos los grupos</option>
                                        {gruposDisponibles.map(g => {
                                            const meta = CATALOG_GRUPOS.find(c => c.group === g);
                                            return (
                                                <option key={g} value={g}>
                                                    {g}{meta ? ` - ${meta.description}` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div className="relative h-10 w-full sm:w-auto sm:shrink-0">
                                    <FolderPlus size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
                                    <select
                                        value={paymentGroupFilter}
                                        onChange={e => { setPaymentGroupFilter(e.target.value); setPage(1); }}
                                        disabled={paymentGroupOptions.length === 0}
                                        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 sm:min-w-[230px]"
                                    >
                                        <option value="">Todos los grupos de pagos</option>
                                        {paymentGroupOptions.map(groupId => (
                                            <option key={groupId} value={groupId}>{groupId}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => openCreatePaymentGroupConfirm()}
                                    disabled={unprocessedFilteredInvoices.length === 0}
                                    style={paymentGroupButtonStyle(unprocessedFilteredInvoices.length === 0)}
                                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-transparent px-4 text-[11px] font-black uppercase tracking-wide text-primary shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:translate-y-0 sm:w-auto sm:shrink-0"
                                >
                                    <FolderPlus size={18} />
                                    CREAR GRUPO DE PAGOS
                                </button>
                                <button
                                    type="button"
                                    onClick={openProcessH2HConfirm}
                                    disabled={h2hReadySelectedCount === 0}
                                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[11px] font-black uppercase tracking-wide text-white shadow-md shadow-emerald-500/20 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0 sm:w-auto sm:shrink-0"
                                    title={h2hReadySelectedCount === 0 ? 'Selecciona registros procesados H2H' : 'Procesar registros H2H seleccionados'}
                                >
                                    <Send size={18} />
                                    PROCESAR H2H
                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-black text-emerald-700">
                                        {h2hReadySelectedCount}
                                    </span>
                                </button>
                                <Button variant="success" icon={Download} onClick={handleExport} className="h-10 w-full shrink-0 px-4 sm:w-auto">
                                    Exportar CSV
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-auto flex-1 min-h-0">
                        <table className="w-full text-left text-xs min-w-[1740px]">
                            <thead className="sticky top-0 z-20">
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 font-black uppercase tracking-widest shadow-[0_1px_0_0_rgba(148,163,184,0.25)]">
                                    {renderSelectionHeader()}
                                    {renderSortableHeader('company', 'Empresa', 'p-3 w-[115px]')}
                                    {renderSortableHeader('paymentGroup', 'Grupo de pago', 'p-3 w-[130px]')}
                                    {renderSortableHeader('provider', 'Proveedor', 'p-3 w-[220px]')}
                                    {renderSortableHeader('providerGroup', 'Grupo de proveedor', 'p-3 w-[170px]')}
                                    {renderSortableHeader('bank', 'Banco pagador', 'p-3 w-[200px]')}
                                    {renderSortableHeader('paymentType', 'Tipo de pago', 'p-3 w-[125px]')}
                                    {renderSortableHeader('currency', 'Moneda', 'p-3 text-center w-[95px]', 'center')}
                                    {renderSortableHeader('amount', 'Monto', 'p-3 text-right w-[125px]', 'right')}
                                    {renderSortableHeader('swift', 'swift', 'p-3 w-[105px]')}
                                    {renderSortableHeader('label', 'Etiqueta', 'p-3 w-[135px]')}
                                    {renderSortableHeader('status', 'Estado', 'p-3 w-[115px]')}
                                    {renderSortableHeader('actions', 'Acciones', 'p-3 text-center w-[150px]', 'center')}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginated.map((inv) => {
                                    const meta = getMeta(inv);
                                    const rowId = getInvoiceRowId(inv);
                                    const bankId = getEffectiveBankId(inv);
                                    const bankMeta = findBank(bankId);
                                    const paymentType = getEffectivePaymentType(inv);
                                    const label = getPaymentLabel(inv);
                                    const paymentGroupId = paymentGroupIds[rowId];
                                    const isProcessed = Boolean(paymentGroupId || processedRows[rowId]);
                                    const isEditing = Boolean(editingRows[rowId]);
                                    const status = processedRows[rowId] || (isProcessed ? 'Procesado' : getPaymentStatus(inv));

                                    return (
                                        <tr key={rowId} className={`transition-colors ${isProcessed ? 'bg-slate-50/70 hover:bg-slate-50' : 'hover:bg-emerald-50/30'}`}>
                                            <td className="p-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={!!selectedRows[rowId]}
                                                    onChange={(event) => handleSelectRow(rowId, event.target.checked)}
                                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
                                                    aria-label={`Seleccionar ${inv.providerName || 'proveedor'}`}
                                                />
                                            </td>
                                            <td className="p-3 font-bold text-slate-600">{meta.company || inv.company || '-'}</td>
                                            <td className="p-3">
                                                {paymentGroupId ? (
                                                    <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 font-mono text-[10px] font-black text-cyan-700">
                                                        {paymentGroupId}
                                                    </span>
                                                ) : (
                                                    <span className="font-mono text-[10px] font-bold text-slate-300">SIN GRUPO</span>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-800">{inv.providerName || 'Sin proveedor'}</span>
                                                    <span className="font-mono text-[10px] text-slate-400">{meta.invoice || inv.id || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-700">{inv.group || meta.group_proveedor || 'Sin Grupo'}</span>
                                                    {CATALOG_GRUPOS.find(g => g.group === inv.group)?.description && (
                                                        <span className="text-[9px] text-slate-400">
                                                            {CATALOG_GRUPOS.find(g => g.group === inv.group)?.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    value={bankId}
                                                    onChange={(event) => handleBankChange(rowId, event.target.value)}
                                                    disabled={isProcessed && !isEditing}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                >
                                                    <option value="">Sin banco pagador</option>
                                                    {bankOptions.map(bank => (
                                                        <option key={bank.id} value={bank.id}>
                                                            {bank.bank} - {bank.currency_code || inv.currency || 'MXN'}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <select
                                                    value={paymentType}
                                                    onChange={(event) => handlePaymentTypeChange(rowId, event.target.value)}
                                                    disabled={isProcessed && !isEditing}
                                                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                >
                                                    <option value="H2H">H2H</option>
                                                    <option value="Manual">Manual</option>
                                                </select>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border ${inv.currency === 'USD' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                                    {inv.currency || meta.currency_code || '-'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="font-black text-slate-800">{formatCurrency(inv.amount || 0)}</span>
                                            </td>
                                            <td className="p-3 font-mono text-[10px] text-slate-500">
                                                {bankMeta?.swift || meta.swift || meta.swift_c || '-'}
                                            </td>
                                            <td className="p-3">
                                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black uppercase text-slate-500">
                                                    {label}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <Badge status={getStatusBadgeTone(status)}>{status}</Badge>
                                            </td>
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <CreatePaymentGroupAction
                                                        onClick={() => openCreatePaymentGroupConfirm(inv)}
                                                        disabled={isProcessed || !bankId}
                                                        tooltip={isProcessed ? 'Registro procesado' : !bankId ? 'Asigna banco pagador' : 'Crear grupo de pago'}
                                                    />
                                                    <EditPaymentAction
                                                        isEditing={isEditing}
                                                        onClick={() => isEditing ? saveEditedRow(inv) : openEditRowConfirm(inv)}
                                                        disabled={!isProcessed && !isEditing}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {paginated.length === 0 && (
                                    <tr>
                                        <td colSpan="13" className="p-16 text-center">
                                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                                <FileText size={36} className="opacity-20" />
                                                <p className="text-sm font-bold text-slate-500">{emptyTableTitle}</p>
                                                <p className="text-xs text-slate-400">{emptyTableMessage}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filtered.length > PAGE_SIZE && (
                        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 p-3 sm:flex-row">
                            <span className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-left">
                                Pagina {page} de {totalPages} | {filtered.length} facturas
                                {selectedVisibleCount ? ` | ${selectedVisibleCount} seleccionada(s)` : ''}
                                {grupoFilter ? ` | Grupo: ${grupoFilter}` : ''}
                                {paymentGroupFilter ? ` | Grupo pago: ${paymentGroupFilter}` : ''}
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AuthorizedPayments;
