'use strict';

const express = require('express');
const proveedorController = require('../controllers/proveedorController');

const router = express.Router();

router.post('/', proveedorController.create);
router.get('/', proveedorController.list);
router.get('/:id', proveedorController.get);
router.put('/:id', proveedorController.update);
router.delete('/:id', proveedorController.remove);

module.exports = router;
