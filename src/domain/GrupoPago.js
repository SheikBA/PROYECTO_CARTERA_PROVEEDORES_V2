/**
 * Aggregate Root: GrupoPago
 * DDD-HUELLA-CP-2026-001 | INV-001, INV-002, INV-005, INV-006
 */

export const EstadoGrupo = Object.freeze({
    PENDIENTE: 'pendiente',
    PROCESADO: 'procesado',
    RECHAZADO: 'rechazado',
    ANULADO: 'anulado',
});

export const TipoPago = Object.freeze({
    H2H: 'H2H',
    MANUAL: 'MANUAL',
});

export class CambioProhibidoError extends Error {
    constructor() { super('INV-001: Cambio MANUAL → H2H prohibido'); this.code = 'INV-001'; }
}

export class ValidacionPendienteError extends Error {
    constructor() { super('INV-006: Validación DLL requerida antes de procesar'); this.code = 'INV-006'; }
}

export class ModificacionInmutableError extends Error {
    constructor() { super('INV-002: La referencia del grupo es inmutable'); this.code = 'INV-002'; }
}

export class GrupoPago {
    #grupoId;
    #empresaId;
    #paisId;
    #proveedorId;
    #facturas;
    #referencia;
    #referenciaEvento;
    #tipoPago;
    #bancoPagadorId;
    #montoTotal;
    #moneda;
    #estado;
    #validationResult;

    constructor({ grupoId, empresaId, paisId, proveedorId, facturas, referencia, tipoPago, bancoPagadorId, montoTotal, moneda }) {
        this.#grupoId = grupoId;
        this.#empresaId = empresaId;
        this.#paisId = paisId;
        this.#proveedorId = proveedorId;
        this.#facturas = facturas ?? [];
        this.#referencia = referencia;
        this.#referenciaEvento = null;
        this.#tipoPago = tipoPago;
        this.#bancoPagadorId = bancoPagadorId;
        this.#montoTotal = montoTotal;
        this.#moneda = moneda ?? 'MXN';
        this.#estado = EstadoGrupo.PENDIENTE;
        this.#validationResult = null;
    }

    get grupoId() { return this.#grupoId; }
    get estado() { return this.#estado; }
    get tipoPago() { return this.#tipoPago; }
    get referencia() { return this.#referenciaEvento ?? this.#referencia; }
    get referenciaOriginal() { return this.#referencia; }
    get montoTotal() { return this.#montoTotal; }
    get moneda() { return this.#moneda; }
    get facturas() { return [...this.#facturas]; }
    get bancoPagadorId() { return this.#bancoPagadorId; }
    get empresaId() { return this.#empresaId; }
    get paisId() { return this.#paisId; }
    get proveedorId() { return this.#proveedorId; }

    // INV-001: MANUAL → H2H prohibido
    cambiarTipoPago(nuevoTipo) {
        if (this.#tipoPago === TipoPago.MANUAL && nuevoTipo === TipoPago.H2H) {
            throw new CambioProhibidoError();
        }
        this.#tipoPago = nuevoTipo;
    }

    // INV-002: override solo aplica al evento, nunca persiste en referencia base
    aplicarReferenciaEvento(override) {
        this.#referenciaEvento = override;
    }

    limpiarReferenciaEvento() {
        this.#referenciaEvento = null;
    }

    cambiarBancoPagador(nuevoBancoId, confirmacionNoDuplicidad) {
        if (!confirmacionNoDuplicidad) {
            throw new Error('Se requiere confirmación explícita de no-duplicidad para cambiar banco');
        }
        this.#bancoPagadorId = nuevoBancoId;
    }

    registrarValidacion(validationResult) {
        this.#validationResult = validationResult;
    }

    // INV-006: requiere validación previa
    procesar() {
        if (!this.#validationResult?.valido) {
            throw new ValidacionPendienteError();
        }
        this.#estado = EstadoGrupo.PROCESADO;
    }

    marcarRechazado() {
        this.#estado = EstadoGrupo.RECHAZADO;
    }

    anular() {
        this.#estado = EstadoGrupo.ANULADO;
    }

    toPlain() {
        return {
            grupoId: this.#grupoId,
            empresaId: this.#empresaId,
            paisId: this.#paisId,
            proveedorId: this.#proveedorId,
            facturas: this.#facturas,
            referencia: this.referencia,
            tipoPago: this.#tipoPago,
            bancoPagadorId: this.#bancoPagadorId,
            montoTotal: this.#montoTotal,
            moneda: this.#moneda,
            estado: this.#estado,
        };
    }
}
