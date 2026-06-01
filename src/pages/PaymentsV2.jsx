import React, { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { invoicesArraySchema } from '../layout/invoiceSchema';
import { sp_process_invoice_data } from '../logic/Reglas_Negocio';
import { DESTINOS, CURRENCIES, HS_TOKENS } from '../data/catalogs';
import {
    Search, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check,
    X, ArrowUpDown, ArrowUp, ArrowDown, Calculator, Users, Download, Eye, ArrowLeft,
    FileSpreadsheet, ShieldAlert, RefreshCw, CheckCircle2, Lock, Filter, BarChart3, Maximize2, Minimize2, Layers, Save, Landmark
} from 'lucide-react';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Modal from '../components/Modal';

// Tokens Hotel Shops
const HS = {
    ...HS_TOKENS,
    gray3: "#b0b0b0",
    fontTitle: "'Open Sans', sans-serif",
    fontBody: "'Roboto', sans-serif",
};
const formatCurrency = (amount, currency = 'MXN') =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amount || 0);

// Nodo individual del árbol — separado para poder memoizarlo
const TreeNode = memo(({ id, node, level, selectedNode, onGroupSelect, forceOpen }) => {
    const detailsRef = useRef(null);

    const isSelected = selectedNode?.id === id && selectedNode?.type === node.type;

    // Cuando forceOpen cambia, controlamos el atributo open directamente
    // sin desmontar el árbol (a diferencia del hack de key={})
    useEffect(() => {
        if (detailsRef.current) {
            detailsRef.current.open = forceOpen;
        }
    }, [forceOpen]);

    return (
        <details
            ref={detailsRef}
            className={`${level > 0 ? 'ml-2 border-l border-slate-100 pl-2' : ''} my-0.5`}
        >
            <summary
                onClick={() => onGroupSelect({ id, type: node.type, label: node.label })}
                className={`flex items-center py-1.5 px-2 rounded-md cursor-pointer hover:bg-slate-50 transition-colors list-none ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <ChevronRight size={10} className={`shrink-0 text-slate-400 transition-transform ${level < 2 ? 'block' : 'opacity-0'}`} />
                    <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold uppercase truncate tracking-tight text-slate-700">
                            {node.label}
                        </span>
                        <span className="text-[8px] font-black text-amber-500 italic leading-none mt-0.5">
                            *TAX (16%)
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-right shrink-0 ml-4 font-mono text-[10px]">
                    <div className="flex flex-col items-end">
                        <span className="w-20 text-slate-600">{node.mxn > 0 ? formatCurrency(node.mxn, 'MXN').replace('$', '') : '-'}</span>
                        <span className="w-20 text-slate-400 text-[8px]">{node.mxnTax > 0 ? formatCurrency(node.mxnTax, 'MXN').replace('$', '') : '-'}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="w-20 text-blue-600 font-bold">{node.usd > 0 ? formatCurrency(node.usd, 'USD').replace('$', '') : '-'}</span>
                        <span className="w-20 text-blue-400 text-[8px]">{node.usdTax > 0 ? formatCurrency(node.usdTax, 'USD').replace('$', '') : '-'}</span>
                    </div>
                </div>
            </summary>
            {Object.keys(node.children).length > 0 && (
                <div className="mt-0.5">
                    <RenderTreeNode nodes={node.children} level={level + 1} selectedNode={selectedNode} onGroupSelect={onGroupSelect} forceOpen={forceOpen} />
                </div>
            )}
        </details>
    );
});

// Componente recursivo para renderizar el árbol
const RenderTreeNode = memo(({ nodes, level = 0, selectedNode, onGroupSelect, forceOpen }) => {
    if (!nodes) return null;
    return Object.entries(nodes).filter(([_, n]) => !!n).map(([id, node]) => (
        <TreeNode
            key={id}
            id={id}
            node={node}
            level={level}
            selectedNode={selectedNode}
            onGroupSelect={onGroupSelect}
            forceOpen={forceOpen}
        />
    ));
});

// Componente de Dropdown Multiselección para la Cabecera
// Definido fuera del padre para evitar re-creación en cada render
const filterInputClass = "w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[10px] outline-none focus:ring-2 focus:ring-primary/20 bg-white text-slate-700";
const filterLabel = "block text-[9px] font-black text-slate-400 uppercase tracking-wide mb-0.5";

const MultiSelectHeaderFilter = memo(({ label, options, selectedValues, onChange, placeholder = "Todos", singleSelect = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOption = (opt) => {
        if (singleSelect) {
            onChange([opt]);
            setIsOpen(false);
            return;
        }
        const next = selectedValues.includes(opt)
            ? selectedValues.filter(v => v !== opt)
            : [...selectedValues, opt];
        onChange(next);
    };

    return (
        <div className="relative min-w-[120px] flex-1" ref={containerRef}>
            <label className={filterLabel}>{label}</label>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`${filterInputClass} flex items-center justify-between gap-2 text-left truncate`}
            >
                <span className="truncate">
                    {selectedValues.length === 0 ? placeholder :
                        selectedValues.length === 1 ? selectedValues[0] :
                            `${selectedValues.length} Seleccionados`}
                </span>
                <ChevronDown size={12} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[180px] bg-white border border-slate-200 shadow-xl rounded-lg z-[100] max-h-60 overflow-y-auto p-1">
                    {!singleSelect && (
                        <div className="flex justify-between p-1 mb-1 border-b border-slate-100">
                            <button onClick={() => onChange(options)} className="text-[8px] font-bold text-blue-600 hover:underline">Todos</button>
                            <button onClick={() => onChange([])} className="text-[8px] font-bold text-slate-400 hover:underline">Limpiar</button>
                        </div>
                    )}
                    {options.map(opt => (
                        <label key={opt} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer rounded text-[10px] text-slate-700">
                            <input
                                type={singleSelect ? "radio" : "checkbox"}
                                checked={selectedValues.includes(opt)}
                                onChange={() => toggleOption(opt)}
                                className="rounded border-slate-300 text-primary"
                            />
                            <span className="truncate">{opt}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
});

const PaymentsV2 = ({
    rawInvoices, setRawInvoices, catalogs,
    authorizedInvoices = [], setAuthorizedInvoices,
    finalizedInvoices = [], setFinalizedInvoices, activeBatch, setActiveBatch,
    batchList, setBatchList
}) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        // Recuperar la preferencia del usuario del almacenamiento local
        const saved = localStorage.getItem('hs_payments_sidebar_open');
        return saved !== null ? JSON.parse(saved) : true;
    });
    const containerRef = useRef(null);

    // Guardar la preferencia de visualización cada vez que cambie
    useEffect(() => {
        localStorage.setItem('hs_payments_sidebar_open', JSON.stringify(isSidebarOpen));
    }, [isSidebarOpen]);

    // Atajo de teclado para colapsar panel (Ctrl + B)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                setIsSidebarOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Estado para los filtros individuales del sidebar
    const [sidebarFilters, setSidebarFilters] = useState({
        provider: "",
        company: [],
        group: [],
        subGroup: []
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedNode, setSelectedNode] = useState(null);
    const [page, setPage] = useState(1);
    const [isHeaderOpen, setIsHeaderOpen] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'dueDate', direction: 'asc' });
    const [exchangeRate, setExchangeRate] = useState(18.50);

    // Estados para la vista de Autorizados
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [selectedAuthProvider, setSelectedAuthProvider] = useState(null);
    const [authModalSearch, setAuthModalSearch] = useState("");
    const [collapsedAuthNodes, setCollapsedAuthNodes] = useState({});
    const [isImprocedentesModalOpen, setIsImprocedentesModalOpen] = useState(false);

    const [allExpanded, setAllExpanded] = useState(false);

    // Estados para el Modal de Añadir Manual
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [manualInvoice, setManualInvoice] = useState({ company: "", uuid: "", invoiceNum: "" });
    const [addProcess, setAddProcess] = useState({ status: 'idle', step: -1, error: null });
    // Pasos: 0:Localizado, 1:Encontrada, 2:Reglas, 3:Éxito
    const processSteps = ["Localizando", "Encontrada", "Aplicando reglas de negocio", "Cargada exitosamente"];

    // Modal de confirmación genérico (reemplaza window.confirm)
    const [confirmDialog, setConfirmDialog] = useState(null);
    // { message, onConfirm }

    const showConfirm = (message, onConfirm) => {
        setConfirmDialog({ message, onConfirm });
    };

    // Toast de éxito (reemplaza alert)
    const [toast, setToast] = useState(null);
    const showToast = (message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    // Derivar companyList de los catálogos pasados por props
    const companyList = useMemo(() => {
        if (!catalogs || !Array.isArray(catalogs.banks)) return [];
        const uniqueCompanies = new Set(catalogs.banks.map(bank => bank.company).filter(Boolean));
        return Array.from(uniqueCompanies);
    }, [catalogs]);
    const pageSize = 10;
    const EMPTY_FILTERS = { destino: [], company: [], dateCutoff: "", currency: [], documentType: [], grupo: [], subgrupo: [] };
    const [pendingFilters, setPendingFilters] = useState(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

    // --- LÓGICA DE FILTROS DINÁMICOS (CASCADA) ---
    const dynamicOptions = useMemo(() => {
        // Mitigación: Aseguramos que data sea un array y no contenga nulos
        const data = (Array.isArray(rawInvoices) ? rawInvoices : []).filter(Boolean);
        const getUnique = (list, keyPath) => {
            const set = new Set();
            list.filter(Boolean).forEach(item => {
                let val = item;
                keyPath.split('.').forEach(k => { val = val?.[k]; });
                if (val !== undefined && val !== null) set.add(String(val));
            });
            return Array.from(set).sort();
        };

        // Cascada: cada nivel filtra al siguiente
        const destinos = getUnique(data, 'pais');

        const dataForCompanies = pendingFilters.destino.length
            ? data.filter(i => (i?.meta?.pais || i?.meta?.destino) && pendingFilters.destino.includes(String(i.meta.pais || i.meta.destino))) : data;
        const companies = getUnique(dataForCompanies, 'meta.company');

        const dataForCurrencies = pendingFilters.company.length
            ? dataForCompanies.filter(i => i?.meta?.company && pendingFilters.company.includes(String(i.meta.company))) : dataForCompanies;
        const currencies = getUnique(dataForCurrencies, 'currency');

        const dataForGrupos = pendingFilters.currency.length
            ? dataForCurrencies.filter(i => i?.currency && pendingFilters.currency.includes(String(i.currency))) : dataForCurrencies;
        const grupos = getUnique(dataForGrupos, 'group');

        const dataForSubgrupos = pendingFilters.grupo.length
            ? dataForGrupos.filter(i => pendingFilters.grupo.includes(String(i.group))) : dataForGrupos;
        const subgrupos = getUnique(dataForSubgrupos, 'subgrupo_c');

        const dataForDocTypes = pendingFilters.subgrupo.length
            ? dataForSubgrupos.filter(i => pendingFilters.subgrupo.includes(String(i.meta?.subgrupo_c))) : dataForSubgrupos;
        const docTypes = getUnique(dataForDocTypes, 'description_tran_doc_type');

        return { destinos, companies, currencies, grupos, docTypes, subgrupos };
    }, [rawInvoices, pendingFilters]);

    // --- GESTIÓN DE FILTROS GUARDADOS ---
    const [savedFilterSets, setSavedFilterSets] = useState(() => {
        const saved = localStorage.getItem('hs_saved_filters_v2');
        return saved ? JSON.parse(saved) : [];
    });
    const [newFilterName, setNewFilterName] = useState('');
    const [showSaveInput, setShowSaveInput] = useState(false);

    const handleSaveCurrentFilters = () => {
        if (!newFilterName.trim()) return showToast("Asigna un nombre al filtro");
        const newSet = { id: Date.now(), name: newFilterName, config: { ...pendingFilters } };
        const updated = [...savedFilterSets, newSet];
        setSavedFilterSets(updated);
        localStorage.setItem('hs_saved_filters_v2', JSON.stringify(updated));
        setNewFilterName('');
        setShowSaveInput(false);
        showToast("Filtro guardado correctamente");
    };

    const handleDeleteSavedFilter = (id) => {
        const updated = savedFilterSets.filter(s => s.id !== id);
        setSavedFilterSets(updated);
        localStorage.setItem('hs_saved_filters_v2', JSON.stringify(updated));
        showToast("Filtro eliminado");
    };

    const activeFilterCount = Object.entries(appliedFilters).filter(([key, v]) =>
        Array.isArray(v) ? v.length > 0 : v !== ""
    ).length;

    // Estado para Secciones del Sidebar (Manejo de orden y colapso)
    const [sidebarSections, setSidebarSections] = useState(['docTypes', 'subGroups', 'groups']);
    const [collapsedSections, setCollapsedSections] = useState({ groups: false, docTypes: false, subGroups: false, filters: false, tree: false, summary: false });

    const toggleCollapse = (section) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const moveSection = (idx, dir) => {
        const newSections = [...sidebarSections];
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= newSections.length) return;
        [newSections[idx], newSections[targetIdx]] = [newSections[targetIdx], newSections[idx]];
        setSidebarSections(newSections);
    };

    // Opciones dinámicas derivadas de los datos cargados
    const documentTypes = useMemo(() => {
        const types = new Set(
            (rawInvoices || []).map(i => i.meta?.tipo_c || i.meta?.document_type).filter(Boolean)
        );
        return Array.from(types).sort();
    }, [rawInvoices]);

    const subGroups = useMemo(() => {
        const subs = new Set(
            (rawInvoices || []).map(i => String(i.meta?.subgrupo_c || 'Sin Subgrupo')).filter(Boolean)
        );
        return Array.from(subs).sort();
    }, [rawInvoices]);

    // Agrupación de facturas improcedentes (con error fiscal) por proveedor
    const improcedentesByProvider = useMemo(() => {
        const rawArr = Array.isArray(rawInvoices) ? rawInvoices : [];
        // Filtramos por error fiscal y aplicamos filtros globales (Destino/Empresa)
        const filtered = rawArr.filter(d => {
            if (!d?.meta?.hasFiscalError) return false;
            const meta = d.meta;
            const matchDestino = appliedFilters.destino.length === 0 ||
                (meta.pais && appliedFilters.destino.includes(meta.pais)) ||
                (meta.destino && appliedFilters.destino.includes(meta.destino));
            const matchCompany = appliedFilters.company.length === 0 || (meta.company && appliedFilters.company.includes(meta.company));
            return matchDestino && matchCompany;
        });

        const groups = {};
        filtered.forEach(inv => {
            const pName = inv.providerName || 'Proveedor Desconocido';
            if (!groups[pName]) groups[pName] = { name: pName, count: 0, total: 0 };
            groups[pName].count++;
            groups[pName].total += (inv.amount || 0);
        });
        return Object.values(groups).sort((a, b) => b.count - a.count);
    }, [rawInvoices, appliedFilters]);

    const groupList = useMemo(() => {
        if (!catalogs?.groups) return [];
        return catalogs.groups;
    }, [catalogs]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-slate-300" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />;
    };

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(null);
    const [isBatchPanelOpen, setIsBatchPanelOpen] = useState(true);

    const handleSyncAndSearch = async () => {
        setIsSyncing(true);
        setSyncError(null);
        const controller = new AbortController();
        // 60 segundos: pandas puede tardar en leer archivos Excel grandes
        const timeoutId = setTimeout(() => controller.abort(), 60000);
        try {
            const response = await fetch('http://localhost:5000/api/invoices', { signal: controller.signal });
            const jsonData = await response.json();
            if (!response.ok) throw new Error(jsonData.error || "Error de conexión con el servidor.");

            // PROCESAMIENTO CRÍTICO: Transformar datos crudos del Excel a objetos de negocio
            const processedData = jsonData.map(row => sp_process_invoice_data(row));

            const result = invoicesArraySchema.safeParse(processedData);
            if (!result.success) {
                const firstError = result.error.issues[0]?.message || "Error de formato en datos locales";
                throw new Error(`Error de validación: ${firstError}`);
            }
            setRawInvoices(processedData);
            setAppliedFilters({ ...pendingFilters });
            setPage(1);
        } catch (err) {
            if (err.name === 'AbortError') {
                setSyncError("El servidor tardó más de 60 segundos en responder. El archivo Excel puede ser muy grande o el servidor está ocupado.");
            } else if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
                setSyncError("No se pudo contactar al servidor. Verifica que 'python server.py' esté activo en una terminal.");
            } else {
                setSyncError(err.message);
            }
        } finally {
            clearTimeout(timeoutId);
            setIsSyncing(false);
        }
    };

    const clearFilters = () => {
        setPendingFilters(EMPTY_FILTERS);
        setAppliedFilters(EMPTY_FILTERS);
        setPage(1);
    };

    // Escapa valores CSV para prevenir inyección de fórmulas en Excel
    const escapeCsvValue = (val) => {
        const str = String(val ?? '');
        // Si el valor empieza con un carácter que Excel interpreta como fórmula, anteponer comilla simple
        const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
        // Si contiene comas o comillas, envolver en comillas dobles
        return sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n')
            ? `"${sanitized.replace(/"/g, '""')}"`
            : sanitized;
    };

    const handleExportExcel = () => {
        const headers = ["Company", "VendorID", "Proveedor", "Grupo", "Factura", "Moneda", "Monto", "Vencimiento"];
        const rows = sortedData.map(r => [
            r.meta?.company,
            r.meta?.vendor_id ?? r.meta?.vendorId,
            r.providerName,
            r.group,
            r.meta?.invoice,
            r.currency,
            r.amount ?? 0,
            r.dueDate
        ].map(escapeCsvValue).join(','));

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'cartera_proveedores.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    };

    const handleSaveManual = async () => {
        const { uuid, invoiceNum, company } = manualInvoice;
        if (!uuid && !invoiceNum) return setAddProcess({ status: 'error', step: -1, error: "Debes ingresar el UUID o el Número de Factura." });
        if (!company) return setAddProcess({ status: 'error', step: -1, error: "Selecciona una empresa." });

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (uuid && !uuidRegex.test(uuid)) {
            return setAddProcess({ status: 'error', step: -1, error: "El formato del UUID no es válido." });
        }

        setAddProcess({ status: 'processing', step: 0, error: null });

        // Simulación de pasos con delay para feedback visual
        for (let i = 0; i < processSteps.length; i++) {
            await new Promise(r => setTimeout(r, 700));

            // Validación de cruce (Negocio) en el paso 1
            if (i === 1 && uuid && invoiceNum) {
                const exists = rawInvoices.find(inv => inv.meta?.invoice === invoiceNum);
                if (exists && exists.uuid && exists.uuid !== uuid) {
                    setAddProcess({ status: 'error', step: i, error: `Discrepancia detectada: La factura ${invoiceNum} ya está asociada a otro UUID.` });
                    return;
                }
            }

            setAddProcess(prev => ({ ...prev, step: i }));
        }

        const newEntry = {
            id: uuid || `MAN-${Date.now()}`,
            uuid: uuid,
            providerName: "ALTA MANUAL",
            amount: 0, currency: "MXN",
            dueDate: new Date().toISOString().split('T')[0],
            status: 'pending', group: 'Sin Grupo', bankId: 'PENDIENTE-MXN',
            meta: { company, invoice: invoiceNum, isPayable: true, hasFiscalError: false }
        };

        setRawInvoices([newEntry, ...rawInvoices]);
        setAddProcess({ status: 'success', step: 3, error: null });

        setTimeout(() => {
            setIsModalOpen(false);
            setManualInvoice({ company: "", uuid: "", invoiceNum: "" });
            setAddProcess({ status: 'idle', step: -1, error: null });
            showToast(`Factura cargada correctamente.`);
        }, 1500);
    };

    // --- LÓGICA DE FILTRADO ---

    // Base filtrada con todos los filtros activos EXCEPTO el grupo del sidebar.
    // Fuente de verdad para el sidebar: sus totales siempre reflejan los filtros aplicados.
    // Si el lote está bloqueado (finalizado), mostramos las facturas finalizadas.
    const baseForGroups = useMemo(() => {
        const rawInvoicesArr = Array.isArray(rawInvoices) ? rawInvoices : [];
        const authorizedInvoicesArr = Array.isArray(authorizedInvoices) ? authorizedInvoices : [];

        // RESTAURACIÓN: Filtramos por error fiscal para que solo lo válido sea visible en V2
        const pending = rawInvoicesArr.filter(d => d?.meta && !d.meta.hasFiscalError).map(d => ({ ...d, _authStatus: 'pending' }));
        const authorized = authorizedInvoicesArr.filter(d => d?.meta && !d.meta.hasFiscalError).map(d => ({ ...d, _authStatus: 'authorized' }));
        let invoicesToConsider = [...pending, ...authorized];

        // Aseguramos que d.meta sea siempre un objeto para un acceso más seguro
        return invoicesToConsider.filter(d => {
            if (!d) return false;
            const meta = d.meta || {};

            const searchStr = `${d.providerName || ''} ${meta.invoice || ''} ${d.uuid || ''}`.toLowerCase();
            const matchSearch = searchStr.includes(searchTerm.toLowerCase());

            const matchDestino = appliedFilters.destino.length === 0 ||
                (meta.pais && appliedFilters.destino.includes(meta.pais)) ||
                (meta.destino && appliedFilters.destino.includes(meta.destino));

            const matchCompany = appliedFilters.company.length === 0 || (meta.company && appliedFilters.company.includes(meta.company));
            const matchCurrency = appliedFilters.currency.length === 0 || appliedFilters.currency.includes(d.currency);
            const matchGrupo = appliedFilters.grupo.length === 0 || appliedFilters.grupo.includes(d.group);
            const matchDocType = appliedFilters.documentType.length === 0 || appliedFilters.documentType.includes(meta.tipo_c || meta.document_type);
            const matchSubgrupo = appliedFilters.subgrupo.length === 0 || appliedFilters.subgrupo.includes(meta.subgrupo_c);
            const matchDate = !appliedFilters.dateCutoff || (d.dueDate && d.dueDate <= appliedFilters.dateCutoff);

            // Filtros individuales de Sidebar
            const matchSidebarProv = !sidebarFilters.provider || String(d.providerName || '').toLowerCase().includes(sidebarFilters.provider.toLowerCase());
            const matchSidebarComp = sidebarFilters.company.length === 0 || (meta.company && sidebarFilters.company.includes(meta.company));
            const matchSidebarGroup = sidebarFilters.group.length === 0 || (d.group && sidebarFilters.group.includes(d.group));
            const matchSidebarSub = sidebarFilters.subGroup.length === 0 || (meta.subgrupo_c && sidebarFilters.subGroup.includes(meta.subgrupo_c));

            return matchSearch && matchDestino && matchCompany && matchCurrency && matchDate && matchGrupo && matchDocType && matchSubgrupo && matchSidebarProv && matchSidebarComp && matchSidebarGroup && matchSidebarSub;
        });
    }, [rawInvoices, authorizedInvoices, searchTerm, appliedFilters, sidebarFilters]);

    // Agrupación de autorizados por proveedor para el modal
    const authByProvider = useMemo(() => {
        const groups = {};

        // Determinamos la fuente: Si no hay autorizadas en borrador, buscamos en el batch finalizado
        const source = (authorizedInvoices && authorizedInvoices.length > 0)
            ? authorizedInvoices
            : (finalizedInvoices || []);

        source.filter(inv => !inv.meta?.hasFiscalError).forEach(inv => {
            const pName = inv.providerName || inv.meta?.vendor_name || 'Proveedor Sin Nombre';
            if (!groups[pName]) {
                groups[pName] = { name: pName, total: 0, items: [] };
            }
            groups[pName].total += (inv.amount || 0);
            groups[pName].items.push(inv);
        });

        const list = Object.values(groups).sort((a, b) => b.total - a.total);
        if (!authModalSearch) return list;

        return list.filter(g =>
            g.name.toLowerCase().includes(authModalSearch.toLowerCase())
        );
    }, [authorizedInvoices, finalizedInvoices, authModalSearch]);

    // Vista de tabla: recorte de baseForGroups por el grupo seleccionado en el sidebar
    const filteredData = useMemo(() => {
        if (!selectedNode) return baseForGroups;

        return baseForGroups.filter(d => {
            const meta = d.meta || {};
            const getVal = (val, fallback) => (val === null || val === undefined || val === '') ? fallback : String(val);

            switch (selectedNode.type) {
                case 'Compañía (Nivel 1)':
                    return getVal(meta.company, 'Sin Empresa') === selectedNode.label;
                case 'Group Proveedor (Nivel 2)':
                    const groupName = meta.group_proveedor || d.group;
                    return getVal(groupName, 'Sin Grupo') === selectedNode.label;
                case 'Subgrupo (Nivel 3)':
                    return getVal(meta.subgrupo_c, 'General') === selectedNode.label;
                case 'Proveedor (Nivel 4)':
                    return getVal(d.providerName, 'Sin Proveedor') === selectedNode.label;
                case 'Punto de Compra (Nivel 5)':
                    const pp = meta.purchase_point || meta.pp_c;
                    return getVal(pp, 'Principal') === selectedNode.label;
                case 'Tipo de Documento (Nivel 6)':
                    const doc = meta.description_tran_doc_type || meta.document_type;
                    return getVal(doc, 'Sin Tipo') === selectedNode.label;
                default:
                    return true;
            }
        });
    }, [baseForGroups, selectedNode]);

    // --- LÓGICA DE JERARQUÍA PARA EL MODAL DE RESUMEN (UNIFICADO) ---
    const authHierarchy = useMemo(() => {
        const source = (authorizedInvoices && authorizedInvoices.length > 0)
            ? authorizedInvoices
            : (finalizedInvoices || []);

        const term = authModalSearch.toLowerCase();
        const filteredSource = source.filter(inv =>
            !term ||
            inv.providerName?.toLowerCase().includes(term) ||
            inv.meta?.company?.toLowerCase().includes(term) ||
            inv.meta?.invoice?.toLowerCase().includes(term)
        );

        const tree = {};
        filteredSource.forEach(inv => {
            const co = inv.meta?.company || 'Sin Empresa';
            const prov = inv.providerName || 'Sin Proveedor';

            if (!tree[co]) tree[co] = { name: co, mxn: 0, usd: 0, providers: {} };
            if (!tree[co].providers[prov]) tree[co].providers[prov] = { name: prov, mxn: 0, usd: 0, invoices: [] };

            if (inv.currency === 'USD') {
                tree[co].usd += inv.amount;
                tree[co].providers[prov].usd += inv.amount;
            } else {
                tree[co].mxn += inv.amount;
                tree[co].providers[prov].mxn += inv.amount;
            }
            tree[co].providers[prov].invoices.push(inv);
        });
        return tree;
    }, [authorizedInvoices, finalizedInvoices, authModalSearch]);

    const toggleAuthNode = (id) => {
        setCollapsedAuthNodes(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCollapseToProviders = () => {
        const newCollapsed = {};
        Object.entries(authHierarchy).forEach(([coName, coData]) => {
            // Mantenemos la empresa expandida
            newCollapsed[coName] = false;
            // Colapsamos cada proveedor individualmente
            Object.keys(coData.providers).forEach(pName => {
                newCollapsed[`${coName}-${pName}`] = true;
            });
        });
        setCollapsedAuthNodes(newCollapsed);
    };

    // --- ORDENAMIENTO ---
    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig.key) {
            sortableItems.sort((a, b) => {
                const aVal = a[sortConfig.key] || a.meta?.[sortConfig.key];
                const bVal = b[sortConfig.key] || b.meta?.[sortConfig.key];
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);

    // --- Conteo de pendientes por grupo (para botón del sidebar) ---
    // Usa baseForGroups para que el conteo sea coherente con los totales del sidebar

    const pendingTotal = filteredData.filter(d => d._authStatus === 'pending').length;

    // Resetear página cuando cambian los filtros del sidebar o el grupo seleccionado
    useEffect(() => { setPage(1); }, [sidebarFilters, selectedNode, searchTerm, appliedFilters]);

    // --- LÓGICA DE AUTORIZACIÓN ---
    const stripAuthStatus = ({ _authStatus, ...inv }) => inv;

    const handleAuthorizeInvoice = (invoice) => {
        setRawInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
        if (setAuthorizedInvoices) setAuthorizedInvoices(prev => [...prev, stripAuthStatus(invoice)]);
    };

    const handleRevokeInvoice = (invoice) => {
        // Quitar de autorizados y devolver a pendientes
        if (setAuthorizedInvoices) setAuthorizedInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
        // También asegurar que se elimine de la lista de finalizados si el batch ya se cerró
        if (setFinalizedInvoices) setFinalizedInvoices(prev => prev.filter(inv => inv.id !== invoice.id));
        setRawInvoices(prev => [...prev, stripAuthStatus(invoice)]);
    };

    const handleMassRevoke = (invoicesToRevoke, scopeName) => {
        showConfirm(`¿Quitar ${invoicesToRevoke.length} factura(s) de "${scopeName}" de la propuesta?`, () => {
            const ids = new Set(invoicesToRevoke.map(d => d.id));
            if (setAuthorizedInvoices) setAuthorizedInvoices(prev => prev.filter(inv => !ids.has(inv.id)));
            if (setFinalizedInvoices) setFinalizedInvoices(prev => prev.filter(inv => !ids.has(inv.id)));
            setRawInvoices(prev => [...prev, ...invoicesToRevoke.map(stripAuthStatus)]);
        });
    };

    const handleAuthorizeGroup = (groupCode) => {
        const toAuth = filteredData.filter(d => d._authStatus === 'pending' && d.group === groupCode);
        if (toAuth.length === 0) return;
        const ids = new Set(toAuth.map(d => d.id));
        setRawInvoices(prev => prev.filter(inv => !ids.has(inv.id)));
        if (setAuthorizedInvoices) setAuthorizedInvoices(prev => [...prev, ...toAuth.map(stripAuthStatus)]);
    };

    const handleAuthorizeAll = () => {
        const toAuth = filteredData.filter(d => d._authStatus === 'pending');
        if (toAuth.length === 0) return;

        const nodeScope = selectedNode ? `de "${selectedNode.label}"` : "del resultado actual";

        showConfirm(
            `¿Añadir ${toAuth.length} factura${toAuth.length !== 1 ? 's' : ''} ${nodeScope} a la propuesta?`,
            () => {
                const ids = new Set(toAuth.map(d => d.id));
                setRawInvoices(prev => prev.filter(inv => !ids.has(inv.id)));
                if (setAuthorizedInvoices) setAuthorizedInvoices(prev => [...prev, ...toAuth.map(stripAuthStatus)]);
            }
        );
    };

    const handleFinalizeBatch = () => {
        if ((authorizedInvoices || []).length === 0) {
            showToast("No hay facturas autorizadas para cerrar el lote.");
            return;
        }
        showConfirm(
            `¿Cerrar lote y enviar ${authorizedInvoices.length} factura${authorizedInvoices.length !== 1 ? 's' : ''} a Pagos Autorizados?`,
            () => {
                const batchId = `BCH-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
                const totalMXN = authorizedInvoices.filter(i => i.currency !== 'USD').reduce((s, i) => s + (i.amount || 0), 0);
                const totalUSD = authorizedInvoices.filter(i => i.currency === 'USD').reduce((s, i) => s + (i.amount || 0), 0);
                const newBatch = {
                    id: batchId,
                    status: 'review',
                    createdAt: new Date().toISOString(),
                    invoiceCount: authorizedInvoices.length,
                    totalMXN,
                    totalUSD,
                };
                if (setFinalizedInvoices) setFinalizedInvoices([...authorizedInvoices]);
                if (setAuthorizedInvoices) setAuthorizedInvoices([]);
                if (setActiveBatch) setActiveBatch({ ...newBatch, status: 'finalized' });
                if (setBatchList) setBatchList(prev => [newBatch, ...(prev || [])]);
                setIsAuthModalOpen(false); // Cerramos el modal tras el éxito
                setSelectedNode(null);
                setPage(1);
                showToast(`Lote cerrado: ${batchId}`);
            }
        );
    };

    // --- CERRAR BATCH (jefe envía a dirección) ---
    const handleCloseBatch = (batchId) => {
        if (setBatchList) {
            setBatchList(prev => prev.map(b => b.id === batchId ? { ...b, status: 'closed' } : b));
        }
        showToast(`Batch ${batchId} marcado como CERRADO.`);
    };

    // --- LÓGICA DE ÁRBOL JERÁRQUICO (Jerarquía: Compañía > Grupo > Proveedor > Purchase Point > Doc Type) ---
    const hierarchicalTree = useMemo(() => {
        const root = {};

        (baseForGroups || []).filter(inv => inv && inv.meta).forEach(inv => {
            const meta = inv.meta || {};
            const co = meta.company || 'Sin Empresa';
            const gr = meta.group_proveedor || inv.group || 'Sin Grupo';
            const prov = inv.providerName || 'Sin Proveedor';
            const doc = meta.description_tran_doc_type || meta.document_type || 'Sin Tipo';
            const pp = meta.purchase_point || meta.pp_c || 'Principal';
            const sub = meta.subgrupo_c || meta.subgroup || 'General';

            // Definición de niveles solicitados
            const levels = [
                { id: co, label: co, type: 'Compañía (Nivel 1)' },
                { id: gr, label: gr, type: 'Group Proveedor (Nivel 2)' },
                { id: sub, label: sub, type: 'Subgrupo (Nivel 3)' },
                { id: prov, label: prov, type: 'Proveedor (Nivel 4)' },
                { id: pp, label: pp, type: 'Punto de Compra (Nivel 5)' },
                { id: doc, label: doc, type: 'Tipo de Documento (Nivel 6)' }
            ];

            let current = root;
            levels.forEach(lvl => {
                if (!current[lvl.id]) {
                    current[lvl.id] = {
                        label: lvl.label,
                        type: lvl.type,
                        mxn: 0,
                        usd: 0,
                        mxnTax: 0,
                        usdTax: 0,
                        count: 0,
                        children: {}
                    };
                }
                const node = current[lvl.id];
                if (inv.currency === 'USD') {
                    node.usd += inv.amount;
                    node.usdTax += (inv.amount * 0.16);
                } else {
                    node.mxn += inv.amount;
                    node.mxnTax += (inv.amount * 0.16);
                }
                node.count++;
                current = node.children;
            });
        });
        return root;
    }, [baseForGroups]);

    // --- KPIs ---
    const kpis = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const providers = new Set(filteredData.map(i => i.providerName));
        const mxn = filteredData.filter(i => i.currency === 'MXN').reduce((sum, i) => sum + i.amount, 0);
        const usd = filteredData.filter(i => i.currency === 'USD').reduce((sum, i) => sum + i.amount, 0);

        const overdueMxn = filteredData.filter(i => i.currency === 'MXN' && i.dueDate < today).reduce((s, i) => s + i.amount, 0);
        const overdueUsd = filteredData.filter(i => i.currency === 'USD' && i.dueDate < today).reduce((s, i) => s + i.amount, 0);
        const upcomingMxn = filteredData.filter(i => i.currency === 'MXN' && i.dueDate >= today).reduce((s, i) => s + i.amount, 0);
        const upcomingUsd = filteredData.filter(i => i.currency === 'USD' && i.dueDate >= today).reduce((s, i) => s + i.amount, 0);

        // Improcedentes: Calculado sobre rawInvoices aplicando filtros de cabecera
        const rawArr = Array.isArray(rawInvoices) ? rawInvoices : [];
        const errorsCount = rawArr.filter(d => {
            if (!d?.meta?.hasFiscalError) return false;
            const meta = d.meta;
            const matchDestino = appliedFilters.destino.length === 0 ||
                (meta.pais && appliedFilters.destino.includes(meta.pais)) ||
                (meta.destino && appliedFilters.destino.includes(meta.destino));
            const matchCompany = appliedFilters.company.length === 0 || (meta.company && appliedFilters.company.includes(meta.company));
            return matchDestino && matchCompany;
        }).length;

        return { mxn, usd, overdueMxn, overdueUsd, upcomingMxn, upcomingUsd, providers: providers.size, errors: errorsCount, total: filteredData.length };
    }, [filteredData, rawInvoices, appliedFilters]);

    // KPIs exclusivos para la data autorizada (Resumen del Modal)
    const authKpis = useMemo(() => {
        const source = (authorizedInvoices && authorizedInvoices.length > 0) ? authorizedInvoices : (finalizedInvoices || []);
        const today = new Date().toISOString().split('T')[0];

        const mxn = source.filter(i => i.currency === 'MXN').reduce((sum, i) => sum + i.amount, 0);
        const usd = source.filter(i => i.currency === 'USD').reduce((sum, i) => sum + i.amount, 0);

        const overdueMxn = source.filter(i => i.currency === 'MXN' && i.dueDate < today).reduce((s, i) => s + i.amount, 0);
        const overdueUsd = source.filter(i => i.currency === 'USD' && i.dueDate < today).reduce((s, i) => s + i.amount, 0);
        const upcomingMxn = source.filter(i => i.currency === 'MXN' && i.dueDate >= today).reduce((s, i) => s + i.amount, 0);
        const upcomingUsd = source.filter(i => i.currency === 'USD' && i.dueDate >= today).reduce((s, i) => s + i.amount, 0);

        return {
            mxn, usd, overdueMxn, overdueUsd, upcomingMxn, upcomingUsd,
            total: source.length
        };
    }, [authorizedInvoices, finalizedInvoices]);

    const paginatedData = sortedData.slice((page - 1) * pageSize, page * pageSize);
    const totalPages = Math.ceil(sortedData.length / pageSize) || 1;

    return (
        <div className="h-full flex flex-col gap-2 animate-fade-in">
            <style>{`
                .hs-table-header {
                    background-color: ${HS.blueBase};
                    background-color: ${HS.blueBase || '#0082a6'};
                    color: ${HS.white};
                }
                .hs-input::placeholder {
                    color: ${HS.gray3};
                    font-size: 14px;
                    opacity: 1;
                }
            `}</style>

            {/* 1. Header & Global Filters */}
            <div className="shrink-0 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm z-30">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-50">
                    <div className="flex items-center">
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase" style={{ fontFamily: HS.fontTitle }}>
                                Gestión de Pagos V2
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                Portal HS · Cartera de Proveedores
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setSelectedAuthProvider(null); setIsAuthModalOpen(true); }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all duration-500 shadow-sm border
                                ${authByProvider.length > 0
                                    ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 animate-pulse ring-2 ring-indigo-500/20'
                                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50 opacity-60'}`}
                        >
                            <Eye size={14} />
                            Ver Resumen
                            {authByProvider.length > 0 && <span className="ml-1 bg-white/20 px-1.5 py-0.5 rounded-full text-[9px]">{authorizedInvoices.length || finalizedInvoices.length}</span>}
                        </button>
                        <div className="h-6 w-px bg-slate-200" />
                        <button onClick={() => setIsHeaderOpen(v => !v)} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100">
                            {isHeaderOpen ? <><ChevronUp size={14} /> Ocultar Filtros</> : <><ChevronDown size={14} /> Mostrar Filtros</>}
                        </button>
                    </div>
                </div>
                {isHeaderOpen && (
                    <div className="px-4 py-3 bg-slate-50/50">
                        <div className="flex flex-wrap gap-3 items-end">
                            <MultiSelectHeaderFilter label="Filtro 1: Destino" options={dynamicOptions.destinos} selectedValues={pendingFilters.destino} onChange={(val) => setPendingFilters(p => ({ ...p, destino: val }))} />
                            <MultiSelectHeaderFilter label="Filtro 2: Compañía" options={dynamicOptions.companies} selectedValues={pendingFilters.company} onChange={(val) => setPendingFilters(p => ({ ...p, company: val }))} />
                            <MultiSelectHeaderFilter label="Filtro 3: Moneda" options={dynamicOptions.currencies} selectedValues={pendingFilters.currency} onChange={(val) => setPendingFilters(p => ({ ...p, currency: val }))} />
                            <MultiSelectHeaderFilter label="Filtro 4: Grupo Proveedor" options={dynamicOptions.grupos} selectedValues={pendingFilters.grupo} onChange={(val) => setPendingFilters(p => ({ ...p, grupo: val }))} />
                            <MultiSelectHeaderFilter label="Filtro 5: Sub Grupo" options={dynamicOptions.subgrupos} selectedValues={pendingFilters.subgrupo} onChange={(val) => setPendingFilters(p => ({ ...p, subgrupo: val }))} />
                            <MultiSelectHeaderFilter label="Filtro 6: Tipo Doc" options={dynamicOptions.docTypes} selectedValues={pendingFilters.documentType} onChange={(val) => setPendingFilters(p => ({ ...p, documentType: val }))} />
                            <div className="min-w-[120px]">
                                <label className={filterLabel}>Fecha de Corte</label>
                                <input type="date" className={filterInputClass} value={pendingFilters.dateCutoff} onChange={(e) => setPendingFilters(p => ({ ...p, dateCutoff: e.target.value }))} />
                            </div>
                        </div>

                        {/* Cinta de Acciones de Filtro y Guardado */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-200">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtros Guardados:</label>
                                    <div className="flex gap-1.5 overflow-x-auto max-w-md pb-1">
                                        {savedFilterSets.length === 0 && <span className="text-[10px] text-slate-300 italic">No hay filtros guardados</span>}
                                        {savedFilterSets.map(s => (
                                            <div key={s.id} className="group flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-sm hover:border-primary transition-all">
                                                <button onClick={() => setPendingFilters(s.config)} className="text-[9px] font-bold text-slate-600 hover:text-primary whitespace-nowrap">{s.name}</button>
                                                <button onClick={() => handleDeleteSavedFilter(s.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {showSaveInput ? (
                                    <div className="flex items-center gap-1 animate-fade-in">
                                        <input
                                            type="text"
                                            placeholder="Nombre del filtro..."
                                            className="px-2 py-1 text-[10px] border border-primary rounded outline-none w-32"
                                            value={newFilterName}
                                            onChange={(e) => setNewFilterName(e.target.value)}
                                        />
                                        <button onClick={handleSaveCurrentFilters} className="p-1 bg-primary text-white rounded hover:bg-primary/90"><Check size={12} /></button>
                                        <button onClick={() => setShowSaveInput(false)} className="p-1 bg-slate-200 text-slate-500 rounded hover:bg-slate-300"><X size={12} /></button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowSaveInput(true)}
                                        className="flex items-center gap-1 text-[10px] font-black text-primary hover:underline uppercase tracking-tighter"
                                    >
                                        <Save size={12} /> Guardar Filtro Actual
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button onClick={clearFilters} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                                    <RefreshCw size={13} /> Limpiar
                                </button>
                                <button onClick={handleSyncAndSearch} disabled={isSyncing} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm disabled:opacity-60">
                                    {isSyncing ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                                    {isSyncing ? 'Buscando...' : 'BUSCAR'}
                                </button>
                            </div>
                        </div>
                        {syncError && <p className="mt-2 text-xs text-red-500 font-medium">{syncError}</p>}
                    </div>
                )}
            </div>

            {/* 2. Main Layout: Full-Height Sidebar + Right Content Column */}
            <div ref={containerRef} className={`flex-1 min-h-0 flex overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'gap-3' : 'gap-0'}`}>

                {/* Sidebar Izquierdo (Full Height) */}
                <div className="relative flex shrink-0 group">
                    <div
                        className={`flex flex-col gap-2 min-h-0 p-2 border border-slate-200 rounded-xl bg-white overflow-y-auto shadow-sm transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[450px] opacity-100' : 'w-0 p-0 border-0 opacity-0 overflow-hidden'}`}
                    >
                        {/* Sidebar Filters */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
                            <div className="flex justify-between items-center mb-1 cursor-pointer select-none" onClick={() => toggleCollapse('filters')}>
                                <div className="flex items-center gap-2">
                                    {collapsedSections.filters ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronUp size={12} className="text-slate-400" />}
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtros de Árbol</span>
                                </div>
                                {!collapsedSections.filters && (
                                    <button onClick={(e) => { e.stopPropagation(); setSidebarFilters({ provider: "", company: [], group: [], subGroup: [] }); }} className="text-[8px] font-bold text-primary hover:underline flex items-center gap-1">
                                        <RefreshCw size={8} /> Limpiar
                                    </button>
                                )}
                            </div>
                            {!collapsedSections.filters && (
                                <div className="grid grid-cols-1 gap-2 animate-fade-in">
                                    <MultiSelectHeaderFilter label="Compañía" options={dynamicOptions.companies} selectedValues={sidebarFilters.company} onChange={(val) => setSidebarFilters(p => ({ ...p, company: val }))} />
                                    <MultiSelectHeaderFilter label="Grupo de Proveedor" options={dynamicOptions.grupos} selectedValues={sidebarFilters.group} onChange={(val) => setSidebarFilters(p => ({ ...p, group: val }))} />
                                    <MultiSelectHeaderFilter label="SubGrupo" options={dynamicOptions.subgrupos} selectedValues={sidebarFilters.subGroup} onChange={(val) => setSidebarFilters(p => ({ ...p, subGroup: val }))} />
                                    <div className="mt-1">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-wide mb-0.5">Proveedor</label>
                                        <input type="text" placeholder="Escribe nombre..." className="w-full px-2 py-1.5 text-[10px] border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-primary hs-input" value={sidebarFilters.provider} onChange={(e) => setSidebarFilters(p => ({ ...p, provider: e.target.value }))} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Tree View */}
                        <div className="bg-white border border-slate-200 rounded-xl flex flex-col min-h-0 overflow-hidden shadow-sm" style={{ flexGrow: 1, minHeight: '120px' }}>
                            <div className="px-3 py-2 border-b flex items-center justify-between text-white cursor-pointer select-none" style={{ backgroundColor: HS.tealDark, borderBottomColor: HS.tealBase }} onClick={() => toggleCollapse('tree')}>
                                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                                    {collapsedSections.tree ? <ChevronDown size={12} className="text-blue-400" /> : <ChevronUp size={12} className="text-blue-400" />}
                                    <Layers size={14} className="text-blue-400" />
                                    <span>Estructura de Cartera</span>
                                </div>
                                {!collapsedSections.tree && (
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => setAllExpanded(true)} className="p-1.5 hover:bg-white/20 rounded-md transition-all text-blue-200 hover:text-white"><Maximize2 size={13} /></button>
                                        <button onClick={() => setAllExpanded(false)} className="p-1.5 hover:bg-white/20 rounded-md transition-all text-blue-200 hover:text-white"><Minimize2 size={13} /></button>
                                    </div>
                                )}
                            </div>
                            {!collapsedSections.tree && (
                                <div className="flex-1 overflow-y-auto p-2 animate-fade-in">
                                    <RenderTreeNode
                                        nodes={hierarchicalTree}
                                        selectedNode={selectedNode}
                                        onGroupSelect={(nodeInfo) => {
                                            // Si el usuario hace clic en el mismo nodo, deseleccionamos (toggle)
                                            if (selectedNode?.id === nodeInfo.id && selectedNode?.type === nodeInfo.type) {
                                                setSelectedNode(null);
                                            } else {
                                                setSelectedNode(nodeInfo);
                                            }
                                            setPage(1);
                                        }}
                                        forceOpen={allExpanded}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Totales Resumen (Dark Panel) */}
                        <div className="shrink-0 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl space-y-3" style={{ backgroundColor: HS.tealDark }}>
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2 cursor-pointer select-none" onClick={() => toggleCollapse('summary')}>
                                <div className="flex items-center gap-2">
                                    {collapsedSections.summary ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronUp size={12} className="text-slate-500" />}
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Resumen Árbol</span>
                                </div>
                                <Badge status="info" className="text-[9px] px-2 py-0 font-mono">{kpis.total} Docs</Badge>
                            </div>
                            {!collapsedSections.summary && (
                                <div className="space-y-2 animate-fade-in">
                                    <div className="flex justify-between items-baseline"><span className="text-[10px] font-bold text-slate-400 uppercase">Total MXN</span><span className="text-xs font-mono font-bold text-white">{formatCurrency(kpis.mxn)}</span></div>
                                    <div className="flex justify-between items-baseline"><span className="text-[10px] font-bold text-blue-400 uppercase">Total USD</span><span className="text-xs font-mono font-bold text-blue-100">{formatCurrency(kpis.usd, 'USD')} USD</span></div>

                                    <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">Vencidas MN</span>
                                            <span className="text-[10px] font-mono text-red-200">{formatCurrency(kpis.overdueMxn, 'MXN')}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">Vencidas USD</span>
                                            <span className="text-[10px] font-mono text-red-200">{formatCurrency(kpis.overdueUsd, 'USD')} USD</span>
                                        </div>
                                    </div>

                                    <div className="mt-2 pt-2 border-t border-slate-800 space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Por Vencer MN</span>
                                            <span className="text-[10px] font-mono text-emerald-200">{formatCurrency(kpis.upcomingMxn, 'MXN')}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Por Vencer USD</span>
                                            <span className="text-[10px] font-mono text-emerald-200">{formatCurrency(kpis.upcomingUsd, 'USD')} USD</span>
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-slate-700 mt-2">
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Gran Total</span>
                                                <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700" onClick={e => e.stopPropagation()}>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">T.C.</span>
                                                    <input type="number" step="0.01" className="w-10 bg-transparent text-[10px] font-mono text-blue-400 outline-none" value={exchangeRate} onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)} />
                                                </div>
                                            </div>
                                            <p className="text-xl font-black text-white tracking-tighter tabular-nums">{formatCurrency(kpis.mxn + (kpis.usd * exchangeRate), 'MXN')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Gatillo de Colapso Flotante (Flecha Estilo Menú) */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className={`absolute top-1/2 -translate-y-1/2 -right-3 z-40 w-6 h-10 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center text-slate-400 hover:text-primary transition-all duration-300 hover:bg-slate-50 ${!isSidebarOpen ? 'translate-x-3 opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        title={isSidebarOpen ? "Ocultar panel" : "Mostrar panel"}
                    >
                        {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                    </button>
                </div>

                {/* 3. Columna de Contenido Derecha (KPIs + Tabla) */}
                <div className="flex-1 flex flex-col gap-3 min-w-0">

                    {/* KPIs Dashboard (Cinta Compacta) */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                        <div className="bg-white border border-slate-200 border-l-4 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-sm" style={{ borderLeftColor: HS.blueBase }}>
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0"><Calculator size={16} /></div>
                            <div className="min-w-0">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Total Por Pagar</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-[11px] font-bold text-slate-700 truncate">MXN {formatCurrency(kpis.mxn, 'MXN')}</p>
                                    <span className="text-[8px] font-bold text-emerald-500">+12%</span>
                                </div>
                                <p className="text-[11px] font-bold text-slate-700 truncate">USD {formatCurrency(kpis.usd, 'USD')}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 border-l-4 border-l-indigo-500 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-sm">
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg shrink-0"><Users size={16} /></div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Proveedores</p>
                                <p className="text-lg font-black text-slate-800 leading-none">{kpis.providers}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 border-l-4 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-sm" style={{ borderLeftColor: HS.tealBase }}>
                            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0"><FileSpreadsheet size={16} /></div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Pendientes</p>
                                <p className="text-lg font-black text-slate-800 leading-none">{kpis.total - (authorizedInvoices || []).length}</p>
                            </div>
                        </div>
                        <div
                            onClick={() => kpis.errors > 0 && setIsImprocedentesModalOpen(true)}
                            className={`bg-white border border-slate-200 border-l-4 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-sm transition-all ${kpis.errors > 0 ? 'animate-pulse cursor-pointer hover:bg-red-50/50' : 'opacity-60'}`}
                            style={{ borderLeftColor: kpis.errors > 0 ? HS.error : HS.gray1 }}
                        >
                            <div className={`p-1.5 rounded-lg shrink-0 ${kpis.errors > 0 ? 'bg-red-50' : 'bg-slate-50'}`} style={{ color: kpis.errors > 0 ? HS.error : HS.gray3 }}><ShieldAlert size={16} /></div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Improcedentes</p>
                                <p className="text-lg font-black text-slate-800 leading-none">{kpis.errors}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabla Principal */}
                    <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">

                        {/* Barra sobre la tabla: búsqueda + acciones */}
                        <div className="shrink-0 px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center gap-2 flex-wrap">
                            <div className="relative flex-1 min-w-[140px]">
                                <Search className="absolute left-2 top-1.5 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Buscar proveedor o factura..."
                                    className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary/20"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Botón de Acción Masiva (Dinámico por Nodo) */}
                            {pendingTotal > 0 && (
                                <button onClick={handleAuthorizeAll}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-emerald-700 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors shrink-0">
                                    <CheckCircle2 size={13} />
                                    {selectedNode ? 'AÑADIR SECCIÓN' : 'AÑADIR TODO'} ({pendingTotal})
                                </button>
                            )}

                            {/* Generar batch con facturas autorizadas */}
                            {(authorizedInvoices || []).length > 0 && (
                                <button onClick={handleFinalizeBatch}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm shrink-0 animate-pulse">
                                    <Lock size={13} /> GENERAR BATCH ({authorizedInvoices.length})
                                </button>
                            )}

                            <button onClick={handleExportExcel}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg transition-colors shrink-0">
                                <Download size={13} /> Excel
                            </button>
                            <button onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-black text-white bg-teal-600 border border-teal-700 hover:bg-teal-700 rounded-lg transition-all shrink-0 shadow-md">
                                <Plus size={13} /> AGREGAR FACTURA
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[8px]">
                                        {[
                                            { id: 'company', label: 'COMPAÑIA' },
                                            { id: 'description_tran_doc_type', label: 'TIPO DOC' },
                                            { id: 'invoice', label: 'INVOICE NUM' },
                                            { id: 'po', label: 'PO' },
                                            { id: 'providerName', label: 'NOMBRE PROV' },
                                            { id: 'description', label: 'DESCRIPCION' },
                                            { id: 'comments', label: 'COMMENTS' },
                                            { id: 'invoice_date', label: 'FECHA FACTURA' },
                                            { id: 'dueDate', label: 'DUE DATE' },
                                            { id: 'terms', label: 'TERMS' },
                                            { id: 'currency', label: 'MONEDA' },
                                            { id: 'amount', label: 'BALANCE' },
                                            { id: 'vencimiento_status', label: 'ETIQUETA VENCIMIENTO' },
                                            { id: 'hasFiscalError', label: 'ESTATUS' }
                                        ].map((col) => (
                                            <th
                                                key={col.id}
                                                className="px-3 py-3 cursor-pointer hover:text-primary whitespace-nowrap bg-slate-50 transition-colors"
                                                onClick={() => handleSort(col.id)}
                                            >
                                                <div className={`flex items-center gap-1 ${col.id === 'amount' ? 'justify-end' : ''}`}>
                                                    {col.label} {getSortIcon(col.id)}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="px-3 py-2.5 text-center w-24 sticky right-0 bg-slate-100 border-l shadow-[-4px_0_10px_rgba(0,0,0,0.05)] z-20">ACCION</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-xs">
                                                Sin resultados. Ajusta los filtros y presiona BUSCAR.
                                            </td>
                                        </tr>
                                    ) : paginatedData.map((inv, idx) => {
                                        const isAuth = inv._authStatus === 'authorized';
                                        const today = new Date().toISOString().split('T')[0];
                                        const isOverdue = inv.dueDate < today;

                                        return (
                                            <tr key={`${inv.id}-${idx}`} className={`transition-colors ${isAuth ? 'bg-emerald-50/60 hover:bg-emerald-50' : 'hover:bg-blue-50/30'}`}>
                                                <td className="px-3 py-3 font-medium text-slate-700 whitespace-nowrap">{inv.meta?.company}</td>
                                                <td className="px-3 py-3 text-slate-500 uppercase text-[9px]">{inv.meta?.description_tran_doc_type || inv.meta?.document_type}</td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-1.5 font-mono text-slate-600 font-bold">
                                                        {inv.meta?.invoice || String(inv.id || '').slice(0, 10)}
                                                        {inv.meta?.isH2H && <span className="bg-indigo-100 text-indigo-700 text-[7px] px-1 rounded font-black">H2H</span>}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3 text-slate-400 font-mono">{inv.meta?.po || '—'}</td>
                                                <td className="px-3 py-3 font-black text-slate-800 whitespace-nowrap">{inv.providerName}</td>
                                                <td className="px-3 py-3 text-slate-500 truncate max-w-[140px]" title={inv.meta?.description}>{inv.meta?.description || '—'}</td>
                                                <td className="px-3 py-3 text-slate-400 italic truncate max-w-[120px]" title={inv.meta?.comments}>{inv.meta?.comments || '—'}</td>
                                                <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{inv.meta?.invoice_date || '—'}</td>
                                                <td className="px-3 py-3 text-slate-600 font-bold whitespace-nowrap">{inv.dueDate}</td>
                                                <td className="px-3 py-3 text-slate-400 text-[9px]">{inv.meta?.terms || '—'}</td>
                                                <td className="px-3 py-3 font-bold text-slate-400">{inv.currency}</td>
                                                <td className="px-3 py-3 text-right font-black text-slate-800">{formatCurrency(inv.amount, inv.currency)}</td>
                                                <td className="px-3 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${isOverdue ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                        {isOverdue ? 'VENCIDO' : 'POR VENCER'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    {inv.meta?.hasFiscalError ? (
                                                        <div className="group relative inline-block">
                                                            <Badge status="danger" className="text-[8px] py-0">FISCAL ERR</Badge>
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl z-50">
                                                                {inv.meta?.validationErrors?.[0] || "Error en validación fiscal"}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Badge status="success" className="text-[8px] py-0">VIGENTE</Badge>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-center sticky right-0 bg-white/90 backdrop-blur-sm group-hover:bg-slate-50 transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.05)] border-l">
                                                    {isAuth ? (
                                                        <button
                                                            onClick={() => handleRevokeInvoice(inv)}
                                                            className="text-[9px] font-black px-2 py-1 bg-amber-500 text-white hover:bg-amber-600 rounded shadow-sm transition-all w-full uppercase tracking-tighter"
                                                        >
                                                            Devolver
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAuthorizeInvoice(inv)}
                                                            className="text-[9px] font-black px-2 py-1 bg-emerald-500 text-white hover:bg-emerald-600 rounded shadow-sm transition-all w-full uppercase tracking-tighter"
                                                        >
                                                            Añadir
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        <div className="shrink-0 px-4 py-2 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                Página {page} de {totalPages} · {filteredData.length} registros
                            </span>
                            <div className="flex gap-1">
                                <button onClick={() => setPage(Math.max(1, page - 1))} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30" disabled={page === 1}><ChevronLeft size={15} /></button>
                                <button onClick={() => setPage(Math.min(totalPages, page + 1))} className="p-1 rounded hover:bg-slate-200 disabled:opacity-30" disabled={page === totalPages}><ChevronRight size={15} /></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toast de notificación */}
                {toast && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] animate-fade-in">
                        <div className="bg-slate-800 text-white text-xs font-semibold px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
                            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
                            {toast}
                        </div>
                    </div>
                )}

                {/* Modal de confirmación genérico */}
                {confirmDialog && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full mx-4 animate-fade-in-up">
                            <p className="text-sm font-semibold text-slate-700 mb-6 leading-relaxed">{confirmDialog.message}</p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setConfirmDialog(null)}
                                    className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                                    className="px-4 py-2 text-xs font-black text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors shadow-sm"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Añadir Manual */}
                <Modal isOpen={isModalOpen} onClose={() => { if (addProcess.status !== 'processing') setIsModalOpen(false); }} title="Módulo de Carga: Factura Individual" size="sm">
                    <div className="space-y-4 relative">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Selecciona Empresa</label>
                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                value={manualInvoice.company}
                                onChange={(e) => setManualInvoice({ ...manualInvoice, company: e.target.value })}>
                                <option value="">— Seleccionar Empresa de la Fuente —</option>
                                {dynamicOptions.companies.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">UUID (Folio Fiscal)</label>
                            <input type="text" placeholder="Ingrese UUID..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                value={manualInvoice.uuid}
                                onChange={(e) => setManualInvoice({ ...manualInvoice, uuid: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Número de Factura</label>
                            <input type="text" placeholder="Ingrese número de factura..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                value={manualInvoice.invoiceNum}
                                onChange={(e) => setManualInvoice({ ...manualInvoice, invoiceNum: e.target.value })} />
                        </div>

                        {addProcess.status !== 'idle' && (
                            <div className={`p-4 rounded-xl border-2 animate-fade-in ${addProcess.status === 'processing' ? 'border-blue-100 bg-blue-50' :
                                addProcess.status === 'success' ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {addProcess.status === 'processing' && <RefreshCw size={16} className="animate-spin text-blue-600" />}
                                    <div className="flex-1">
                                        <p className={`text-xs font-bold ${addProcess.status === 'error' ? 'text-red-700' : 'text-slate-700'}`}>
                                            {addProcess.status === 'error' ? addProcess.error : processSteps[addProcess.step]}
                                        </p>
                                        {addProcess.status === 'processing' && (
                                            <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                                                <div className="bg-blue-600 h-full transition-all duration-700" style={{ width: `${(addProcess.step + 1) * 25}%` }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <Button
                            variant="primary"
                            className="w-full py-3"
                            onClick={handleSaveManual}
                            disabled={addProcess.status === 'processing'}
                        >
                            {addProcess.status === 'processing' ? 'Procesando...' : 'Agregar a Propuesta'}
                        </Button>
                    </div>
                </Modal>

                {/* Modal de Facturas Autorizadas por Proveedor */}
                <Modal
                    isOpen={isAuthModalOpen}
                    onClose={() => {
                        setIsAuthModalOpen(false);
                        setSelectedAuthProvider(null);
                        setAuthModalSearch("");
                        setCollapsedAuthNodes({});
                    }}
                    title={authorizedInvoices.length > 0 ? "Revisión Unificada de Propuesta" : "Detalle de Batch Finalizado"}
                    size="lg"
                >
                    <div className="flex flex-col gap-4 h-[75vh]">
                        {/* Barra de Búsqueda rápida */}
                        <div className="shrink-0 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                <input type="text" placeholder="Filtrar por empresa, proveedor o factura..."
                                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                    value={authModalSearch} onChange={(e) => setAuthModalSearch(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={handleCollapseToProviders} className="p-2 text-slate-500 hover:text-primary bg-white border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter" title="Ver solo proveedores">
                                    <Minimize2 size={12} /> Colapsar Prov.
                                </button>
                                <button onClick={() => setCollapsedAuthNodes({})} className="p-2 text-slate-500 hover:text-primary bg-white border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter" title="Expandir todo">
                                    <Maximize2 size={12} /> Expandir
                                </button>
                            </div>
                        </div>

                        {/* Tabla Jerárquica Principal */}
                        <div className="flex-1 overflow-auto bg-white border border-slate-200 rounded-xl shadow-sm">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 bg-slate-800 text-white z-10 font-black uppercase text-[9px] tracking-widest">
                                    <tr>
                                        <th className="p-3">Jerarquía (Empresa / Proveedor / Factura)</th>
                                        <th className="p-3 text-center">Moneda</th>
                                        <th className="p-3 text-right">Monto</th>
                                        <th className="p-3 text-center w-32">Gestión</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {Object.entries(authHierarchy).map(([coName, coData]) => (
                                        <React.Fragment key={coName}>
                                            {/* Nivel: Empresa */}
                                            <tr className="bg-slate-50/80 group">
                                                <td className="p-2 font-black text-primary flex items-center gap-2 cursor-pointer" onClick={() => toggleAuthNode(coName)}>
                                                    {collapsedAuthNodes[coName] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                                    <span className="text-[10px] tracking-tight">📁 {coName}</span>
                                                </td>
                                                <td className="p-2 text-center">—</td>
                                                <td className="p-2 text-right font-black text-slate-700">
                                                    <div className="flex flex-col text-[10px]">
                                                        {coData.mxn > 0 && <span>{formatCurrency(coData.mxn)}</span>}
                                                        {coData.usd > 0 && <span className="text-blue-600">{formatCurrency(coData.usd)} USD</span>}
                                                    </div>
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button onClick={() => handleMassRevoke(Object.values(coData.providers).flatMap(p => p.invoices), coName)}
                                                        className="text-[9px] font-black text-red-500 hover:underline uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Quitar Empresa
                                                    </button>
                                                </td>
                                            </tr>

                                            {!collapsedAuthNodes[coName] && Object.entries(coData.providers).map(([pName, pData]) => {
                                                const pKey = `${coName}-${pName}`;
                                                return (
                                                    <React.Fragment key={pKey}>
                                                        {/* Nivel: Proveedor */}
                                                        <tr className="group">
                                                            <td className="p-2 pl-8 font-bold text-slate-700 flex items-center gap-2 cursor-pointer" onClick={() => toggleAuthNode(pKey)}>
                                                                {collapsedAuthNodes[pKey] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                                                <span className="text-[10px]">📂 {pName}</span>
                                                            </td>
                                                            <td className="p-2 text-center">—</td>
                                                            <td className="p-2 text-right font-bold text-slate-500">
                                                                <div className="flex flex-col text-[9px]">
                                                                    {pData.mxn > 0 && <span>{formatCurrency(pData.mxn, 'MXN')}</span>}
                                                                    {pData.usd > 0 && <span className="text-blue-500">{formatCurrency(pData.usd, 'USD')} USD</span>}
                                                                </div>
                                                            </td>
                                                            <td className="p-2 text-center">
                                                                <button onClick={() => handleMassRevoke(pData.invoices, pName)}
                                                                    className="text-[9px] font-bold text-amber-600 hover:underline uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    Quitar Todo
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* Nivel: Facturas individuales */}
                                                        {!collapsedAuthNodes[pKey] && pData.invoices.map(inv => (
                                                            <tr key={inv.id} className="hover:bg-blue-50/30">
                                                                <td className="p-2 pl-16 text-slate-500 font-mono text-[10px]">
                                                                    📄 {inv.meta?.invoice || inv.id}
                                                                </td>
                                                                <td className="p-2 text-center font-bold text-slate-400 text-[9px]">{inv.currency}</td>
                                                                <td className="p-2 text-right font-mono font-bold text-blue-600 text-[10px]">
                                                                    {formatCurrency(inv.amount)}
                                                                </td>
                                                                <td className="p-2 text-center">
                                                                    <button onClick={() => handleRevokeInvoice(inv)}
                                                                        className="p-1 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded transition-colors">
                                                                        <X size={12} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </React.Fragment>
                                                )
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Panel de Resumen Final (Panel Oscuro) */}
                        <div className="shrink-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-6 text-white">
                            <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-2">
                                <div className="flex justify-between items-baseline border-b border-slate-800 pb-1">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase">Total MXN</span>
                                    <span className="text-sm font-black font-mono">{formatCurrency(authKpis.mxn)}</span>
                                </div>
                                <div className="flex justify-between items-baseline border-b border-slate-800 pb-1">
                                    <span className="text-[10px] font-bold text-blue-400 uppercase">Total USD</span>
                                    <span className="text-sm font-black font-mono text-blue-100">{formatCurrency(authKpis.usd)} USD</span>
                                </div>
                                <div className="flex justify-between items-center opacity-60">
                                    <span className="text-[9px] font-bold text-red-400 uppercase">Vencidas MN/USD</span>
                                    <span className="text-[10px] font-mono">{formatCurrency(authKpis.overdueMxn)} / {formatCurrency(authKpis.overdueUsd)}</span>
                                </div>
                                <div className="flex justify-between items-center opacity-60">
                                    <span className="text-[9px] font-bold text-emerald-400 uppercase">Por Vencer MN/USD</span>
                                    <span className="text-[10px] font-mono">{formatCurrency(authKpis.upcomingMxn)} / {formatCurrency(authKpis.upcomingUsd)}</span>
                                </div>
                            </div>

                            <div className="h-12 w-px bg-slate-700 mx-2" />

                            <div className="flex flex-col items-end min-w-[200px] gap-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">Gran Total Propuesta</span>
                                    <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-[10px]">
                                        <span className="text-[8px] font-bold text-slate-500 uppercase">TC</span>
                                        <span className="font-mono text-blue-400">{exchangeRate}</span>
                                    </div>
                                </div>
                                <p className="text-2xl font-black text-white tracking-tighter tabular-nums leading-none">
                                    {formatCurrency(authKpis.mxn + (authKpis.usd * exchangeRate))}
                                </p>
                                {(authorizedInvoices || []).length > 0 && (
                                    <button onClick={handleFinalizeBatch} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-lg animate-pulse uppercase tracking-widest">
                                        <Lock size={12} /> GENERAR BATCH DEFINITIVO
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </Modal>

                {/* Modal de Facturas Improcedentes (Fisicamente Rechazadas) */}
                <Modal
                    isOpen={isImprocedentesModalOpen}
                    onClose={() => setIsImprocedentesModalOpen(false)}
                    title="Resumen de Facturas Improcedentes"
                    size="sm"
                >
                    <div className="space-y-4">
                        <p className="text-[10px] text-slate-500 font-medium uppercase">
                            Lista de proveedores con inconsistencias fiscales detectadas por las reglas de negocio.
                        </p>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 font-black text-[9px] uppercase text-slate-500 border-b border-slate-100">
                                    <tr>
                                        <th className="p-3">Proveedor</th>
                                        <th className="p-3 text-center">Docs</th>
                                        <th className="p-3 text-right">Monto Estimado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {improcedentesByProvider.map(group => (
                                        <tr key={group.name} className="hover:bg-red-50/30 transition-colors">
                                            <td className="p-3 font-bold text-slate-700">{group.name}</td>
                                            <td className="p-3 text-center">
                                                <span className="bg-red-100 px-2 py-0.5 rounded text-[10px] font-bold text-red-600">{group.count}</span>
                                            </td>
                                            <td className="p-3 text-right font-black text-slate-400 font-mono">{formatCurrency(group.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default PaymentsV2;