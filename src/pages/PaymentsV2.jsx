import { useState, useMemo, useRef, useEffect, useCallback, memo } from 'react';
import { invoicesArraySchema } from '../layout/invoiceSchema';
import { sp_process_invoice_data } from '../logic/Reglas_Negocio';
import { DESTINOS, CURRENCIES, HS_TOKENS } from '../data/catalogs';
import {
    Search, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Check,
    X, ArrowUpDown, ArrowUp, ArrowDown, Calculator, Users, Download, Eye, ArrowLeft,
    FileSpreadsheet, ShieldAlert, RefreshCw, CheckCircle2, Lock, Filter, BarChart3, Maximize2, Minimize2, Layers
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
const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);

// Nodo individual del árbol — separado para poder memoizarlo
const TreeNode = memo(({ id, node, level, selectedGroup, onGroupSelect, forceOpen }) => {
    const detailsRef = useRef(null);

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
            defaultOpen={level === 0}
        >
            <summary
                onClick={() => { if (node.type === 'group') onGroupSelect(id); }}
                className={`flex items-center py-1.5 px-2 rounded-md cursor-pointer hover:bg-slate-50 transition-colors list-none ${selectedGroup === id && node.type === 'group' ? 'bg-blue-50 ring-1 ring-blue-200' : ''}`}
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
                        <span className="w-20 text-slate-600">{node.mxn > 0 ? formatCurrency(node.mxn).replace('$', '') : '-'}</span>
                        <span className="w-20 text-slate-400 text-[8px]">{node.mxnTax > 0 ? formatCurrency(node.mxnTax).replace('$', '') : '-'}</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="w-20 text-blue-600 font-bold">{node.usd > 0 ? formatCurrency(node.usd).replace('$', '') : '-'}</span>
                        <span className="w-20 text-blue-400 text-[8px]">{node.usdTax > 0 ? formatCurrency(node.usdTax).replace('$', '') : '-'}</span>
                    </div>
                </div>
            </summary>
            {Object.keys(node.children).length > 0 && (
                <div className="mt-0.5">
                    <RenderTreeNode nodes={node.children} level={level + 1} selectedGroup={selectedGroup} onGroupSelect={onGroupSelect} forceOpen={forceOpen} />
                </div>
            )}
        </details>
    );
});

// Componente recursivo para renderizar el árbol
const RenderTreeNode = memo(({ nodes, level = 0, selectedGroup, onGroupSelect, forceOpen }) => {
    return Object.entries(nodes).map(([id, node]) => (
        <TreeNode
            key={id}
            id={id}
            node={node}
            level={level}
            selectedGroup={selectedGroup}
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
    // --- LÓGICA DE REDIMENSIONAMIENTO (RESIZE) ---
    const [sidebarWidth, setSidebarWidth] = useState(450); // Ancho inicial en px
    const containerRef = useRef(null);
    const isResizing = useRef(false);

    // handleMouseMove debe definirse primero porque stopResizing depende de ella
    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current || !containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        if (newWidth > 280 && newWidth < 800) setSidebarWidth(newWidth);
    }, []);

    // stopResizing debe definirse antes que startResizing
    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, [handleMouseMove]); // Dependencia correcta

    // startResizing depende de handleMouseMove y stopResizing
    const startResizing = useCallback((e) => {
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // Evita seleccionar texto al arrastrar
    }, [handleMouseMove, stopResizing]); // Dependencias correctas

    // Cleanup event listeners on component unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', stopResizing);
        };
    }, [handleMouseMove, stopResizing]);
    // Estado para los filtros individuales del sidebar
    const [sidebarFilters, setSidebarFilters] = useState({
        provider: "",
        company: "",
        docType: ""
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [page, setPage] = useState(1);
    const [isHeaderOpen, setIsHeaderOpen] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'dueDate', direction: 'asc' });
    const [exchangeRate, setExchangeRate] = useState(18.50);

    // Estados para la vista de Autorizados
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [selectedAuthProvider, setSelectedAuthProvider] = useState(null);
    const [authModalSearch, setAuthModalSearch] = useState("");

    const [allExpanded, setAllExpanded] = useState(false);

    // Estados para el Modal de Añadir Manual
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [manualInvoice, setManualInvoice] = useState({
        company: "FOTUR",
        uuid: "",
        invoiceNum: ""
    });

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
    const EMPTY_FILTERS = {
        destino: [], // Cambiado a vacío para mostrar todo por defecto
        company: [],
        dateCutoff: "",
        currency: [],
        documentType: [],
        grupo: [],
        subgrupo: []
    }; // Eliminaremos dateFrom y dateTo para unificar en dateCutoff
    const [pendingFilters, setPendingFilters] = useState(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

    const activeFilterCount = Object.entries(appliedFilters).filter(([key, v]) =>
        Array.isArray(v) ? v.length > 0 : v !== ""
    ).length;

    // Estado para Secciones del Sidebar (Manejo de orden y colapso)
    const [sidebarSections, setSidebarSections] = useState(['docTypes', 'subGroups', 'groups']);
    const [collapsedSections, setCollapsedSections] = useState({ groups: false, docTypes: false, subGroups: false });

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

    const handleSaveManual = () => {
        if (!manualInvoice.invoiceNum) { showToast("El número de factura es obligatorio."); return; }

        const newEntry = {
            id: manualInvoice.uuid || `MAN-${Date.now()}`,
            uuid: manualInvoice.uuid,
            providerName: "ALTA MANUAL",
            amount: 0,
            currency: "MXN",
            dueDate: new Date().toISOString().split('T')[0],
            status: 'pending',
            group: 'Sin Grupo',
            bankId: 'PENDIENTE-MXN',
            meta: {
                company: manualInvoice.company,
                invoice: manualInvoice.invoiceNum,
                isPayable: true,
                hasFiscalError: false
            }
        };

        setRawInvoices([newEntry, ...rawInvoices]);
        setIsModalOpen(false);
        setManualInvoice({ company: "FOTUR", uuid: "", invoiceNum: "" });
        showToast(`Factura ${newEntry.meta.invoice} agregada correctamente.`);
    };

    // --- LÓGICA DE FILTRADO ---

    // Base filtrada con todos los filtros activos EXCEPTO el grupo del sidebar.
    // Fuente de verdad para el sidebar: sus totales siempre reflejan los filtros aplicados.
    // Si el lote está bloqueado (finalizado), mostramos las facturas finalizadas.
    const baseForGroups = useMemo(() => {
        // RESTAURACIÓN: Filtramos por error fiscal para que solo lo válido sea visible en V2
        const pending = (rawInvoices || []).filter(d => !d.meta?.hasFiscalError).map(d => ({ ...d, _authStatus: 'pending' }));
        const authorized = (authorizedInvoices || []).filter(d => !d.meta?.hasFiscalError).map(d => ({ ...d, _authStatus: 'authorized' }));
        let invoicesToConsider = [...pending, ...authorized];

        // Aseguramos que d.meta sea siempre un objeto para un acceso más seguro
        return invoicesToConsider.filter(d => {
            const meta = d.meta || {};

            const searchStr = `${d.providerName} ${d.meta?.invoice} ${d.uuid}`.toLowerCase();
            const matchSearch = searchStr.includes(searchTerm.toLowerCase());

            const matchDestino = appliedFilters.destino.length === 0 || appliedFilters.destino.includes(meta.destino);
            const matchCompany = appliedFilters.company.length === 0 || appliedFilters.company.includes(meta.company);
            const matchCurrency = appliedFilters.currency.length === 0 || appliedFilters.currency.includes(d.currency);
            const matchGrupo = appliedFilters.grupo.length === 0 || appliedFilters.grupo.includes(d.group);
            const matchDocType = appliedFilters.documentType.length === 0 || appliedFilters.documentType.includes(meta.tipo_c || meta.document_type);
            const matchSubgrupo = appliedFilters.subgrupo.length === 0 || appliedFilters.subgrupo.includes(meta.subgrupo_c);
            const matchDate = !appliedFilters.dateCutoff || (d.dueDate && d.dueDate <= appliedFilters.dateCutoff);

            // Filtros individuales de Sidebar
            const matchSidebarProv = !sidebarFilters.provider || String(d.providerName || '').toLowerCase().includes(sidebarFilters.provider.toLowerCase());
            const matchSidebarComp = !sidebarFilters.company || String(meta.company || '').toLowerCase().includes(sidebarFilters.company.toLowerCase());
            const matchSidebarDoc = !sidebarFilters.docType || String(meta.tipo_c || meta.document_type || '').toLowerCase().includes(sidebarFilters.docType.toLowerCase());

            return matchSearch && matchDestino && matchCompany && matchCurrency && matchDate && matchGrupo && matchDocType && matchSubgrupo && matchSidebarProv && matchSidebarComp && matchSidebarDoc;
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
        if (!selectedGroup) return baseForGroups;
        return baseForGroups.filter(d => d.group === selectedGroup);
    }, [baseForGroups, selectedGroup]);

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
    const pendingCountByGroup = useMemo(() => {
        const map = new Map();
        baseForGroups.filter(d => d._authStatus === 'pending').forEach(d => {
            const g = d.group || 'Sin Grupo';
            map.set(g, (map.get(g) || 0) + 1);
        });
        return map;
    }, [baseForGroups]);

    const pendingTotal = filteredData.filter(d => d._authStatus === 'pending').length;

    // Resetear página cuando cambian los filtros del sidebar o el grupo seleccionado
    useEffect(() => { setPage(1); }, [sidebarFilters, selectedGroup, searchTerm, appliedFilters]);

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
        showConfirm(
            `¿Autorizar ${toAuth.length} factura${toAuth.length !== 1 ? 's' : ''} del resultado actual?`,
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
                setSelectedGroup(null);
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

        baseForGroups.forEach(inv => {
            const co = inv.meta?.company || 'Sin Empresa';
            const gr = inv.group || 'Sin Grupo';
            const prov = inv.providerName || 'Sin Proveedor';
            const doc = inv.meta?.tipo_c || inv.meta?.document_type || 'Sin Tipo';
            const pp = inv.meta?.purchase_point || inv.meta?.pp_c || 'Principal';
            const sub = inv.meta?.subgrupo_c || inv.meta?.subgroup || 'General';

            // Definición de niveles solicitados
            const levels = [
                { id: co, label: co, type: 'company' }, // Nivel 1
                { id: gr, label: gr, type: 'group' },   // Nivel 2
                { id: sub, label: sub, type: 'subgroup' }, // Nivel 3
                { id: prov, label: prov, type: 'provider' }, // Nivel 4
                { id: pp, label: pp, type: 'purchasepoint' }, // Nivel 5
                { id: doc, label: doc, type: 'doctype' } // Nivel 6
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
        const providers = new Set(filteredData.map(i => i.providerName));
        const mxn = filteredData.filter(i => i.currency === 'MXN').reduce((sum, i) => sum + i.amount, 0);
        const usd = filteredData.filter(i => i.currency === 'USD').reduce((sum, i) => sum + i.amount, 0);
        const errors = filteredData.filter(i => i.meta?.hasFiscalError).length;

        return { mxn, usd, providers: providers.size, errors, total: filteredData.length };
    }, [filteredData]);

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
                    <div className="flex flex-col">
                        <nav className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                            <span>Portal HS</span> <ChevronRight size={8} />
                            <span>Cartera de Proveedores</span> <ChevronRight size={8} />
                            <span className="text-primary">Gestión de Pagos</span>
                        </nav>
                        <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight" style={{ fontFamily: HS.fontTitle }}>
                            Gestión de Pagos V2
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            icon={Eye}
                            size="xs"
                            className="text-[10px] font-bold"
                            onClick={() => { setSelectedAuthProvider(null); setIsAuthModalOpen(true); }}
                        >Ver Autorizadas</Button>
                        <div className="h-6 w-px bg-slate-200" />
                        <button onClick={() => setIsHeaderOpen(v => !v)} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 hover:text-slate-700 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100">
                            {isHeaderOpen ? <><ChevronUp size={14} /> Ocultar Filtros</> : <><ChevronDown size={14} /> Mostrar Filtros</>}
                        </button>
                    </div>
                </div>
                {isHeaderOpen && (
                    <div className="px-4 py-3 bg-slate-50/50">
                        <div className="flex flex-wrap gap-3 items-end">
                            <MultiSelectHeaderFilter label="Filtro 1: Destino" options={DESTINOS} selectedValues={pendingFilters.destino} onChange={(val) => setPendingFilters(p => ({ ...p, destino: val }))} singleSelect={true} />
                            <MultiSelectHeaderFilter label="Filtro 2: Compañía" options={["FOTUR", "OPERADORA", "SHOPS", "ADMINISTRADORA"]} selectedValues={pendingFilters.company} onChange={(val) => setPendingFilters(p => ({ ...p, company: val }))} />
                            <MultiSelectHeaderFilter label="Filtro 3: Moneda" options={["MXN", "USD", "JMD"]} selectedValues={pendingFilters.currency} onChange={(val) => setPendingFilters(p => ({ ...p, currency: val }))} />
                            <MultiSelectHeaderFilter label="Filtro 4: Grupo" options={groupList.map(g => g.group)} selectedValues={pendingFilters.grupo} onChange={(val) => setPendingFilters(p => ({ ...p, grupo: val }))} />
                            <MultiSelectHeaderFilter label="Filtro 5: Tipo Doc." options={documentTypes} selectedValues={pendingFilters.documentType} onChange={(val) => setPendingFilters(p => ({ ...p, documentType: val }))} />
                            <MultiSelectHeaderFilter label="Filtro 6: SubGrupo" options={subGroups} selectedValues={pendingFilters.subgrupo} onChange={(val) => setPendingFilters(p => ({ ...p, subgrupo: val }))} />
                            <div className="min-w-[120px]">
                                <label className={filterLabel}>Fecha de Corte</label>
                                <input type="date" className={filterInputClass} value={pendingFilters.dateCutoff} onChange={(e) => setPendingFilters(p => ({ ...p, dateCutoff: e.target.value }))} />
                            </div>
                            <div className="flex items-end gap-2 ml-auto">
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
            <div ref={containerRef} className="flex-1 min-h-0 flex gap-3 overflow-hidden">

                {/* Sidebar Izquierdo (Full Height) */}
                <div
                    style={{ width: `${sidebarWidth}px`, flexShrink: 0 }}
                    className="flex flex-col gap-2 min-h-0 p-2 border border-slate-200 rounded-xl bg-white overflow-y-auto shadow-sm"
                >
                    {/* Sidebar Filters */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 shadow-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Filtros de Árbol</span>
                            <button onClick={() => setSidebarFilters({ provider: "", company: "", docType: "" })} className="text-[8px] font-bold text-primary hover:underline flex items-center gap-1">
                                <RefreshCw size={8} /> Limpiar
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <input type="text" placeholder="Filtrar Proveedor..." className="w-full px-2 py-1.5 text-[10px] border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-primary hs-input" value={sidebarFilters.provider} onChange={(e) => setSidebarFilters(p => ({ ...p, provider: e.target.value }))} />
                            <select className="w-full px-2 py-1.5 text-[10px] border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-primary hs-input" value={sidebarFilters.company} onChange={(e) => setSidebarFilters(p => ({ ...p, company: e.target.value }))}>
                                <option value="">— Compañía —</option>
                                {companyList.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input type="text" placeholder="Tipo de Documento..." className="w-full px-2 py-1.5 text-[10px] border border-slate-200 rounded bg-white outline-none focus:ring-1 focus:ring-primary hs-input" value={sidebarFilters.docType} onChange={(e) => setSidebarFilters(p => ({ ...p, docType: e.target.value }))} />
                        </div>
                    </div>

                    {/* Tree View */}
                    <div className="bg-white border border-slate-200 rounded-xl flex flex-col min-h-0 overflow-hidden shadow-sm" style={{ flexGrow: 1, minHeight: '120px' }}>
                        <div className="px-3 py-2 border-b flex items-center justify-between text-white" style={{ backgroundColor: HS.tealDark, borderBottomColor: HS.tealBase }}>
                            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                                <Layers size={14} className="text-blue-400" />
                                <span>Estructura de Cartera</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setAllExpanded(true)} className="p-1.5 hover:bg-white/20 rounded-md transition-all text-blue-200 hover:text-white"><Maximize2 size={13} /></button>
                                <button onClick={() => setAllExpanded(false)} className="p-1.5 hover:bg-white/20 rounded-md transition-all text-blue-200 hover:text-white"><Minimize2 size={13} /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            <RenderTreeNode nodes={hierarchicalTree} selectedGroup={selectedGroup} onGroupSelect={(id) => { setSelectedGroup(id); setPage(1); }} forceOpen={allExpanded} />
                        </div>
                    </div>

                    {/* Totales Resumen (Dark Panel) */}
                    <div className="shrink-0 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-2xl space-y-3" style={{ backgroundColor: HS.tealDark }}>
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Resumen Árbol</span>
                            <Badge status="info" className="text-[9px] px-2 py-0 font-mono">{kpis.total} Docs</Badge>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-baseline"><span className="text-[10px] font-bold text-slate-400 uppercase">Total MXN</span><span className="text-xs font-mono font-bold text-white">{formatCurrency(kpis.mxn)}</span></div>
                            <div className="flex justify-between items-baseline"><span className="text-[10px] font-bold text-blue-400 uppercase">Total USD</span><span className="text-xs font-mono font-bold text-blue-100">{formatCurrency(kpis.usd).replace('MXN', 'USD')}</span></div>
                        </div>
                        <div className="pt-3 border-t border-slate-700 mt-2">
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Gran Total Equiv.</span>
                                    <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">T.C.</span>
                                        <input type="number" step="0.01" className="w-10 bg-transparent text-[10px] font-mono text-blue-400 outline-none" value={exchangeRate} onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)} />
                                    </div>
                                </div>
                                <p className="text-xl font-black text-white tracking-tighter tabular-nums">{formatCurrency(kpis.mxn + (kpis.usd * exchangeRate))}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Handle de redimensionamiento */}
                <div onMouseDown={startResizing} className="w-1 hover:bg-primary/30 cursor-col-resize transition-all flex items-center justify-center group z-10">
                    <div className="h-12 w-0.5 bg-slate-200 group-hover:bg-primary rounded-full" />
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
                                    <p className="text-[11px] font-bold text-slate-700 truncate">MXN {formatCurrency(kpis.mxn)}</p>
                                    <span className="text-[8px] font-bold text-emerald-500">+12%</span>
                                </div>
                                <p className="text-[11px] font-bold text-slate-700 truncate">USD {formatCurrency(kpis.usd)}</p>
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
                        <div className={`bg-white border border-slate-200 border-l-4 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-sm ${kpis.errors > 0 ? 'animate-pulse' : ''}`} style={{ borderLeftColor: kpis.errors > 0 ? HS.error : HS.gray1 }}>
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

                            {/* Autorizar todo */}
                            {pendingTotal > 0 && (
                                <button onClick={handleAuthorizeAll}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-emerald-700 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors shrink-0">
                                    <CheckCircle2 size={13} /> Autorizar todo ({pendingTotal})
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
                            <button onClick={() => setIsModalOpen(true)} // Texto cambiado de "Añadir"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-100 rounded-lg transition-colors shrink-0"> {/* Texto cambiado */}
                                <Plus size={13} /> AGREGAR FACTURA
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-widest text-[9px]">
                                        <th className="px-4 py-2.5 cursor-pointer hover:text-primary" onClick={() => handleSort('providerName')}>
                                            <div className="flex items-center gap-1">Proveedor {getSortIcon('providerName')}</div>
                                        </th>
                                        <th className="px-4 py-2.5">Factura</th>
                                        <th className="px-4 py-2.5 cursor-pointer hover:text-primary" onClick={() => handleSort('dueDate')}>
                                            <div className="flex items-center gap-1">Vencimiento {getSortIcon('dueDate')}</div>
                                        </th>
                                        <th className="px-4 py-2.5 text-right cursor-pointer hover:text-primary" onClick={() => handleSort('amount')}>
                                            <div className="flex items-center justify-end gap-1">Monto {getSortIcon('amount')}</div>
                                        </th>
                                        <th className="px-4 py-2.5 text-center">Fiscal</th>
                                        <th className="px-3 py-2.5 text-center w-20">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {paginatedData.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-xs">
                                                Sin resultados. Ajusta los filtros y presiona BUSCAR.
                                            </td>
                                        </tr>
                                    ) : paginatedData.map((inv) => {
                                        const isAuth = inv._authStatus === 'authorized';
                                        return (
                                            <tr key={inv.id} className={`transition-colors ${isAuth ? 'bg-emerald-50/60 hover:bg-emerald-50' : 'hover:bg-blue-50/30'}`}>
                                                <td className="px-4 py-2.5">
                                                    <div className="font-bold text-slate-800 leading-tight">{inv.providerName}</div>
                                                    <div className="text-[10px] text-slate-400">{inv.meta?.company}</div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-slate-600">{inv.meta?.invoice || String(inv.id || '').slice(0, 10)}</span>
                                                        {inv.meta?.isH2H && <Badge status="info" className="text-[8px] px-1 py-0">H2H</Badge>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-500">{inv.dueDate}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <span className="text-[10px] font-bold text-slate-400 mr-1">{inv.currency}</span>
                                                    <span className="font-bold text-slate-800">{formatCurrency(inv.amount)}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {inv.meta?.hasFiscalError ? (
                                                        <div className="group relative inline-block">
                                                            <Badge status="danger">ERROR</Badge>
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded shadow-xl z-50">
                                                                {inv.meta?.validationErrors?.[0] || "Error en validación fiscal"}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Badge status="success">VIGENTE</Badge>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
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
                                                            Autorizar
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
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Añadir Factura Manual" size="sm">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Selecciona Empresa</label>
                            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 bg-white"
                                value={manualInvoice.company}
                                onChange={(e) => setManualInvoice({ ...manualInvoice, company: e.target.value })}>
                                {companyList.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">UUID (Folio Fiscal)</label>
                            <input type="text" placeholder="Ingrese UUID..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                value={manualInvoice.uuid}
                                onChange={(e) => setManualInvoice({ ...manualInvoice, uuid: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número de Factura</label>
                            <input type="text" placeholder="Ingrese número de factura..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                                value={manualInvoice.invoiceNum}
                                onChange={(e) => setManualInvoice({ ...manualInvoice, invoiceNum: e.target.value })} />
                        </div>
                        <Button variant="primary" className="w-full" onClick={handleSaveManual}>Agregar</Button>
                    </div>
                </Modal>

                {/* Modal de Facturas Autorizadas por Proveedor */}
                <Modal
                    isOpen={isAuthModalOpen}
                    onClose={() => {
                        setIsAuthModalOpen(false);
                        setSelectedAuthProvider(null);
                        setAuthModalSearch("");
                    }}
                    title={selectedAuthProvider
                        ? `Detalle: ${selectedAuthProvider.name}`
                        : (authorizedInvoices.length > 0 ? "Borrador de Autorización" : "Facturas en Batch Finalizado")}
                    size="md"
                >
                    <div className="space-y-4">
                        {selectedAuthProvider ? (
                            <>
                                <button
                                    onClick={() => setSelectedAuthProvider(null)}
                                    className="flex items-center gap-2 text-[10px] font-black text-primary hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors mb-2 uppercase tracking-tighter"
                                >
                                    <ArrowLeft size={14} /> Volver al resumen
                                </button>
                                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 font-black text-[9px] uppercase text-slate-500">
                                            <tr>
                                                <th className="p-4">Número de Factura</th>
                                                <th className="p-4 text-right">Monto</th>
                                                <th className="p-4 text-center">Gestión</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {selectedAuthProvider.items.map(inv => (
                                                <tr key={inv.id} className="hover:bg-white">
                                                    <td className="p-4 font-bold text-slate-700">{inv.meta?.invoice || inv.id}</td>
                                                    <td className="p-4 text-right font-mono font-bold text-blue-600">{formatCurrency(inv.amount)}</td>
                                                    <td className="p-4 text-center">
                                                        <button
                                                            onClick={() => {
                                                                handleRevokeInvoice(inv);
                                                                const newItems = selectedAuthProvider.items.filter(i => i.id !== inv.id);
                                                                if (newItems.length === 0) setSelectedAuthProvider(null);
                                                                else setSelectedAuthProvider({ ...selectedAuthProvider, items: newItems });
                                                            }}
                                                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1 rounded text-[9px] font-black uppercase transition-all ring-1 ring-red-200"
                                                        >
                                                            Desautorizar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                        <input type="text" placeholder="Filtrar proveedor autorizado..." className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20"
                                            value={authModalSearch} onChange={(e) => setAuthModalSearch(e.target.value)} />
                                    </div>
                                </div>
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 font-black text-[9px] uppercase text-slate-500">
                                        <tr>
                                            <th className="p-3">Proveedor</th>
                                            <th className="p-3 text-center">Docs</th>
                                            <th className="p-3 text-right">Monto Total</th>
                                            <th className="p-3 text-center">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {authByProvider.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-8 text-center text-slate-400 italic">No hay facturas autorizadas todavía.</td>
                                            </tr>
                                        ) : (
                                            authByProvider.map(group => (
                                                <tr key={group.name} className="hover:bg-blue-50/30 transition-colors">
                                                    <td className="p-3 font-bold text-slate-700">{group.name}</td>
                                                    <td className="p-3 text-center">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">{group.items.length}</span>
                                                    </td>
                                                    <td className="p-3 text-right font-black text-emerald-600 font-mono">{formatCurrency(group.total)}</td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={() => setSelectedAuthProvider(group)}
                                                            className="p-1.5 hover:bg-blue-100 text-primary rounded-full transition-colors"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Modal>
            </div>
        </div>
    );
};

export default PaymentsV2;