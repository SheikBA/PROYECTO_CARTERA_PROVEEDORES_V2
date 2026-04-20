export const MOCK_BANKS_META = [
    { id: 'B-001', name: 'Banamex', account: '90832145' },
    { id: 'B-002', name: 'BBVA', account: '12345678' },
    { id: 'B-003', name: 'Santander', account: '98765432' }
];

export const MOCK_GROUPS_META = {
    'G-001': { name: 'Servicios Públicos' },
    'G-002': { name: 'Materia Prima' },
    'G-003': { name: 'Mantenimiento' },
    'G-004': { name: 'Impuestos' }
};

export const INITIAL_RAW_INVOICES = [
    { id: 'INV-001', providerName: 'CFE', amount: 5000, currency: 'MXN', dueDate: '2025-10-15', status: 'pending', group: 'G-001', bankId: 'B-001', type: 'Factura' },
    { id: 'INV-002', providerName: 'Telmex', amount: 1200, currency: 'MXN', dueDate: '2025-10-16', status: 'pending', group: 'G-001', bankId: 'B-001', type: 'Factura' },
    { id: 'INV-003', providerName: 'Proveedor Aceros SA', amount: 15000, currency: 'MXN', dueDate: '2025-10-20', status: 'pending', group: 'G-002', bankId: 'B-002', type: 'Factura' },
    { id: 'INV-004', providerName: 'Limpieza Total', amount: 3500, currency: 'MXN', dueDate: '2025-10-18', status: 'pending', group: 'G-003', bankId: 'B-001', type: 'Factura' },
    { id: 'INV-005', providerName: 'SAT', amount: 45000, currency: 'MXN', dueDate: '2025-10-30', status: 'pending', group: 'G-004', bankId: 'B-003', type: 'Impuesto' }
];

export const AVAILABLE_INVOICES = [
    { uuid: 'UUID-9A8B7C', providerId: 'P-006', providerName: 'Amazon Web Services', company: 'CorpCentral', amount: 45000.00, currency: 'MXN', bank: 'Banamex', account: '**** 1234' },
    { uuid: 'UUID-1D2E3F', providerId: 'P-007', providerName: 'WeWork Espacios', company: 'CorpCentral', amount: 15000.00, currency: 'MXN', bank: 'Banorte', account: '**** 5678' },
    { uuid: 'UUID-4G5H6I', providerId: 'P-008', providerName: 'Consultoría Legal SC', company: 'FilialNorte', amount: 22500.00, currency: 'MXN', bank: 'Scotiabank', account: '**** 3456' },
];

export const INITIAL_TRACKING_DATA = [
    { id: 'TRK-001', date: '2025-08-15', providerName: 'Office Supplies Co.', amount: 1500.00, currency: 'MXN', status: 'Completed', pdfUrl: '/dummy.pdf' },
    { id: 'TRK-002', date: '2025-09-01', providerName: 'TechSolutions Inc.', amount: 35000.00, currency: 'MXN', status: 'RejectedH2H', pdfUrl: null }
];

// Datos mock para el módulo de Configuración de Plantillas
export const MOCK_TEMPLATES = [
    { id: 'TPL-001', name: 'Factura Estándar v2',              type: 'PDF',  status: 'active',   lastModified: '10 Oct 2025' },
    { id: 'TPL-002', name: 'Recibo Simplificado',              type: 'HTML', status: 'active',   lastModified: '12 Oct 2025' },
    { id: 'TPL-003', name: 'Comprobante XML',                  type: 'XML',  status: 'draft',    lastModified: '14 Oct 2025' },
    { id: 'TPL-004', name: 'Factura Proveedor Internacional',  type: 'PDF',  status: 'inactive', lastModified: '01 Sep 2025' },
];