const express = require('express');
const { check } = require('express-validator');

const manufacturerController = require('../controllers/manufacturers-controllers');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.get('/:pid', manufacturerController.getManufacturerById);

router.get('/user/:uid', manufacturerController.getManufacturersByUserId);

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
  manufacturerController.createManufacturer
);

router.patch(
  '/:pid',
  [
    check('title')
      .not()
      .isEmpty(),
    check('description').isLength({ min: 5 })
  ],
  manufacturerController.updateManufacturer
);

router.delete('/:pid', manufacturerController.deleteManufacturer);

module.exports = router;
