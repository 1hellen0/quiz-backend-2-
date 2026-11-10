'use strict';

const express = require('express');
const usuarioController = require('../controllers/usuarioController');

const router = express.Router();

router.post('/', usuarioController.create);
router.get('/', usuarioController.list);
router.get('/:id', usuarioController.get);
router.put('/:id', usuarioController.update);
router.delete('/:id', usuarioController.remove);

module.exports = router;
