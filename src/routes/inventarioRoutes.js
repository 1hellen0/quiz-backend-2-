'use strict';

const express = require('express');
const inventarioController = require('../controllers/inventarioController');

const router = express.Router();

router.get('/movimientos', inventarioController.listMovimientos);
router.get('/movimientos/:id', inventarioController.getMovimiento);
router.get('/existencias', inventarioController.getExistencia);
router.get('/materiales/:id/historial', inventarioController.getMaterialHistory);
router.get('/reorden/alertas', inventarioController.listReorderAlerts);
router.get('/compras/posibles-duplicados', inventarioController.findPurchaseDuplicates);
router.post('/parametros-inventario', inventarioController.saveInventoryParameters);
router.put('/parametros-inventario/:id', inventarioController.saveInventoryParameters);
router.post('/configuracion-control-compras', inventarioController.savePurchaseControl);
router.put('/configuracion-control-compras/:id', inventarioController.savePurchaseControl);
router.post('/aperturas', inventarioController.createApertura);
router.post('/ordenes-compra', inventarioController.createOrdenCompra);
router.post('/versiones-orden-compra/:id/cotizaciones', inventarioController.createCotizacion);
router.put('/versiones-orden-compra/:id/cotizacion-elegida', inventarioController.selectCotizacion);
router.post('/versiones-orden-compra/:id/decisiones-aprobacion', inventarioController.createDecisionAprobacionCompra);
router.post('/vales', inventarioController.createValeSalida);
router.post('/vales/:id/entregas', inventarioController.createValeEntrega);
router.post('/traslados', inventarioController.createTraslado);
router.post('/traslados/:id/despachos', inventarioController.createDespachoTraslado);
router.post('/despachos/:id/recepciones', inventarioController.createRecepcionTraslado);
router.post('/ordenes-compra/:id/recepciones', inventarioController.createRecepcionCompra);
router.post('/ajustes/solicitudes', inventarioController.createSolicitudAjuste);
router.post('/ajustes/solicitudes/:id/decisiones', inventarioController.createDecisionAjuste);

module.exports = router;
