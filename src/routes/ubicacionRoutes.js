'use strict';

const express = require('express');
const ubicacionController = require('../controllers/ubicacionController');

const router = express.Router();

router.get('/', ubicacionController.list);
router.get('/:id', ubicacionController.get);

module.exports = router;
