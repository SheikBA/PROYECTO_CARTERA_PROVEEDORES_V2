// src/utils/parsers.js
// Utilidades de parseo usadas por el motor de reglas (Reglas_Negocio.js).
// Centraliza la conversión de valores crudos provenientes del Excel a tipos
// fuertes (boolean, number, Date) tolerando variantes de formato.

/**
 * parseBoolean
 * Convierte cualquier representación común de booleano a true/false.
 * Acepta: true/false, 1/0, "sí"/"si"/"no", "yes"/"no", "x"/"" (Excel), "verdadero"/"falso".
 */
export const parseBoolean = (val) => {
    if (val === null || val === undefined || val === "") return false;
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    const s = String(val).trim().toLowerCase();
    if (["true", "1", "x", "si", "sí", "yes", "y", "verdadero", "v"].includes(s)) return true;
    if (["false", "0", "no", "n", "falso", "f"].includes(s)) return false;
    // Cualquier string no vacío distinto de los anteriores se considera "marcado"
    return s.length > 0 && s !== "0";
};

/**
 * parseAmount
 * Convierte un valor monetario heterogéneo en número (float).
 * Tolera separadores de miles (,), separador decimal (. o ,), signo negativo
 * con paréntesis estilo contable: "(1,234.56)" → -1234.56.
 * Devuelve 0 si no es interpretable.
 */
export const parseAmount = (val) => {
    if (val === null || val === undefined || val === "") return 0;
    if (typeof val === "number" && Number.isFinite(val)) return val;

    let s = String(val).trim();
    if (!s) return 0;

    // Negativo contable: "(1,234.56)"
    let negative = false;
    if (/^\(.*\)$/.test(s)) {
        negative = true;
        s = s.slice(1, -1);
    }

    // Quitar símbolos de moneda y espacios
    s = s.replace(/[\s$€£¥₱]/g, "").replace(/[A-Za-z]/g, "");

    // Detectar formato europeo "1.234,56" vs anglosajón "1,234.56"
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) {
        // El último separador es el decimal
        if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
            s = s.replace(/\./g, "").replace(",", ".");
        } else {
            s = s.replace(/,/g, "");
        }
    } else if (hasComma && !hasDot) {
        // Si la coma parece decimal (un solo bloque tras la coma de 1-2 dígitos)
        const parts = s.split(",");
        if (parts.length === 2 && parts[1].length <= 2) {
            s = parts[0] + "." + parts[1];
        } else {
            s = s.replace(/,/g, "");
        }
    }

    // Caso de signo negativo "-"
    if (s.startsWith("-")) {
        negative = !negative;
        s = s.slice(1);
    }

    const n = parseFloat(s);
    if (!Number.isFinite(n)) return 0;
    return negative ? -n : n;
};

/**
 * parseDateInput
 * Convierte una entrada de fecha a un objeto Date.
 * Acepta:
 *  - Date nativo
 *  - número serial Excel (días desde 1899-12-30)
 *  - string ISO (YYYY-MM-DD, con o sin hora)
 *  - string europeo (DD/MM/YYYY o DD-MM-YYYY)
 * Devuelve null si no es interpretable.
 */
export const parseDateInput = (val) => {
    if (val === null || val === undefined || val === "") return null;
    if (val instanceof Date && !isNaN(val.getTime())) return val;

    // Serial Excel
    if (typeof val === "number" && Number.isFinite(val)) {
        // Base epoch Excel: 1899-12-30 (ajuste por bug 1900)
        const epoch = new Date(Date.UTC(1899, 11, 30));
        const d = new Date(epoch.getTime() + val * 86400000);
        return isNaN(d.getTime()) ? null : d;
    }

    const s = String(val).trim();
    if (!s) return null;

    // ISO: YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    // DD/MM/YYYY o DD-MM-YYYY
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
        let [, dd, mm, yyyy] = m;
        if (yyyy.length === 2) yyyy = (parseInt(yyyy, 10) > 50 ? "19" : "20") + yyyy;
        const d = new Date(Date.UTC(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10)));
        return isNaN(d.getTime()) ? null : d;
    }

    // Fallback: confiar en Date()
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
};

export default { parseBoolean, parseAmount, parseDateInput };
