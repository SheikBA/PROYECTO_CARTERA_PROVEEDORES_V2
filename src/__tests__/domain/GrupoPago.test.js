import { describe, it, expect } from 'vitest';
import {
    GrupoPago,
    TipoPago,
    EstadoGrupo,
    CambioProhibidoError,
    ValidacionPendienteError,
} from '../../domain/GrupoPago.js';

const buildGrupo = (overrides = {}) => new GrupoPago({
    grupoId: 'GRP-2026-001',
    empresaId: 'HSHOTEL',
    paisId: 'MX',
    proveedorId: 'PROV-001',
    facturas: ['FAC-001', 'FAC-002'],
    referencia: '45001',
    tipoPago: TipoPago.H2H,
    bancoPagadorId: 'BANAMEX',
    montoTotal: 45000.00,
    moneda: 'MXN',
    ...overrides,
});

// TP1-004 (parcial) — procesamiento requiere validación previa
describe('GrupoPago — procesar', () => {
    it('transita a PROCESADO cuando validación es válida', () => {
        const grupo = buildGrupo();
        grupo.registrarValidacion({ valido: true, errores: [] });
        grupo.procesar();
        expect(grupo.estado).toBe(EstadoGrupo.PROCESADO);
    });

    it('INV-006 — lanza ValidacionPendienteError sin validación registrada', () => {
        const grupo = buildGrupo();
        expect(() => grupo.procesar()).toThrow(ValidacionPendienteError);
    });

    it('INV-006 — lanza ValidacionPendienteError cuando validación falla', () => {
        const grupo = buildGrupo();
        grupo.registrarValidacion({ valido: false, errores: [{ codigo: 'DLL-042' }] });
        expect(() => grupo.procesar()).toThrow(ValidacionPendienteError);
    });
});

// INV-001 — cambio de tipo de pago
describe('GrupoPago — cambiarTipoPago (INV-001)', () => {
    it('permite cambio H2H → MANUAL', () => {
        const grupo = buildGrupo({ tipoPago: TipoPago.H2H });
        grupo.cambiarTipoPago(TipoPago.MANUAL);
        expect(grupo.tipoPago).toBe(TipoPago.MANUAL);
    });

    it('lanza CambioProhibidoError en cambio MANUAL → H2H', () => {
        const grupo = buildGrupo({ tipoPago: TipoPago.MANUAL });
        expect(() => grupo.cambiarTipoPago(TipoPago.H2H)).toThrow(CambioProhibidoError);
    });
});

// INV-002 — referencia de evento
describe('GrupoPago — referenciaEvento (INV-002)', () => {
    it('TP1-011 — referencia_override activa sin cambiar referencia original', () => {
        const grupo = buildGrupo({ referencia: '45001' });
        grupo.aplicarReferenciaEvento('REF-TEMP-001');
        expect(grupo.referencia).toBe('REF-TEMP-001');
        expect(grupo.referenciaOriginal).toBe('45001');
    });

    it('al limpiar el evento la referencia vuelve al original', () => {
        const grupo = buildGrupo({ referencia: '45001' });
        grupo.aplicarReferenciaEvento('REF-TEMP-001');
        grupo.limpiarReferenciaEvento();
        expect(grupo.referencia).toBe('45001');
    });
});

// Cambio de banco pagador
describe('GrupoPago — cambiarBancoPagador', () => {
    it('TP1-016 — actualiza banco con confirmacion_no_duplicidad=true', () => {
        const grupo = buildGrupo();
        grupo.cambiarBancoPagador('BANORTE', true);
        expect(grupo.bancoPagadorId).toBe('BANORTE');
    });

    it('TP1-017 — lanza error con confirmacion_no_duplicidad=false', () => {
        const grupo = buildGrupo();
        expect(() => grupo.cambiarBancoPagador('BANORTE', false)).toThrow();
    });
});

// Estado inicial
describe('GrupoPago — estado inicial', () => {
    it('arranca en estado PENDIENTE', () => {
        expect(buildGrupo().estado).toBe(EstadoGrupo.PENDIENTE);
    });

    it('marcarRechazado transita a RECHAZADO', () => {
        const grupo = buildGrupo();
        grupo.marcarRechazado();
        expect(grupo.estado).toBe(EstadoGrupo.RECHAZADO);
    });

    it('anular transita a ANULADO', () => {
        const grupo = buildGrupo();
        grupo.anular();
        expect(grupo.estado).toBe(EstadoGrupo.ANULADO);
    });
});
