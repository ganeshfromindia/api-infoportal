const express = require('express');

const downloadsController = require('../controllers/downloads-controllers');

const router = express.Router();

router.get('/', downloadsController.getDownloadByFile);


module.exports = router;
