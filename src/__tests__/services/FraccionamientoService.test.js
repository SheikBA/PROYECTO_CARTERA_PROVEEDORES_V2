import { describe, it, expect } from 'vitest';
import { fraccionar } from '../../services/FraccionamientoService.js';

const buildFacturas = (n) => Array.from({ length: n }, (_, i) => `FAC-${String(i + 1).padStart(3, '0')}`);

describe('FraccionamientoService.fraccionar', () => {

    // TP1-012 — 7 facturas con limit=3 genera 3 subgrupos
    it('TP1-012 — 7 facturas / limit=3 → [3, 3, 1]', () => {
        const subgrupos = fraccionar(buildFacturas(7), 3);
        expect(subgrupos).toHaveLength(3);
        expect(subgrupos[0]).toHaveLength(3);
        expect(subgrupos[1]).toHaveLength(3);
        expect(subgrupos[2]).toHaveLength(1);
    });

    // TP1-013 — limit exactamente igual → sin fraccionamiento
    it('TP1-013 — limit igual a número de facturas → 1 subgrupo sin fraccionamiento', () => {
        const subgrupos = fraccionar(buildFacturas(3), 3);
        expect(subgrupos).toHaveLength(1);
        expect(subgrupos[0]).toHaveLength(3);
    });

    it('1 factura con limit=5 → 1 subgrupo', () => {
        const subgrupos = fraccionar(buildFacturas(1), 5);
        expect(subgrupos).toHaveLength(1);
    });

    it('10 facturas con limit=2 → 5 subgrupos', () => {
        const subgrupos = fraccionar(buildFacturas(10), 2);
        expect(subgrupos).toHaveLength(5);
        subgrupos.forEach(sg => expect(sg).toHaveLength(2));
    });

    it('lanza error si limite no es entero positivo', () => {
        expect(() => fraccionar(buildFacturas(5), 0)).toThrow();
        expect(() => fraccionar(buildFacturas(5), -1)).toThrow();
        expect(() => fraccionar(buildFacturas(5), 1.5)).toThrow();
    });
});
