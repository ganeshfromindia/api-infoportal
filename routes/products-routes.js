const express = require('express');
const { check } = require('express-validator');

const productContoller = require('../controllers/products-controllers');
const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth');

const router = express.Router();

router.get('/:pid', productContoller.getProductById);

router.get('/manufacturer/id', productContoller.getProductsByManufacturerId);
router.get('/trader/:uid', productContoller.getProductsByTraderId);

router.use(checkAuth);

router.post(
  '/create',
  fileUpload.fields([{
      name: 'image', maxCount: 1
    },{
      name: 'coa', maxCount: 1
    }, 
    {
      name: 'msds', maxCount: 1
    },
    {
      name: 'cep', maxCount: 1
    },
    {
      name: 'qos', maxCount: 1
    }]),
  [
   
    check('description').isLength({ min: 5 }),
    check('title')
      .not()
      .isEmpty()
  ],
  productContoller.createProduct
);

router.patch(
  '/:pid',
  [
    check('title')
      .not()
      .isEmpty(),
    check('description').isLength({ min: 5 })
  ],
  productContoller.updateProduct
);

router.delete('/:pid', productContoller.deleteProduct);

module.exports = router;
