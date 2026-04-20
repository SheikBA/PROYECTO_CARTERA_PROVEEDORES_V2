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

export const CATALOG_BANCOS_INICIAL = [
    { id: "BNX-MXN-01", bank: "BANAMEX", bank_account: "1234-5678", currency_code: "MXN", company: "FOTUR", description: "BANAMEX MXN FOTUR" },
    { id: "SANT-USD-01", bank: "SANTANDER", bank_account: "8888-9999", currency_code: "USD", company: "FOTUR", description: "SANTANDER USD FOTUR" },
    { id: "BBVA-MXN-01", bank: "BBVA", bank_account: "5555-4444", currency_code: "MXN", company: "HSH", description: "BBVA MXN HSH" },
    { id: "SCOTI-JMD-01", bank: "SCOTIABANK", bank_account: "1111-2222", currency_code: "JMD", company: "HSH", description: "SCOTIABANK JMD JAMAICA" }
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