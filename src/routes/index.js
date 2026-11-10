'use strict';

const express = require('express');
const { sequelize } = require('../../models');
const materialRoutes = require('./materialRoutes');
const proveedorRoutes = require('./proveedorRoutes');
const ubicacionRoutes = require('./ubicacionRoutes');
const usuarioRoutes = require('./usuarioRoutes');
const rolRoutes = require('./rolRoutes');
const inventarioRoutes = require('./inventarioRoutes');

const router = express.Router();

router.use('/materiales', materialRoutes);
router.use('/proveedores', proveedorRoutes);
router.use('/ubicaciones', ubicacionRoutes);
router.use('/usuarios', usuarioRoutes);
router.use('/roles', rolRoutes);
router.use('/inventario', inventarioRoutes);

router.get('/health', async (req, res, next) => {
  try {
    await sequelize.authenticate();
    res.status(200).json({
      status: 'ok',
      database: 'connected'
    });
  } catch (error) {
    error.status = 503;
    error.code = 'DATABASE_UNAVAILABLE';
    next(error);
  }
});

module.exports = router;
