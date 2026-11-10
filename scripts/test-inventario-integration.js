'use strict';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const db = require('../models');
const inventarioService = require('../src/services/inventarioService');

const {
  AprobacionCompra,
  ConfiguracionControlCompra,
  Cotizacion,
  DecisionAprobacionCompra,
  DetalleRecepcionCompra,
  DetalleVersionOrdenCompra,
  Material,
  MovimientoInventario,
  OrdenCompra,
  ParametrosInventario,
  Proveedor,
  Rol,
  RecepcionCompra,
  SolicitudAjuste,
  DecisionAjuste,
  Traslado,
  Ubicacion,
  Usuario,
  ValeSalida,
  VersionOrdenCompra,
  sequelize
} = db;

const testToken = randomUUID();
const materialCode = `IT-${testToken.slice(0, 27)}`;
const failureMaterialCode = `IF-${testToken.slice(0, 27)}`;
const openingDocument = `IT-OPEN-${testToken}`;
const failureOpeningDocument = `IT-FAIL-${testToken}`;
const transferCode = `ITT-${testToken}`;
const insufficientTransferCode = `IFT-${testToken}`;
const valeCode = `ITV-${testToken}`;
const insufficientValeCode = `IV-${testToken}`;
const orderCode = `ITO-${testToken}`;
const secondOrderCode = `IT2-${testToken}`;
const failedOrderCode = `IF-${testToken}`;
const supplierIdentification = `ITP-${testToken}`;
const testDate = new Date('2026-11-09T12:00:00.000Z');

async function findRequiredFixtures() {
  const [user, origin, destination] = await Promise.all([
    Usuario.findOne({
      where: { correo: 'responsable.obras@example.invalid', activo: true },
      attributes: ['id_usuario'],
      logging: false
    }),
    Ubicacion.findOne({
      where: { nombre: 'Obras' },
      attributes: ['id_ubicacion'],
      logging: false
    }),
    Ubicacion.findOne({
      where: { nombre: 'Bodega Central' },
      attributes: ['id_ubicacion'],
      logging: false
    })
  ]);

  if (!user || !origin || !destination) {
    throw new Error('Required seeded user and locations are unavailable; integration test did not write data.');
  }
  if (Number(origin.id_ubicacion) === Number(destination.id_ubicacion)) {
    throw new Error('Integration test origin and destination must be different locations.');
  }
  const [approver, adminRole, warehouseRole, adminAssignment, warehouseAssignment] = await Promise.all([
    Usuario.findByPk(5, { attributes: ['id_usuario', 'activo'], logging: false }),
    Rol.findByPk(1, { attributes: ['id_rol', 'nombre'], logging: false }),
    Rol.findByPk(2, { attributes: ['id_rol', 'nombre'], logging: false }),
    db.UsuarioRol.findOne({ where: { id_usuario: 5, id_rol: 1 }, attributes: ['id_usuario_rol'], logging: false }),
    db.UsuarioRol.findOne({ where: { id_usuario: 5, id_rol: 2 }, attributes: ['id_usuario_rol'], logging: false })
  ]);
  if (
    Number(user.id_usuario) === 5 ||
    !approver ||
    !approver.activo ||
    !adminRole ||
    adminRole.nombre !== 'Administrador' ||
    !warehouseRole ||
    warehouseRole.nombre !== 'Encargado de Bodega' ||
    !adminAssignment ||
    !warehouseAssignment
  ) {
    throw new Error('Expected active requester and authorized user 5 with both confirmed roles are unavailable.');
  }
  const activeCandidates = await Usuario.findAll({
    where: {
      activo: true,
      id_usuario: {
        [db.Sequelize.Op.notIn]: [Number(user.id_usuario), 5]
      }
    },
    attributes: ['id_usuario'],
    order: [['id_usuario', 'ASC']],
    logging: false
  });
  let nonAdmin = null;
  for (const candidate of activeCandidates) {
    const assignment = await db.UsuarioRol.findOne({
      where: { id_usuario: candidate.id_usuario, id_rol: adminRole.id_rol },
      attributes: ['id_usuario_rol'],
      logging: false
    });
    if (!assignment) {
      nonAdmin = candidate;
      break;
    }
  }
  if (!nonAdmin) {
    throw new Error('An active user without the Administrator role is required for authorization tests.');
  }

  return {
    id_usuario: Number(user.id_usuario),
    id_usuario_aprobador: 5,
    id_usuario_no_solicitante: Number(nonAdmin.id_usuario),
    id_origen: Number(origin.id_ubicacion),
    id_destino: Number(destination.id_ubicacion)
  };
}

async function ensureNoTestRows() {
  const [material, failureMaterial, movements, failureMovement, transfer, insufficientTransfer, vale, insufficientVale, order, secondOrder, failedOrder, supplier] = await Promise.all([
    Material.findOne({ where: { codigo: materialCode }, attributes: ['id_material'], logging: false }),
    Material.findOne({ where: { codigo: failureMaterialCode }, attributes: ['id_material'], logging: false }),
    MovimientoInventario.findOne({
      where: { documento_apertura: openingDocument },
      attributes: ['id_movimiento'],
      logging: false
    }),
    MovimientoInventario.findOne({
      where: { documento_apertura: failureOpeningDocument },
      attributes: ['id_movimiento'],
      logging: false
    }),
    Traslado.findOne({ where: { codigo: transferCode }, attributes: ['id_traslado'], logging: false }),
    Traslado.findOne({ where: { codigo: insufficientTransferCode }, attributes: ['id_traslado'], logging: false }),
    ValeSalida.findOne({ where: { codigo: valeCode }, attributes: ['id_vale'], logging: false }),
    ValeSalida.findOne({ where: { codigo: insufficientValeCode }, attributes: ['id_vale'], logging: false }),
    OrdenCompra.findOne({ where: { codigo: orderCode }, attributes: ['id_orden'], logging: false }),
    OrdenCompra.findOne({ where: { codigo: secondOrderCode }, attributes: ['id_orden'], logging: false }),
    OrdenCompra.findOne({ where: { codigo: failedOrderCode }, attributes: ['id_orden'], logging: false }),
    Proveedor.findOne({ where: { identificacion: supplierIdentification }, attributes: ['id_proveedor'], logging: false })
  ]);

  assert.equal(material, null, 'test material must not remain in the database');
  assert.equal(failureMaterial, null, 'failed transaction material must not remain in the database');
  assert.equal(movements, null, 'test opening movement must not remain in the database');
  assert.equal(failureMovement, null, 'failed transaction opening must not remain in the database');
  assert.equal(transfer, null, 'test transfer must not remain in the database');
  assert.equal(insufficientTransfer, null, 'insufficient-stock transfer must not remain in the database');
  assert.equal(vale, null, 'test vale must not remain in the database');
  assert.equal(insufficientVale, null, 'insufficient-stock vale must not remain in the database');
  assert.equal(order, null, 'test order must not remain in the database');
  assert.equal(secondOrder, null, 'second test order must not remain in the database');
  assert.equal(failedOrder, null, 'failed test order must not remain in the database');
  assert.equal(supplier, null, 'test supplier must not remain in the database');
}

async function assertHttpError(operation, expectedStatus, expectedCode) {
  await assert.rejects(operation, error =>
    error.status === expectedStatus && error.code === expectedCode
  );
}

async function run() {
  if (sequelize.config.database !== 'constructora_del_valle') {
    throw new Error('Refusing to run against an unexpected database.');
  }

  await sequelize.authenticate();
  const fixtures = await findRequiredFixtures();
  await ensureNoTestRows();
  const activePurchaseConfigurations = await ConfiguracionControlCompra.count({ where: { activo: true } });
  if (activePurchaseConfigurations > 1) {
    throw new Error('More than one active purchase-control configuration exists; duplicate-check integration cannot run safely.');
  }
  const generatedIds = {
    parameters: null,
    purchaseConfiguration: null,
    updatedPurchaseConfiguration: null,
    purchaseOrder: null,
    secondPurchaseOrder: null,
    purchaseVersion: null,
    secondPurchaseVersion: null,
    purchaseQuote: null,
    secondPurchaseQuote: null,
    purchaseApproval: null,
    secondPurchaseApproval: null,
    purchaseDecision: null,
    rejectionDecision: null,
    partialReceipt: null,
    completeReceipt: null,
    purchaseRows: {
      orders: [],
      versions: [],
      versionDetails: [],
      quotes: [],
      quoteDetails: [],
      approvals: [],
      decisions: [],
      receipts: [],
      receiptDetails: [],
      movements: []
    }
  };
  const adjustmentIds = {
    positiveRequest: null,
    negativeRequest: null,
    insufficientRequest: null,
    rejectedRequest: null,
    rollbackRequest: null
  };

  const transaction = await sequelize.transaction();
  let rollbackSucceeded = false;
  let testError;

  try {
    const material = await Material.create({
      codigo: materialCode,
      nombre: 'Integration test material',
      descripcion: 'Temporary row rolled back by integration test.',
      unidad_medida: 'unidad',
      activo: true
    }, { transaction, logging: false });

    const valeResult = await inventarioService.createValeSalida({
      codigo: valeCode,
      id_ubicacion: fixtures.id_origen,
      id_solicitante: fixtures.id_usuario,
      fecha_solicitud: testDate,
      motivo: 'Integration test fixture.',
      estado: 'PRUEBA',
      detalles: [{ id_material: material.id_material, cantidad_solicitada: '1.250' }]
    }, { transaction });

    const opening = await inventarioService.createApertura({
      id_material: material.id_material,
      id_ubicacion_destino: fixtures.id_origen,
      id_usuario: fixtures.id_usuario,
      cantidad: '12.750',
      fecha_movimiento: testDate,
      documento_apertura: openingDocument
    }, { transaction });
    assert.equal(opening.existencia.stock_disponible, '12.750');
    assert.equal(opening.movimiento.id_ubicacion_origen, null);

    const positiveRequest = await inventarioService.createSolicitudAjuste({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      id_solicitante: fixtures.id_usuario,
      cantidad_variacion: '2.500',
      motivo: 'Integration positive adjustment.',
      estado: 'PRUEBA',
      fecha_solicitud: testDate
    }, { transaction });
    adjustmentIds.positiveRequest = positiveRequest.id_solicitud_ajuste;
    const positiveDecision = await inventarioService.createDecisionAjuste(positiveRequest.id_solicitud_ajuste, {
      id_administrador: fixtures.id_usuario,
      decision: 'APROBADO',
      motivo: 'Approved integration adjustment.',
      fecha_decision: testDate
    }, { transaction });
    assert.equal(positiveDecision.movimiento.tipo, 'AJUSTE_ENTRADA');
    assert.equal(positiveDecision.movimiento.cantidad, '2.500');

    const negativeRequest = await inventarioService.createSolicitudAjuste({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      id_solicitante: fixtures.id_usuario,
      cantidad_variacion: '-3.125',
      motivo: 'Integration negative adjustment.',
      estado: 'PRUEBA',
      fecha_solicitud: testDate
    }, { transaction });
    adjustmentIds.negativeRequest = negativeRequest.id_solicitud_ajuste;
    const negativeDecision = await inventarioService.createDecisionAjuste(negativeRequest.id_solicitud_ajuste, {
      id_administrador: fixtures.id_usuario,
      decision: 'APROBADO',
      fecha_decision: testDate
    }, { transaction });
    assert.equal(negativeDecision.movimiento.tipo, 'AJUSTE_SALIDA');
    assert.equal(negativeDecision.movimiento.cantidad, '3.125');
    let adjustmentBalance = await inventarioService.getExistencia({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      transaction
    });
    assert.equal(adjustmentBalance.stock_disponible, '12.125');

    const rejectedRequest = await inventarioService.createSolicitudAjuste({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      id_solicitante: fixtures.id_usuario,
      cantidad_variacion: '4.000',
      motivo: 'Integration rejected adjustment.',
      estado: 'PRUEBA',
      fecha_solicitud: testDate
    }, { transaction });
    adjustmentIds.rejectedRequest = rejectedRequest.id_solicitud_ajuste;
    const rejectedDecision = await inventarioService.createDecisionAjuste(rejectedRequest.id_solicitud_ajuste, {
      id_administrador: fixtures.id_usuario,
      decision: 'RECHAZADO',
      fecha_decision: testDate
    }, { transaction });
    assert.equal(rejectedDecision.movimiento, null);
    adjustmentBalance = await inventarioService.getExistencia({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      transaction
    });
    assert.equal(adjustmentBalance.stock_disponible, '12.125');
    assert.equal(await MovimientoInventario.count({
      where: { id_decision_ajuste: rejectedDecision.decision.id_decision_ajuste },
      transaction
    }), 0);

    await assertHttpError(
      () => inventarioService.createDecisionAjuste(rejectedRequest.id_solicitud_ajuste, {
        id_administrador: fixtures.id_usuario,
        decision: 'APROBADO',
        fecha_decision: testDate
      }, { transaction }),
      409,
      'ADJUSTMENT_DECISION_ALREADY_RECORDED'
    );
    await assertHttpError(
      () => inventarioService.createDecisionAjuste(2147483647, {
        id_administrador: fixtures.id_usuario,
        decision: 'APROBADO',
        fecha_decision: testDate
      }, { transaction }),
      404,
      'ADJUSTMENT_REQUEST_NOT_FOUND'
    );
    await assertHttpError(
      () => inventarioService.createDecisionAjuste(positiveRequest.id_solicitud_ajuste, {
        id_administrador: fixtures.id_usuario,
        decision: 'APROBADO ',
        fecha_decision: testDate
      }, { transaction }),
      400,
      'INVALID_ADJUSTMENT_DECISION'
    );

    const insufficientRequest = await inventarioService.createSolicitudAjuste({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      id_solicitante: fixtures.id_usuario,
      cantidad_variacion: '-999.000',
      motivo: 'Integration insufficient stock adjustment.',
      estado: 'PRUEBA',
      fecha_solicitud: testDate
    }, { transaction });
    adjustmentIds.insufficientRequest = insufficientRequest.id_solicitud_ajuste;
    await assertHttpError(
      () => inventarioService.createDecisionAjuste(insufficientRequest.id_solicitud_ajuste, {
        id_administrador: fixtures.id_usuario,
        decision: 'APROBADO',
        fecha_decision: testDate
      }, { transaction }),
      409,
      'INSUFFICIENT_STOCK'
    );
    assert.equal(await DecisionAjuste.count({
      where: { id_solicitud_ajuste: insufficientRequest.id_solicitud_ajuste },
      transaction
    }), 0, 'insufficient adjustment must roll back its approval');

    const rollbackRequest = await inventarioService.createSolicitudAjuste({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      id_solicitante: fixtures.id_usuario,
      cantidad_variacion: '1.000',
      motivo: 'Integration forced adjustment write failure.',
      estado: 'PRUEBA',
      fecha_solicitud: testDate
    }, { transaction });
    adjustmentIds.rollbackRequest = rollbackRequest.id_solicitud_ajuste;
    const originalAdjustmentMovementCreate = MovimientoInventario.create;
    MovimientoInventario.create = async (values, options) => {
      if (values.tipo === 'AJUSTE_ENTRADA') {
        throw new Error('Forced adjustment movement write failure.');
      }
      return originalAdjustmentMovementCreate.call(MovimientoInventario, values, options);
    };
    try {
      await assert.rejects(
        () => inventarioService.createDecisionAjuste(rollbackRequest.id_solicitud_ajuste, {
          id_administrador: fixtures.id_usuario,
          decision: 'APROBADO',
          fecha_decision: testDate
        }, { transaction }),
        /Forced adjustment movement write failure/
      );
    } finally {
      MovimientoInventario.create = originalAdjustmentMovementCreate;
    }
    assert.equal(await DecisionAjuste.count({
      where: { id_solicitud_ajuste: rollbackRequest.id_solicitud_ajuste },
      transaction
    }), 0, 'failed adjustment movement write must roll back approval');

    await assertHttpError(
      () => inventarioService.createDecisionAjuste(positiveRequest.id_solicitud_ajuste, {
        id_administrador: fixtures.id_usuario,
        decision: 'APROBADO',
        fecha_decision: testDate
      }, { transaction }),
      409,
      'ADJUSTMENT_DECISION_ALREADY_RECORDED'
    );
    assert.equal(await MovimientoInventario.count({
      where: { id_decision_ajuste: positiveDecision.decision.id_decision_ajuste },
      transaction
    }), 1, 'a repeated approval must not create another movement');

    const positiveAdjustment = await inventarioService.createSolicitudAjuste({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      id_solicitante: fixtures.id_usuario,
      cantidad_variacion: '2.500',
      motivo: 'Integration-only positive adjustment request.',
      estado: 'PRUEBA',
      fecha_solicitud: testDate
    }, { transaction });
    const negativeAdjustment = await inventarioService.createSolicitudAjuste({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      id_solicitante: fixtures.id_usuario,
      cantidad_variacion: '-99.000',
      motivo: 'Integration-only negative request exceeding current stock.',
      estado: 'PRUEBA',
      fecha_solicitud: testDate
    }, { transaction });
    assert.equal(positiveAdjustment.cantidad_variacion, '2.500');
    assert.equal(negativeAdjustment.cantidad_variacion, '-99.000');
    await assertHttpError(
      () => inventarioService.createSolicitudAjuste({
        id_material: material.id_material,
        id_ubicacion: fixtures.id_origen,
        id_solicitante: fixtures.id_usuario,
        cantidad_variacion: '0.000',
        motivo: 'Invalid zero adjustment.',
        estado: 'PRUEBA',
        fecha_solicitud: testDate
      }, { transaction }),
      400,
      'INVALID_ADJUSTMENT_QUANTITY'
    );
    await assertHttpError(
      () => inventarioService.createSolicitudAjuste({
        id_material: 2147483647,
        id_ubicacion: fixtures.id_origen,
        id_solicitante: fixtures.id_usuario,
        cantidad_variacion: '1.000',
        motivo: 'Missing material adjustment.',
        estado: 'PRUEBA',
        fecha_solicitud: testDate
      }, { transaction }),
      404,
      'MATERIAL_NOT_FOUND'
    );
    await assertHttpError(
      () => inventarioService.createDecisionAjuste(positiveAdjustment.id_solicitud_ajuste, {
        id_administrador: fixtures.id_usuario,
        decision: 'PENDIENTE_REGLA',
        fecha_decision: testDate
      }, { transaction }),
      400,
      'INVALID_ADJUSTMENT_DECISION'
    );

    await assertHttpError(
      () => inventarioService.createValeEntrega(valeResult.vale.id_vale, {
        id_usuario_entrega: fixtures.id_usuario,
        fecha_entrega: testDate,
        detalles: [{
          id_detalle_vale: valeResult.detalles[0].id_detalle_vale,
          cantidad_entregada: '0.625'
        }]
      }, { transaction }),
      409,
      'DELIVERY_MUST_MATCH_REQUEST'
    );

    await assertHttpError(
      () => inventarioService.createApertura({
        id_material: material.id_material,
        id_ubicacion_destino: fixtures.id_origen,
        id_usuario: fixtures.id_usuario,
        cantidad: '1.000',
        fecha_movimiento: testDate,
        documento_apertura: openingDocument
      }, { transaction }),
      409,
      'DUPLICATE_OPENING_DOCUMENT'
    );

    for (const invalidQuantity of ['0', '-1', '0.0001', '100000000000.000']) {
      await assertHttpError(
        () => inventarioService.createApertura({
          id_material: material.id_material,
          id_ubicacion_destino: fixtures.id_origen,
          id_usuario: fixtures.id_usuario,
          cantidad: invalidQuantity,
          fecha_movimiento: testDate,
          documento_apertura: `IT-INVALID-${testToken}`
        }, { transaction }),
        400,
        'INVALID_QUANTITY'
      );
    }

    await assertHttpError(
      () => inventarioService.createApertura({
        id_material: 2147483647,
        id_ubicacion_destino: fixtures.id_origen,
        id_usuario: fixtures.id_usuario,
        cantidad: '1.000',
        fecha_movimiento: testDate,
        documento_apertura: `IT-MISSING-MATERIAL-${testToken}`
      }, { transaction }),
      404,
      'MATERIAL_NOT_FOUND'
    );
    await assertHttpError(
      () => inventarioService.createApertura({
        id_material: material.id_material,
        id_ubicacion_destino: fixtures.id_origen,
        id_usuario: 2147483647,
        cantidad: '1.000',
        fecha_movimiento: testDate,
        documento_apertura: `IT-MISSING-USER-${testToken}`
      }, { transaction }),
      404,
      'USER_NOT_FOUND'
    );
    await assertHttpError(
      () => inventarioService.createApertura({
        id_material: material.id_material,
        id_ubicacion_destino: 2147483647,
        id_usuario: fixtures.id_usuario,
        cantidad: '1.000',
        fecha_movimiento: testDate,
        documento_apertura: `IT-MISSING-LOCATION-${testToken}`
      }, { transaction }),
      404,
      'LOCATION_NOT_FOUND'
    );

    const delivery = await inventarioService.createValeEntrega(valeResult.vale.id_vale, {
      id_usuario_entrega: fixtures.id_usuario,
      fecha_entrega: testDate,
      detalles: [{
        id_detalle_vale: valeResult.detalles[0].id_detalle_vale,
        cantidad_entregada: '1.250'
      }]
    }, { transaction });
    assert.equal(delivery.movimientos.length, 1);
    await assertHttpError(
      () => inventarioService.createValeEntrega(valeResult.vale.id_vale, {
        id_usuario_entrega: fixtures.id_usuario,
        fecha_entrega: testDate,
        detalles: [{
          id_detalle_vale: valeResult.detalles[0].id_detalle_vale,
          cantidad_entregada: '1.250'
        }]
      }, { transaction }),
      409,
      'VOUCHER_ALREADY_DELIVERED'
    );
    const insufficientVale = await inventarioService.createValeSalida({
      codigo: insufficientValeCode,
      id_ubicacion: fixtures.id_origen,
      id_solicitante: fixtures.id_usuario,
      fecha_solicitud: testDate,
      motivo: 'Insufficient stock test.',
      estado: 'PRUEBA',
      detalles: [{ id_material: material.id_material, cantidad_solicitada: '20.000' }]
    }, { transaction });
    await assertHttpError(
      () => inventarioService.createValeEntrega(insufficientVale.vale.id_vale, {
        id_usuario_entrega: fixtures.id_usuario,
        fecha_entrega: testDate,
        detalles: [{
          id_detalle_vale: insufficientVale.detalles[0].id_detalle_vale,
          cantidad_entregada: '20.000'
        }]
      }, { transaction }),
      409,
      'INSUFFICIENT_STOCK'
    );

    const transferResult = await inventarioService.createTraslado({
      codigo: transferCode,
      id_origen: fixtures.id_origen,
      id_destino: fixtures.id_destino,
      id_solicitante: fixtures.id_usuario,
      fecha_solicitud: testDate,
      estado: 'PRUEBA',
      detalles: [{ id_material: material.id_material, cantidad_solicitada: '4.500' }]
    }, { transaction });
    const dispatch = await inventarioService.createDespachoTraslado(transferResult.traslado.id_traslado, {
      id_usuario: fixtures.id_usuario,
      fecha_despacho: testDate,
      detalles: [{
        id_detalle_traslado: transferResult.detalles[0].id_detalle_traslado,
        cantidad: '4.500'
      }]
    }, { transaction });
    assert.equal(dispatch.movimientos.length, 1);
    await assertHttpError(
      () => inventarioService.createDespachoTraslado(transferResult.traslado.id_traslado, {
        id_usuario: fixtures.id_usuario,
        fecha_despacho: testDate,
        detalles: [{
          id_detalle_traslado: transferResult.detalles[0].id_detalle_traslado,
          cantidad: '4.500'
        }]
      }, { transaction }),
      409,
      'TRANSFER_ALREADY_DISPATCHED'
    );
    const insufficientTransfer = await inventarioService.createTraslado({
      codigo: insufficientTransferCode,
      id_origen: fixtures.id_origen,
      id_destino: fixtures.id_destino,
      id_solicitante: fixtures.id_usuario,
      fecha_solicitud: testDate,
      estado: 'PRUEBA',
      detalles: [{ id_material: material.id_material, cantidad_solicitada: '20.000' }]
    }, { transaction });
    await assertHttpError(
      () => inventarioService.createDespachoTraslado(insufficientTransfer.traslado.id_traslado, {
        id_usuario: fixtures.id_usuario,
        fecha_despacho: testDate,
        detalles: [{
          id_detalle_traslado: insufficientTransfer.detalles[0].id_detalle_traslado,
          cantidad: '20.000'
        }]
      }, { transaction }),
      409,
      'INSUFFICIENT_STOCK'
    );
    const reception = await inventarioService.createRecepcionTraslado(dispatch.despacho.id_despacho, {
      id_usuario: fixtures.id_usuario,
      fecha_recepcion: testDate,
      detalles: [{
        id_detalle_despacho: dispatch.detalles[0].id_detalle_despacho,
        cantidad: '1.500'
      }]
    }, { transaction });
    assert.equal(reception.movimientos.length, 1);
    await assertHttpError(
      () => inventarioService.createRecepcionTraslado(dispatch.despacho.id_despacho, {
        id_usuario: fixtures.id_usuario,
        fecha_recepcion: testDate,
        detalles: [{
          id_detalle_despacho: dispatch.detalles[0].id_detalle_despacho,
          cantidad: '3.001'
        }]
      }, { transaction }),
      409,
      'RECEIPT_QUANTITY_EXCEEDED'
    );

    const originBalance = await inventarioService.getExistencia({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      transaction
    });
    const destinationBalance = await inventarioService.getExistencia({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_destino,
      transaction
    });

    assert.equal(originBalance.stock_disponible, '6.375');
    assert.equal(originBalance.cantidad_en_transito, '0.000');
    assert.equal(destinationBalance.stock_disponible, '1.500');
    assert.equal(destinationBalance.cantidad_en_transito, '3.000');

    const supplier = await Proveedor.create({
      nombre: 'Integration test supplier',
      identificacion: supplierIdentification,
      activo: true
    }, { transaction, logging: false });
    const purchase = await inventarioService.createOrdenCompra({
      codigo: orderCode,
      id_solicitante: fixtures.id_usuario,
      id_ubicacion_destino: fixtures.id_origen,
      fecha_creacion: testDate,
      detalles: [{
        id_material: material.id_material,
        cantidad: '4.500',
        precio_unitario: '10.00'
      }]
    }, { transaction });
    const order = purchase.orden;
    const version = purchase.version;
    const orderDetail = purchase.detalles[0];
    generatedIds.purchaseOrder = Number(order.id_orden);
    generatedIds.purchaseVersion = Number(version.id_version);
    generatedIds.purchaseRows.orders.push(Number(order.id_orden));
    generatedIds.purchaseRows.versions.push(Number(version.id_version));
    generatedIds.purchaseRows.versionDetails.push(...purchase.detalles.map(detail => Number(detail.id_detalle_version)));
    assert.equal(version.monto_total, '45.00');
    assert.equal(order.estado, 'PENDIENTE');
    assert.equal(version.estado, 'PENDIENTE');
    await assertHttpError(
      () => inventarioService.createOrdenCompra({
        codigo: orderCode,
        id_solicitante: fixtures.id_usuario,
        id_ubicacion_destino: fixtures.id_origen,
        fecha_creacion: testDate,
        detalles: [{
          id_material: material.id_material,
          cantidad: '4.500',
          precio_unitario: '10.00'
        }]
      }, { transaction }),
      409,
      'PURCHASE_ORDER_CODE_EXISTS'
    );
    await assertHttpError(
      () => inventarioService.createOrdenCompra({
        codigo: `ID-${testToken}`,
        id_solicitante: fixtures.id_usuario,
        id_ubicacion_destino: fixtures.id_origen,
        fecha_creacion: testDate,
        detalles: [
          { id_material: material.id_material, cantidad: '1.000', precio_unitario: '1.00' },
          { id_material: material.id_material, cantidad: '2.000', precio_unitario: '1.00' }
        ]
      }, { transaction }),
      400,
      'DUPLICATE_DETAIL'
    );

    const originalDetailCreate = DetalleVersionOrdenCompra.create;
    DetalleVersionOrdenCompra.create = async () => {
      throw new Error('Forced purchase detail write failure.');
    };
    try {
      await assert.rejects(
        () => inventarioService.createOrdenCompra({
          codigo: failedOrderCode,
          id_solicitante: fixtures.id_usuario,
          id_ubicacion_destino: fixtures.id_origen,
          fecha_creacion: testDate,
          detalles: [{
            id_material: material.id_material,
            cantidad: '1.000',
            precio_unitario: '1.00'
          }]
        }, { transaction }),
        /Forced purchase detail write failure/
      );
    } finally {
      DetalleVersionOrdenCompra.create = originalDetailCreate;
    }
    assert.equal(await OrdenCompra.findOne({ where: { codigo: failedOrderCode }, transaction }), null);

    await assertHttpError(
      () => inventarioService.createCotizacion(version.id_version, {
        id_proveedor: supplier.id_proveedor,
        fecha_cotizacion: testDate,
        detalles: [{
          id_material: material.id_material,
          cantidad: '4.499',
          precio_unitario: '10.00'
        }]
      }, { transaction }),
      409,
      'QUOTE_DETAILS_INCONSISTENT'
    );
    const quoteResult = await inventarioService.createCotizacion(version.id_version, {
      id_proveedor: supplier.id_proveedor,
      fecha_cotizacion: testDate,
      detalles: [{
        id_material: material.id_material,
        cantidad: '4.500',
        precio_unitario: '10.00'
      }]
    }, { transaction });
    const quote = quoteResult.cotizacion;
    generatedIds.purchaseQuote = Number(quote.id_cotizacion);
    generatedIds.purchaseRows.quotes.push(Number(quote.id_cotizacion));
    generatedIds.purchaseRows.quoteDetails.push(...quoteResult.detalles.map(detail => Number(detail.id_detalle_cotizacion)));
    assert.equal(quote.monto_total, '45.00');
    await assertHttpError(
      () => inventarioService.createCotizacion(version.id_version, {
        id_proveedor: supplier.id_proveedor,
        fecha_cotizacion: testDate,
        detalles: [{
          id_material: material.id_material,
          cantidad: '4.500',
          precio_unitario: '10.00'
        }]
      }, { transaction }),
      409,
      'PURCHASE_QUOTE_ALREADY_EXISTS'
    );

    const secondPurchase = await inventarioService.createOrdenCompra({
      codigo: secondOrderCode,
      id_solicitante: fixtures.id_usuario,
      id_ubicacion_destino: fixtures.id_origen,
      fecha_creacion: testDate,
      detalles: [{
        id_material: material.id_material,
        cantidad: '4.500',
        precio_unitario: '10.00'
      }]
    }, { transaction });
    const secondQuote = await inventarioService.createCotizacion(secondPurchase.version.id_version, {
      id_proveedor: supplier.id_proveedor,
      fecha_cotizacion: testDate,
      detalles: [{
        id_material: material.id_material,
        cantidad: '4.500',
        precio_unitario: '10.00'
      }]
    }, { transaction });
    generatedIds.secondPurchaseOrder = Number(secondPurchase.orden.id_orden);
    generatedIds.secondPurchaseVersion = Number(secondPurchase.version.id_version);
    generatedIds.secondPurchaseQuote = Number(secondQuote.cotizacion.id_cotizacion);
    generatedIds.purchaseRows.orders.push(Number(secondPurchase.orden.id_orden));
    generatedIds.purchaseRows.versions.push(Number(secondPurchase.version.id_version));
    generatedIds.purchaseRows.versionDetails.push(...secondPurchase.detalles.map(detail => Number(detail.id_detalle_version)));
    generatedIds.purchaseRows.quotes.push(Number(secondQuote.cotizacion.id_cotizacion));
    generatedIds.purchaseRows.quoteDetails.push(...secondQuote.detalles.map(detail => Number(detail.id_detalle_cotizacion)));
    await assertHttpError(
      () => inventarioService.selectCotizacion(version.id_version, secondQuote.cotizacion.id_cotizacion, { transaction }),
      404,
      'PURCHASE_QUOTE_NOT_FOUND'
    );

    const originalApprovalCreate = AprobacionCompra.create;
    AprobacionCompra.create = async () => {
      throw new Error('Forced approval request write failure.');
    };
    try {
      await assert.rejects(
        () => inventarioService.selectCotizacion(secondPurchase.version.id_version, secondQuote.cotizacion.id_cotizacion, { transaction }),
        /Forced approval request write failure/
      );
    } finally {
      AprobacionCompra.create = originalApprovalCreate;
    }
    assert.equal(secondPurchase.version.id_cotizacion_elegida, null);
    assert.equal(await AprobacionCompra.count({
      where: { id_version: secondPurchase.version.id_version },
      transaction,
      logging: false
    }), 0, 'failed approval request must roll back quote selection');

    const selection = await inventarioService.selectCotizacion(version.id_version, quote.id_cotizacion, { transaction });
    assert.equal(selection.version.id_cotizacion_elegida, quote.id_cotizacion);
    assert.equal(selection.aprobacion.estado, 'PENDIENTE');
    assert.equal(selection.aprobacion.nivel_requerido, 'Administrador');
    assert.equal(Number(selection.aprobacion.cotizaciones_requeridas), 1);
    assert.equal(selection.aprobacion.monto_evaluado, quote.monto_total);
    generatedIds.purchaseApproval = Number(selection.aprobacion.id_aprobacion);
    generatedIds.purchaseRows.approvals.push(Number(selection.aprobacion.id_aprobacion));

    await assertHttpError(
      () => inventarioService.createDecisionAprobacionCompra(secondPurchase.version.id_version, {
        id_usuario: fixtures.id_usuario_no_solicitante,
        decision: 'APROBADO'
      }, { transaction }),
      409,
      'PURCHASE_APPROVAL_NOT_REQUESTED'
    );
    await assertHttpError(
      () => inventarioService.createDecisionAprobacionCompra(version.id_version, {
        id_usuario: fixtures.id_usuario,
        decision: 'APROBADO'
      }, { transaction }),
      403,
      'PURCHASE_APPROVER_CANNOT_BE_REQUESTER'
    );
    await assertHttpError(
      () => inventarioService.createDecisionAprobacionCompra(version.id_version, {
        id_usuario: fixtures.id_usuario_no_solicitante,
        decision: 'APROBADO'
      }, { transaction }),
      403,
      'PURCHASE_APPROVER_ROLE_REQUIRED'
    );
    await assertHttpError(
      () => inventarioService.createDecisionAprobacionCompra(version.id_version, {
        id_usuario: fixtures.id_usuario_no_solicitante,
        decision: 'APROBADO '
      }, { transaction }),
      400,
      'INVALID_PURCHASE_DECISION'
    );
    const inactiveAdmin = await Usuario.findOne({
      include: [{
        model: Rol,
        as: 'roles',
        where: { nombre: 'Administrador' },
        through: { attributes: [] },
        required: true
      }],
      where: { activo: false },
      attributes: ['id_usuario'],
      transaction,
      logging: false
    });
    if (inactiveAdmin) {
      await assertHttpError(
        () => inventarioService.createDecisionAprobacionCompra(version.id_version, {
          id_usuario: Number(inactiveAdmin.id_usuario),
          decision: 'RECHAZADO'
        }, { transaction }),
        403,
        'PURCHASE_APPROVER_INACTIVE'
      );
    }
    const adminRole = await Rol.findOne({
      where: { nombre: 'Administrador' },
      attributes: ['id_rol'],
      transaction,
      logging: false
    });
    const duplicateDecision = await DecisionAprobacionCompra.create({
      id_aprobacion: selection.aprobacion.id_aprobacion,
      id_usuario: fixtures.id_usuario_no_solicitante,
      id_rol: adminRole.id_rol,
      decision: 'APROBADO',
      fecha_decision: testDate
    }, { transaction, logging: false });
    await assertHttpError(
      () => inventarioService.createDecisionAprobacionCompra(version.id_version, {
        id_usuario: fixtures.id_usuario_no_solicitante,
        decision: 'RECHAZADO'
      }, { transaction }),
      409,
      'PURCHASE_DECISION_ALREADY_RECORDED'
    );
    await duplicateDecision.destroy({ transaction, logging: false });
    assert.equal(await DecisionAprobacionCompra.count({
      where: { id_aprobacion: selection.aprobacion.id_aprobacion },
      transaction,
      logging: false
    }), 0, 'authorization failures and rejected duplicate attempts must not persist a decision');
    assert.equal(selection.aprobacion.estado, 'PENDIENTE');
    assert.equal(selection.version.estado, 'PENDIENTE');
    const pendingOrder = await OrdenCompra.findByPk(order.id_orden, { transaction, logging: false });
    assert.equal(pendingOrder.estado, 'PENDIENTE');
    await assertHttpError(
      () => inventarioService.createRecepcionCompra(order.id_orden, {
        id_version: version.id_version,
        id_usuario: fixtures.id_usuario,
        fecha_recepcion: testDate,
        estado: 'PRUEBA',
        detalles: [{
          id_detalle_version: orderDetail.id_detalle_version,
          cantidad_entregada: '0.500',
          cantidad_aceptada: '0.500',
          cantidad_rechazada: '0.000'
        }]
      }, { transaction }),
      409,
      'PURCHASE_APPROVAL_REQUIRED'
    );
    const purchaseBalance = await inventarioService.getExistencia({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      transaction
    });
    assert.equal(purchaseBalance.stock_disponible, '6.375');

    await assertHttpError(
      () => inventarioService.createRecepcionCompra(order.id_orden, {
        id_version: version.id_version,
        id_usuario: fixtures.id_usuario,
        fecha_recepcion: testDate,
        estado: 'PRUEBA',
        detalles: [{
          id_detalle_version: orderDetail.id_detalle_version,
          cantidad_entregada: '4.001',
          cantidad_aceptada: '4.001',
          cantidad_rechazada: '0.000'
        }]
      }, { transaction }),
      409,
      'PURCHASE_APPROVAL_REQUIRED'
    );
    await assertHttpError(
      () => inventarioService.createRecepcionCompra(order.id_orden, {
        id_version: version.id_version,
        id_usuario: fixtures.id_usuario,
        fecha_recepcion: testDate,
        estado: 'PRUEBA',
        detalles: [
          {
            id_detalle_version: orderDetail.id_detalle_version,
            cantidad_entregada: '1.000',
            cantidad_aceptada: '1.000',
            cantidad_rechazada: '0.000'
          },
          {
            id_detalle_version: orderDetail.id_detalle_version,
            cantidad_entregada: '1.000',
            cantidad_aceptada: '1.000',
            cantidad_rechazada: '0.000'
          }
        ]
      }, { transaction }),
      400,
      'DUPLICATE_DETAIL'
    );
    await assertHttpError(
      () => inventarioService.createRecepcionCompra(2147483647, {
        id_version: version.id_version,
        id_usuario: fixtures.id_usuario,
        fecha_recepcion: testDate,
        estado: 'PRUEBA',
        detalles: [{
          id_detalle_version: orderDetail.id_detalle_version,
          cantidad_entregada: '1.000',
          cantidad_aceptada: '1.000',
          cantidad_rechazada: '0.000'
        }]
      }, { transaction }),
      404,
      'PURCHASE_ORDER_VERSION_NOT_FOUND'
    );
    assert.equal(await RecepcionCompra.count({
      where: { id_version: version.id_version },
      transaction,
      logging: false
    }), 0, 'receipts without approval must not create headers or movements');
    assert.equal(await MovimientoInventario.count({
      where: { id_material: material.id_material, tipo: 'ENTRADA_COMPRA' },
      transaction,
      logging: false
    }), 0, 'a pending or unapproved purchase must not create inventory entries');

    const approvalResult = await inventarioService.createDecisionAprobacionCompra(version.id_version, {
      id_usuario: fixtures.id_usuario_aprobador,
      decision: 'APROBADO',
      motivo: 'Integration test administrator approval.'
    }, { transaction });
    generatedIds.purchaseDecision = Number(approvalResult.decision.id_decision_compra);
    generatedIds.purchaseRows.decisions.push(Number(approvalResult.decision.id_decision_compra));
    assert.equal(Number(approvalResult.decision.id_usuario), fixtures.id_usuario_aprobador);
    assert.equal(Number(approvalResult.decision.id_rol), 1);
    assert.equal(approvalResult.decision.decision, 'APROBADO');
    assert.equal(approvalResult.aprobacion.estado, 'APROBADA');
    assert.equal(approvalResult.version.estado, 'APROBADA');
    assert.equal(approvalResult.orden.estado, 'APROBADA');
    assert.equal(await DecisionAprobacionCompra.count({
      where: { id_aprobacion: selection.aprobacion.id_aprobacion },
      transaction,
      logging: false
    }), 1, 'a valid approval must create exactly one formal decision');
    await assertHttpError(
      () => inventarioService.createDecisionAprobacionCompra(version.id_version, {
        id_usuario: fixtures.id_usuario_aprobador,
        decision: 'RECHAZADO'
      }, { transaction }),
      409,
      'PURCHASE_NOT_PENDING'
    );
    assert.equal(await DecisionAprobacionCompra.count({
      where: { id_aprobacion: selection.aprobacion.id_aprobacion },
      transaction,
      logging: false
    }), 1, 'a second decision must not be persisted after the purchase is approved');

    await assertHttpError(
      () => inventarioService.createRecepcionCompra(order.id_orden, {
        id_version: version.id_version,
        id_usuario: fixtures.id_usuario,
        fecha_recepcion: testDate,
        estado: 'PRUEBA',
        detalles: [{
          id_detalle_version: orderDetail.id_detalle_version,
          cantidad_entregada: '4.501',
          cantidad_aceptada: '4.501',
          cantidad_rechazada: '0.000'
        }]
      }, { transaction }),
      409,
      'RECEIPT_QUANTITY_EXCEEDED'
    );
    assert.equal(await RecepcionCompra.count({
      where: { id_version: version.id_version },
      transaction,
      logging: false
    }), 0, 'an over-quantity receipt must not create a receipt');
    assert.equal(await MovimientoInventario.count({
      where: { id_material: material.id_material, tipo: 'ENTRADA_COMPRA' },
      transaction,
      logging: false
    }), 0, 'an over-quantity receipt must not create an inventory entry');

    const partialReceipt = await inventarioService.createRecepcionCompra(order.id_orden, {
      id_version: version.id_version,
      id_usuario: fixtures.id_usuario,
      fecha_recepcion: testDate,
      estado: 'PRUEBA',
      detalles: [{
        id_detalle_version: orderDetail.id_detalle_version,
        cantidad_entregada: '1.500',
        cantidad_aceptada: '1.500',
        cantidad_rechazada: '0.000'
      }]
    }, { transaction });
    generatedIds.partialReceipt = Number(partialReceipt.recepcion.id_recepcion_compra);
    generatedIds.purchaseRows.receipts.push(Number(partialReceipt.recepcion.id_recepcion_compra));
    generatedIds.purchaseRows.receiptDetails.push(...partialReceipt.detalles.map(detail => Number(detail.id_detalle_recepcion_compra)));
    generatedIds.purchaseRows.movements.push(...partialReceipt.movimientos.map(movement => Number(movement.id_movimiento)));
    assert.equal(partialReceipt.movimientos.length, 1);
    assert.equal(partialReceipt.movimientos[0].tipo, 'ENTRADA_COMPRA');
    assert.equal(partialReceipt.movimientos[0].cantidad, '1.500');
    let partiallyReceivedOrder = await OrdenCompra.findByPk(order.id_orden, { transaction, logging: false });
    let partiallyReceivedVersion = await VersionOrdenCompra.findByPk(version.id_version, { transaction, logging: false });
    assert.equal(partiallyReceivedOrder.estado, 'APROBADA');
    assert.equal(partiallyReceivedVersion.estado, 'APROBADA');
    const partialBalance = await inventarioService.getExistencia({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      transaction
    });
    assert.equal(partialBalance.stock_disponible, '7.875');
    assert.equal(await MovimientoInventario.count({
      where: { id_material: material.id_material, tipo: 'ENTRADA_COMPRA' },
      transaction,
      logging: false
    }), 1);

    const completeReceipt = await inventarioService.createRecepcionCompra(order.id_orden, {
      id_version: version.id_version,
      id_usuario: fixtures.id_usuario,
      fecha_recepcion: testDate,
      estado: 'PRUEBA',
      detalles: [{
        id_detalle_version: orderDetail.id_detalle_version,
        cantidad_entregada: '3.000',
        cantidad_aceptada: '3.000',
        cantidad_rechazada: '0.000'
      }]
    }, { transaction });
    generatedIds.completeReceipt = Number(completeReceipt.recepcion.id_recepcion_compra);
    generatedIds.purchaseRows.receipts.push(Number(completeReceipt.recepcion.id_recepcion_compra));
    generatedIds.purchaseRows.receiptDetails.push(...completeReceipt.detalles.map(detail => Number(detail.id_detalle_recepcion_compra)));
    generatedIds.purchaseRows.movements.push(...completeReceipt.movimientos.map(movement => Number(movement.id_movimiento)));
    assert.equal(completeReceipt.movimientos.length, 1);
    assert.equal(completeReceipt.movimientos[0].tipo, 'ENTRADA_COMPRA');
    assert.equal(completeReceipt.movimientos[0].cantidad, '3.000');
    const receivedOrder = await OrdenCompra.findByPk(order.id_orden, { transaction, logging: false });
    const receivedVersion = await VersionOrdenCompra.findByPk(version.id_version, { transaction, logging: false });
    assert.equal(receivedOrder.estado, 'RECIBIDA');
    assert.equal(receivedVersion.estado, 'RECIBIDA');
    const finalBalance = await inventarioService.getExistencia({
      id_material: material.id_material,
      id_ubicacion: fixtures.id_origen,
      transaction
    });
    assert.equal(finalBalance.stock_disponible, '10.875');
    assert.equal(await MovimientoInventario.count({
      where: { id_material: material.id_material, tipo: 'ENTRADA_COMPRA' },
      transaction,
      logging: false
    }), 2, 'accepted purchase quantities must create exactly two inventory entries');

    const purchaseHistory = await inventarioService.getMaterialHistory(material.id_material, { transaction });
    const purchaseMovements = purchaseHistory.filter(movement => movement.tipo === 'ENTRADA_COMPRA');
    assert.equal(purchaseMovements.length, 2);
    for (const movement of purchaseMovements) {
      assert.equal(Number(movement.id_ubicacion_destino), fixtures.id_origen);
      const trace = movement.get({ plain: true }).detalleRecepcionCompra
        .detalleVersionOrdenCompra.versionOrdenCompra;
      assert.equal(Number(trace.ordenCompra.id_orden), Number(order.id_orden));
      assert.equal(Number(trace.cotizacionElegida.id_cotizacion), Number(quote.id_cotizacion));
      assert.equal(Number(trace.cotizacionElegida.proveedor.id_proveedor), Number(supplier.id_proveedor));
    }

    const rejectionSelection = await inventarioService.selectCotizacion(
      secondPurchase.version.id_version,
      secondQuote.cotizacion.id_cotizacion,
      { transaction }
    );
    generatedIds.secondPurchaseApproval = Number(rejectionSelection.aprobacion.id_aprobacion);
    generatedIds.purchaseRows.approvals.push(Number(rejectionSelection.aprobacion.id_aprobacion));
    assert.equal(rejectionSelection.aprobacion.estado, 'PENDIENTE');
    const rejectionResult = await inventarioService.createDecisionAprobacionCompra(secondPurchase.version.id_version, {
      id_usuario: fixtures.id_usuario_aprobador,
      decision: 'RECHAZADO',
      motivo: 'Integration test rejection.'
    }, { transaction });
    generatedIds.rejectionDecision = Number(rejectionResult.decision.id_decision_compra);
    generatedIds.purchaseRows.decisions.push(Number(rejectionResult.decision.id_decision_compra));
    assert.equal(rejectionResult.decision.decision, 'RECHAZADO');
    assert.equal(rejectionResult.aprobacion.estado, 'RECHAZADA');
    assert.equal(rejectionResult.version.estado, 'RECHAZADA');
    assert.equal(rejectionResult.orden.estado, 'RECHAZADA');
    await assertHttpError(
      () => inventarioService.createRecepcionCompra(secondPurchase.orden.id_orden, {
        id_version: secondPurchase.version.id_version,
        id_usuario: fixtures.id_usuario,
        fecha_recepcion: testDate,
        estado: 'PRUEBA',
        detalles: [{
          id_detalle_version: secondPurchase.detalles[0].id_detalle_version,
          cantidad_entregada: '1.000',
          cantidad_aceptada: '1.000',
          cantidad_rechazada: '0.000'
        }]
      }, { transaction }),
      409,
      'PURCHASE_REJECTED'
    );
    assert.equal(await RecepcionCompra.count({
      where: { id_version: secondPurchase.version.id_version },
      transaction,
      logging: false
    }), 0, 'a rejected purchase must not create a receipt');
    assert.equal(await MovimientoInventario.count({
      where: { id_material: material.id_material, tipo: 'ENTRADA_COMPRA' },
      transaction,
      logging: false
    }), 2, 'a rejected purchase must not create an inventory entry');

    if (activePurchaseConfigurations === 0) {
      const createdConfig = await inventarioService.savePurchaseControl({
        dias_duplicado: 3,
        tolerancia_cantidad_porcentaje: '10.00',
        dias_fraccionamiento: 7,
        activo: true,
        id_usuario_actualiza: fixtures.id_usuario
      }, undefined, { transaction });
      generatedIds.purchaseConfiguration = createdConfig.configuracion.id_configuracion;
    }

    const [existingOriginParameters, existingDestinationParameters] = await Promise.all([
      ParametrosInventario.findOne({
        where: { id_material: material.id_material, id_ubicacion: fixtures.id_origen },
        transaction,
        logging: false
      }),
      ParametrosInventario.findOne({
        where: { id_material: material.id_material, id_ubicacion: fixtures.id_destino },
        transaction,
        logging: false
      })
    ]);
    assert.equal(existingOriginParameters, null);
    assert.equal(existingDestinationParameters, null);
    const parameterValues = {
      id_material: material.id_material,
      id_ubicacion: fixtures.id_destino,
      stock_minimo: '1.000',
      stock_maximo: '20.000',
      demanda_diaria_promedio: '2.000',
      demanda_diaria_maxima: '3.000',
      tiempo_reposicion_dias: 2,
      activo: true,
      id_usuario: fixtures.id_usuario,
      motivo: 'Integration-only reorder test.'
    };
    const savedParameters = await inventarioService.upsertInventoryParameters(parameterValues, undefined, { transaction });
    generatedIds.parameters = savedParameters.parametros.id_parametros;
    assert.equal(savedParameters.creado, true);

    const updatedParameters = await inventarioService.upsertInventoryParameters({
      ...parameterValues,
      demanda_diaria_promedio: '2.500',
      demanda_diaria_maxima: '4.000',
      motivo: 'Integration-only parameter update test.'
    }, savedParameters.parametros.id_parametros, { transaction });
    assert.equal(updatedParameters.creado, false);
    const historyCount = await db.HistorialParametrosInventario.count({
      where: { id_parametros: savedParameters.parametros.id_parametros },
      transaction
    });
    assert.equal(historyCount, 2);

    const configToUpdate = await ConfiguracionControlCompra.create({
      dias_duplicado: 3,
      tolerancia_cantidad_porcentaje: '10.00',
      dias_fraccionamiento: 7,
      activo: false,
      id_usuario_actualiza: fixtures.id_usuario,
      fecha_actualizacion: testDate
    }, { transaction, logging: false });
    generatedIds.updatedPurchaseConfiguration = configToUpdate.id_configuracion;
    const updatedConfig = await inventarioService.savePurchaseControl({
      dias_duplicado: 4,
      tolerancia_cantidad_porcentaje: '12.50',
      dias_fraccionamiento: 8,
      activo: false,
      id_usuario_actualiza: fixtures.id_usuario
    }, configToUpdate.id_configuracion, { transaction });
    assert.equal(updatedConfig.creado, false);
    assert.equal(Number(updatedConfig.configuracion.dias_duplicado), 4);

    const reorderAlerts = await inventarioService.listReorderAlerts({ transaction });
    const materialReorderAlerts = reorderAlerts.filter(alert =>
      Number(alert.id_material) === Number(material.id_material)
    );
    assert.equal(materialReorderAlerts.length, 1);
    assert.equal(Number(materialReorderAlerts[0].id_ubicacion), fixtures.id_destino);
    assert.equal(materialReorderAlerts[0].stock_seguridad, '3.000');
    assert.equal(materialReorderAlerts[0].punto_reorden, '8.000');

    if (activePurchaseConfigurations <= 1) {
      const duplicates = await inventarioService.findPurchaseDuplicates({
        id_proveedor: supplier.id_proveedor,
        id_material: material.id_material,
        cantidad: '4.500',
        fecha: testDate
      }, { transaction });
      const duplicateOrderCodes = duplicates.map(duplicate => duplicate.codigo_orden);
      assert.equal(duplicateOrderCodes.length, 2, `expected both temporary orders to be detected: ${JSON.stringify(duplicateOrderCodes)}`);
      assert(duplicateOrderCodes.includes(orderCode));
      assert(duplicateOrderCodes.includes(secondOrderCode));
      const noDuplicates = await inventarioService.findPurchaseDuplicates({
        id_proveedor: supplier.id_proveedor,
        id_material: material.id_material,
        cantidad: '0.001',
        fecha: testDate
      }, { transaction });
      assert.equal(noDuplicates.length, 0);
    } else {
      await assertHttpError(
        () => inventarioService.findPurchaseDuplicates({
          id_proveedor: supplier.id_proveedor,
          id_material: material.id_material,
          cantidad: '4.500',
          fecha: testDate
        }, { transaction }),
        409,
        'PURCHASE_CONTROL_CONFIG_UNAVAILABLE'
      );
    }

    const history = await inventarioService.getMaterialHistory(material.id_material, { transaction });
    assert.equal(
      history.filter(movement => movement.tipo === 'ENTRADA_COMPRA').length,
      2,
      'the completed approved purchase must have exactly two accepted-quantity inventory entries'
    );
  } catch (error) {
    testError = error;
  } finally {
    if (!transaction.finished) {
      await transaction.rollback();
    }
    rollbackSucceeded = transaction.finished === 'rollback';
  }

  assert.equal(rollbackSucceeded, true, 'integration transaction must be rolled back');
  await ensureNoTestRows();
  const purchaseRowModels = {
    orders: db.OrdenCompra,
    versions: db.VersionOrdenCompra,
    versionDetails: db.DetalleVersionOrdenCompra,
    quotes: db.Cotizacion,
    quoteDetails: db.DetalleCotizacion,
    approvals: db.AprobacionCompra,
    decisions: db.DecisionAprobacionCompra,
    receipts: db.RecepcionCompra,
    receiptDetails: db.DetalleRecepcionCompra,
    movements: db.MovimientoInventario
  };
  for (const [kind, ids] of Object.entries(generatedIds.purchaseRows)) {
    for (const id of ids) {
      assert.equal(await purchaseRowModels[kind].findByPk(id, { logging: false }), null, `${kind} row ${id} must be absent after rollback`);
    }
  }
  assert.equal(await db.UsuarioRol.count({
    where: { id_usuario: fixtures.id_usuario_aprobador, id_rol: 1 },
    logging: false
  }), 1, 'the authorized administrator assignment must remain unchanged');
  assert.equal(await db.UsuarioRol.count({
    where: { id_usuario: fixtures.id_usuario_aprobador, id_rol: 2 },
    logging: false
  }), 1, 'the approver must retain the warehouse role');
  for (const id_solicitud_ajuste of Object.values(adjustmentIds)) {
    if (id_solicitud_ajuste === null) continue;
    assert.equal(await SolicitudAjuste.findByPk(id_solicitud_ajuste, {
      attributes: ['id_solicitud_ajuste'],
      logging: false
    }), null, 'adjustment request fixture must not persist');
    assert.equal(await DecisionAjuste.count({
      where: { id_solicitud_ajuste },
      logging: false
    }), 0, 'adjustment decision fixture must not persist');
  }
  if (generatedIds.parameters !== null) {
    assert.equal(await ParametrosInventario.findByPk(generatedIds.parameters, { attributes: ['id_parametros'], logging: false }), null);
    assert.equal(await db.HistorialParametrosInventario.count({ where: { id_parametros: generatedIds.parameters }, logging: false }), 0);
  }
  if (generatedIds.purchaseConfiguration !== null) {
    assert.equal(await ConfiguracionControlCompra.findByPk(generatedIds.purchaseConfiguration, { attributes: ['id_configuracion'], logging: false }), null);
  }
  if (generatedIds.updatedPurchaseConfiguration !== null) {
    assert.equal(await ConfiguracionControlCompra.findByPk(generatedIds.updatedPurchaseConfiguration, { attributes: ['id_configuracion'], logging: false }), null);
  }
  if (testError) {
    throw testError;
  }

  await assert.rejects(
    sequelize.transaction(async failedTransaction => {
      const failedMaterial = await Material.create({
        codigo: failureMaterialCode,
        nombre: 'Failed transaction test material',
        unidad_medida: 'unidad',
        activo: true
      }, { transaction: failedTransaction, logging: false });
      await MovimientoInventario.create({
        id_material: failedMaterial.id_material,
        id_usuario: fixtures.id_usuario,
        tipo: 'UNSUPPORTED_TEST_TYPE',
        cantidad: '1.000',
        fecha_movimiento: testDate
      }, { transaction: failedTransaction, logging: false });

      await inventarioService.createApertura({
        id_material: failedMaterial.id_material,
        id_ubicacion_destino: fixtures.id_origen,
        id_usuario: fixtures.id_usuario,
        cantidad: '2.000',
        fecha_movimiento: testDate,
        documento_apertura: failureOpeningDocument
      }, { transaction: failedTransaction });
    }),
    error => error.status === 501 && error.code === 'INVENTORY_MOVEMENT_TYPE_UNSUPPORTED'
  );
  await ensureNoTestRows();
  console.log('Inventory integration passed; all test rows were rolled back and verified absent.');
}

run()
  .catch(error => {
    const databaseError = error.parent || error.original;
    const details = {
      name: error.name || 'Error',
      code: databaseError && databaseError.code
        ? databaseError.code
        : error.code || 'UNKNOWN',
      sqlState: databaseError && databaseError.sqlState
        ? databaseError.sqlState
        : undefined,
      message: databaseError && databaseError.sqlMessage
        ? databaseError.sqlMessage
        : error.message
    };
    console.error('Inventory integration failed:', JSON.stringify(details));
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
