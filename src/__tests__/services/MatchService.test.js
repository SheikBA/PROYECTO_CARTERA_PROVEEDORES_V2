import { describe, it, expect } from 'vitest';
import { evaluar } from '../../services/MatchService.js';

const buildComprobante = (overrides = {}) => ({
    fecha: '2026-06-01',
    proveedorId: 'PROV-001',
    monto: 45000.00,
    concepto: 'Servicios junio',
    oficial: true,
    paisId: 'MX',
    ...overrides,
});

const buildGrupo = (overrides = {}) => ({
    fecha: '2026-06-01',
    proveedorId: 'PROV-001',
    montoTotal: 45000.00,
    concepto: 'Servicios junio',
    estado: 'en_proceso',
    ...overrides,
});

describe('MatchService.evaluar', () => {

    // TP2-005 — match exacto por 4 parámetros
    it('TP2-005 — match exacto → matcheado=true, 4 params en true', () => {
        const { matcheado, parametros } = evaluar(buildComprobante(), buildGrupo());
        expect(matcheado).toBe(true);
        expect(Object.values(parametros).every(Boolean)).toBe(true);
    });

    // TP2-006 — diferencia de 1 centavo no matchea
    it('TP2-006 — monto con diferencia > tolerancia → no matchea', () => {
        const { matcheado, parametros } = evaluar(
            buildComprobante({ monto: 45000.01 }),
            buildGrupo({ montoTotal: 45000.00 }),
        );
        expect(matcheado).toBe(false);
        expect(parametros.monto).toBe(false);
    });

    it('diferencia exactamente en tolerancia → matchea', () => {
        const { matcheado } = evaluar(
            buildComprobante({ monto: 45000.004 }),
            buildGrupo({ montoTotal: 45000.00 }),
        );
        expect(matcheado).toBe(true);
    });

    it('fecha diferente → no matchea', () => {
        const { matcheado, parametros } = evaluar(
            buildComprobante({ fecha: '2026-05-31' }),
            buildGrupo(),
        );
        expect(matcheado).toBe(false);
        expect(parametros.fecha).toBe(false);
    });

    it('proveedor diferente → no matchea', () => {
        const { matcheado, parametros } = evaluar(
            buildComprobante({ proveedorId: 'PROV-999' }),
            buildGrupo(),
        );
        expect(matcheado).toBe(false);
        expect(parametros.proveedor).toBe(false);
    });

    it('concepto diferente → no matchea', () => {
        const { matcheado, parametros } = evaluar(
            buildComprobante({ concepto: 'Otro concepto' }),
            buildGrupo(),
        );
        expect(matcheado).toBe(false);
        expect(parametros.concepto).toBe(false);
    });

    // TP2-007 — Granada: comprobante no oficial con 4 params → matchea
    it('TP2-007 — Granada, no oficial, 4 params → matcheado=true (RN-013)', () => {
        const { matcheado } = evaluar(
            buildComprobante({ oficial: false, paisId: 'GD' }),
            buildGrupo(),
        );
        expect(matcheado).toBe(true);
    });

    // TP2-008 — Granada: comprobante no oficial sin 1 param → no matchea
    it('TP2-008 — Granada, no oficial, concepto faltante → no matchea', () => {
        const { matcheado } = evaluar(
            buildComprobante({ oficial: false, paisId: 'GD', concepto: 'Diferente' }),
            buildGrupo(),
        );
        expect(matcheado).toBe(false);
    });

    it('México: comprobante no oficial → no matchea aunque 4 params sean correctos', () => {
        const { matcheado } = evaluar(
            buildComprobante({ oficial: false, paisId: 'MX' }),
            buildGrupo(),
        );
        expect(matcheado).toBe(false);
    });

    it('concepto con espacios y mayúsculas distintas → matchea (normalización)', () => {
        const { matcheado } = evaluar(
            buildComprobante({ concepto: '  SERVICIOS JUNIO  ' }),
            buildGrupo({ concepto: 'servicios junio' }),
        );
        expect(matcheado).toBe(true);
    });
});
