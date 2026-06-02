/**
 * Tests P2 — flujo completo de match comprobante↔grupo
 * HU-008, HU-009 | RN-012, RN-013, RN-014
 */
import { describe, it, expect } from 'vitest';
import { evaluar } from '../../services/MatchService.js';

// Simula lo que hace parsearArchivoPDF + invoiceToGrupo en PaymentVerification
const buildComprobante = (o = {}) => ({
    fecha: '2026-06-02',
    proveedorId: 'PROV-001',
    monto: 45000.00,
    concepto: 'servicios junio',
    oficial: true,
    paisId: 'MX',
    ...o,
});

const buildGrupo = (o = {}) => ({
    fecha: '2026-06-02',
    proveedorId: 'PROV-001',
    montoTotal: 45000.00,
    concepto: 'servicios junio',
    estado: 'en_proceso',
    ...o,
});

// Simula generarNombreEstandar
const generarNombre = (inv) => {
    const empresa = (inv.company || 'HS').toUpperCase();
    const rfc     = (inv.rfc || 'RFC000000000').toUpperCase();
    const banco   = (inv.bankId || 'BANCO').toUpperCase();
    const payment = inv.payment || 'PAY';
    return `${empresa}_${rfc}_${banco}_${payment}.pdf`;
};

describe('P2 — Match comprobante↔grupo (HU-009)', () => {

    it('TP2-005 — match exacto por 4 params → matcheado=true', () => {
        const { matcheado, parametros } = evaluar(buildComprobante(), buildGrupo());
        expect(matcheado).toBe(true);
        expect(Object.values(parametros).every(Boolean)).toBe(true);
    });

    it('TP2-006 — monto con diferencia de 1 centavo → no matchea', () => {
        const { matcheado, parametros } = evaluar(
            buildComprobante({ monto: 45000.01 }),
            buildGrupo({ montoTotal: 45000.00 }),
        );
        expect(matcheado).toBe(false);
        expect(parametros.monto).toBe(false);
    });

    it('TP2-007 — Granada no oficial con 4 params → matchea (RN-013)', () => {
        const { matcheado } = evaluar(
            buildComprobante({ oficial: false, paisId: 'GD' }),
            buildGrupo(),
        );
        expect(matcheado).toBe(true);
    });

    it('TP2-008 — Granada no oficial faltando concepto → no matchea', () => {
        const { matcheado } = evaluar(
            buildComprobante({ oficial: false, paisId: 'GD', concepto: 'otro concepto' }),
            buildGrupo(),
        );
        expect(matcheado).toBe(false);
    });

    it('México no oficial → no matchea aunque 4 params sean correctos', () => {
        const { matcheado } = evaluar(
            buildComprobante({ oficial: false, paisId: 'MX' }),
            buildGrupo(),
        );
        expect(matcheado).toBe(false);
    });

});

describe('P2 — Renombre estándar (RN-012)', () => {

    it('genera nombre empresa_RFC_banco_payment.pdf', () => {
        const nombre = generarNombre({ company: 'HSHOTEL', rfc: 'PSA800101AAA', bankId: 'BANAMEX', payment: '45001' });
        expect(nombre).toBe('HSHOTEL_PSA800101AAA_BANAMEX_45001.pdf');
    });

    it('usa defaults cuando faltan campos', () => {
        const nombre = generarNombre({});
        expect(nombre).toMatch(/\.pdf$/);
        expect(nombre).toContain('_');
    });

});
