const express = require('express');
const { check } = require('express-validator');

const traderContollers = require('../controllers/traders-controllers');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.get('/:pid', traderContollers.getTraderById);

router.get('/user/:uid', traderContollers.getTradersByManufacturerId);

router.use(checkAuth);

router.post(
  '/create',
  fileUpload.single('image'),
  [
    check('title')
      .not()
      .isEmpty(),
    check('description').isLength({ min: 5 }),
    check('address')
      .not()
      .isEmpty()
  ],
  traderContollers.createTrader
);

router.patch(
  '/:pid',
  [
    check('title')
      .not()
      .isEmpty(),
    check('description').isLength({ min: 5 })
  ],
  traderContollers.updateTrader
);

router.delete('/:pid', traderContollers.deleteTrader);

module.exports = router;
