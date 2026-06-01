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
