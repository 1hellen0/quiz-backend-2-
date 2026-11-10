'use strict';

const express = require('express');
const rolController = require('../controllers/rolController');

const router = express.Router();

router.get('/', rolController.list);
router.get('/:id', rolController.get);

module.exports = router;
