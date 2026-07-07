/**
 * FraccionamientoService
 * HU-005 | RN-007
 * Fracciona un array de facturas en subgrupos cuando el proveedor
 * tiene limit_to_pay configurado en Epicor.
 */

/**
 * Divide facturas en subgrupos de tamaño máximo `limite`.
 * Si facturas.length <= limite, devuelve un único subgrupo sin fraccionamiento.
 * @param {any[]} facturas
 * @param {number} limite
 * @returns {any[][]}
 */
export const fraccionar = (facturas, limite) => {
    if (!Number.isInteger(limite) || limite <= 0) {
        throw new Error('limit_to_pay debe ser un entero positivo');
    }
    const subgrupos = [];
    for (let i = 0; i < facturas.length; i += limite) {
        subgrupos.push(facturas.slice(i, i + limite));
    }
    return subgrupos;
};

// ─── REQ-030 v1.2: Clasificación simplificada de facturas ─────────────────────
// DEC-032: regla de holgura de 24 horas eliminada — no existe ventana de tolerancia
// DEC-033: toda factura no vencida va a cola de autorización sin excepción
// DEC-033: no se incluye ninguna factura automáticamente por coincidencia de OC

/**
 * Clasifica una factura en VENCIDA (pago directo) o NO_VENCIDA (cola de autorización).
 * Criterio único: si dueDate < hoy → VENCIDA; en cualquier otro caso → NO_VENCIDA.
 *
 * @param {{ dueDate: string|null }} factura
 * @returns {'VENCIDA' | 'NO_VENCIDA'}
 */
export const clasificarFactura = (factura) => {
    if (!factura.dueDate) return 'NO_VENCIDA';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(factura.dueDate);
    venc.setHours(0, 0, 0, 0);
    // DEC-032: sin holgura — el límite es estrictamente < hoy (no 24h antes)
    return venc < hoy ? 'VENCIDA' : 'NO_VENCIDA';
};

/**
 * Separa un array de facturas en dos grupos según su estado de vencimiento.
 * Las VENCIDAS van a pago directo; las NO_VENCIDAS se envían a autorización.
 *
 * @param {any[]} facturas
 * @returns {{ paraGrupoDirecto: any[], paraAutorizacion: any[] }}
 */
export const separarPorVencimiento = (facturas) => {
    const paraGrupoDirecto = [];
    const paraAutorizacion = [];
    for (const f of facturas) {
        if (clasificarFactura(f) === 'VENCIDA') {
            paraGrupoDirecto.push(f);
        } else {
            // DEC-033: no-vencidas → siempre a autorización, sin importar OC u otros campos
            paraAutorizacion.push(f);
        }
    }
    return { paraGrupoDirecto, paraAutorizacion };
};

/* TODO: DEC-032 — Si en el futuro se requiere restaurar la holgura de 24 horas,
   descomentar y ajustar clasificarFactura. Actualmente eliminada por decisión de negocio.
   TODO: DEC-033 — Si se requiere inclusión automática por OC en el futuro,
   debe revisarse con el BA antes de implementar. */
