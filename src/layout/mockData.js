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