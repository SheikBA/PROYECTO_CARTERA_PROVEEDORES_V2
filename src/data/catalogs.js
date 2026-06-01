/**
 * Catálogos maestros del sistema para asegurar consistencia 
 * entre los módulos de Gestión V2, MultiBatch y Reportería.
 */

export const DESTINOS = [
    "Mexico",
    "Sta Lucia",
    "Granada",
    "Jamaica",
    "Dominicana"
];

export const CURRENCIES = ["MXN", "USD", "JMD"];

export const HS_TOKENS = {
    blueBase: "#0082a6",
    tealBase: "#3bbeb4",
    tealDark: "#195655",
    orange: "#f79962",
    error: "#952417",
    white: "#ffffff",
    gray1: "#e7e7e7"
};

// Bancos H2H alineados con SDD §6.2 — Banamex, Banorte, Sabadell, Santander
export const CATALOG_BANCOS_INICIAL = [
    { id: "BNX-MXN-01",  bank: "BANAMEX",   bank_account: "1234-5678", currency_code: "MXN", company: "FOTUR", tipo: "H2H",    description: "BANAMEX MXN FOTUR" },
    { id: "BNX-USD-01",  bank: "BANAMEX",   bank_account: "1234-5679", currency_code: "USD", company: "FOTUR", tipo: "H2H",    description: "BANAMEX USD FOTUR" },
    { id: "BNRT-MXN-01", bank: "BANORTE",   bank_account: "2345-6789", currency_code: "MXN", company: "FOTUR", tipo: "H2H",    description: "BANORTE MXN FOTUR" },
    { id: "SABD-MXN-01", bank: "SABADELL",  bank_account: "3456-7890", currency_code: "MXN", company: "FOTUR", tipo: "H2H",    description: "SABADELL MXN FOTUR" },
    { id: "SANT-MXN-01", bank: "SANTANDER", bank_account: "4567-8901", currency_code: "MXN", company: "FOTUR", tipo: "H2H",    description: "SANTANDER MXN FOTUR" },
    { id: "SANT-USD-01", bank: "SANTANDER", bank_account: "4567-8902", currency_code: "USD", company: "FOTUR", tipo: "H2H",    description: "SANTANDER USD FOTUR" },
    { id: "BNX-MXN-02",  bank: "BANAMEX",   bank_account: "5678-9012", currency_code: "MXN", company: "HSH",   tipo: "H2H",    description: "BANAMEX MXN HSH" },
    { id: "BNRT-MXN-02", bank: "BANORTE",   bank_account: "6789-0123", currency_code: "MXN", company: "HSH",   tipo: "H2H",    description: "BANORTE MXN HSH" },
    { id: "LOC-DO-01",   bank: "BANCA LOCAL DO", bank_account: "0001", currency_code: "DOP", company: "HSH",   tipo: "MANUAL", description: "Banca local Dominicana" },
    { id: "LOC-JM-01",   bank: "BANCA LOCAL JM", bank_account: "0002", currency_code: "JMD", company: "HSH",   tipo: "MANUAL", description: "Banca local Jamaica" },
    { id: "LOC-GD-01",   bank: "BANCA LOCAL GD", bank_account: "0003", currency_code: "XCD", company: "HSH",   tipo: "MANUAL", description: "Banca local Granada" },
];

export const CATALOG_COMPANIAS_INICIAL = [
    { company: "FOTUR", company_name: "Fomento Turístico S.A. de C.V.", country: "Mexico" },
    { company: "HSH", company_name: "Hotel Shops Hub", country: "Mexico" },
    { company: "HSH_JAM", company_name: "Hotel Shops Jamaica Ltd", country: "Jamaica" }
];

export const CATALOG_GRUPOS_INICIAL = [
    { group: "A", description: "PROVEEDORES CRÍTICOS" },
    { group: "B", description: "SERVICIOS GENERALES" },
    { group: "C", description: "IMPUESTOS Y DERECHOS" },
    { group: "D", description: "NOMINA Y PRESTACIONES" },
    { group: "E", description: "GRIF" },
    { group: "F", description: "INTERCOMPAÑIAS" },
    { group: "G", description: "PROVEEDORES EXTRANJEROS" }
];

/**
 * Objeto unificado para inicializar el estado global en App.jsx
 */
export const INITIAL_CATALOGS = {
    banks: CATALOG_BANCOS_INICIAL,
    companies: CATALOG_COMPANIAS_INICIAL,
    groups: CATALOG_GRUPOS_INICIAL,
    destinos: DESTINOS,
    currencies: CURRENCIES
};