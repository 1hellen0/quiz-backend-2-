'use strict';

const express = require('express');
const materialController = require('../controllers/materialController');

const router = express.Router();

router.post('/', materialController.create);
router.get('/', materialController.list);
router.get('/:id', materialController.get);
router.put('/:id', materialController.update);
router.delete('/:id', materialController.remove);

module.exports = router;
