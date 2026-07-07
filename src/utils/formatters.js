// src/utils/formatters.js
// Formateadores compartidos por los módulos de Pagos, DataLoad, etc.

/**
 * formatCurrency
 * Formatea un número como moneda. Por defecto: MXN, locale es-MX.
 * Acepta una moneda alterna (p.ej. "USD") en el segundo parámetro.
 * Tolera null/undefined/NaN devolviendo "$0.00".
 */
export const formatCurrency = (value, currency = 'MXN', locale = 'es-MX') => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(safe);
    } catch (e) {
        // Fallback si la moneda no es válida
        return `$${safe.toFixed(2)}`;
    }
};

/**
 * formatNumber
 * Formatea un número con separadores de miles. Útil para conteos.
 */
export const formatNumber = (value, locale = 'es-MX') => {
    const n = Number(value);
    const safe = Number.isFinite(n) ? n : 0;
    return new Intl.NumberFormat(locale).format(safe);
};

/**
 * formatDate
 * Formatea una fecha como dd/mm/yyyy. Acepta Date, string ISO o null.
 */
export const formatDate = (value, locale = 'es-MX') => {
    if (!value) return '—';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(locale);
};

export default { formatCurrency, formatNumber, formatDate };
