// src/data/mockData.js

export const INITIAL_RAW_INVOICES = [
    { id: 'PAY-8901', providerId: 'P-001', providerName: 'TechSolutions Inc.', group: 'G-001', type: 'Ingreso', amount: 12500.00, currency: 'MXN', dueDate: '2025-10-15', status: 'pending', bankId: 'B-001', accountId: 'CTA-001' },
    { id: 'PAY-8904', providerId: 'P-002', providerName: 'Office Supplies Co.', group: 'G-001', type: 'Ingreso', amount: 320.50, currency: 'MXN', dueDate: '2025-10-01', status: 'paid', bankId: 'B-001', accountId: 'CTA-001' },
    { id: 'PAY-8902', providerId: 'P-003', providerName: 'Servicios de Limpieza S.A.', group: 'G-002', type: 'Ingreso', amount: 850.00, currency: 'MXN', dueDate: '2025-10-12', status: 'overdue', bankId: 'B-001', accountId: 'CTA-001' },
    { id: 'PAY-8903', providerId: 'P-004', providerName: 'Consultores G&T', group: 'G-003', type: 'Ingreso', amount: 5000.00, currency: 'MXN', dueDate: '2025-10-20', status: 'pending', bankId: 'B-002', accountId: 'CTA-002' },
    { id: 'PAY-8905', providerId: 'P-005', providerName: 'Marketing Digital MX', group: 'G-005', type: 'Ingreso', amount: 2800.00, currency: 'MXN', dueDate: '2025-10-18', status: 'pending', bankId: 'B-005', accountId: 'CTA-005' },
    { id: 'PAY-8906', providerId: 'P-001', providerName: 'TechSolutions Inc.', group: 'G-001', type: 'Nota de Crédito', amount: -500.00, currency: 'MXN', dueDate: '2025-10-15', status: 'valid', bankId: 'B-001', accountId: 'CTA-001' }
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

export const MOCK_BANKS_META = [
    { id: 'B-001', name: 'Banamex', account: '**** 1234', balance: 1500000 },
    { id: 'B-002', name: 'Banorte', account: '**** 5678', balance: 800000 },
    { id: 'B-003', name: 'Sabadell', account: '**** 9012', balance: 500000 },
    { id: 'B-004', name: 'Scotiabank', account: '**** 3456', balance: 1200000 },
    { id: 'B-005', name: 'HSBC', account: '**** 7890', balance: 2000000 }
];

export const MOCK_GROUPS_META = {
    'G-001': { name: 'Proveedores Nacionales' },
    'G-002': { name: 'Servicios Básicos' },
    'G-003': { name: 'Arrendamientos' },
    'G-004': { name: 'Nómina' },
    'G-005': { name: 'Proveedores Extranjeros' }
};
