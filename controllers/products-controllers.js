const fs = require('fs');

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');


const HttpError = require('../models/http-error');
const Product = require('../models/product');
const Manufacturer = require('../models/manufacturer');
const Trader = require('../models/trader');
const product = require('../models/product');

const getProductById = async (req, res, next) => {
  const productId = req.params.pid;

  let product;
  try {
    product = await Product.findById(productId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a Product.',
      500
    );
    return next(error);
  }

  if (!product) {
    const error = new HttpError(
      'Could not find Product for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ product: product.toObject({ getters: true }) });
};

const getProductsByManufacturerId = async (req, res, next) => {
  const manufacturerId = req.query.uid;
  let manufacturerWithProducts;
  let totalProducts;
  let page = req.query.page;
  let size = req.query.size;
  try {
    if (!page) page = 1;
    if (!size) size = 10;
    const limit = parseInt(size);
    const skip = (parseInt(page) - 1) * size;
    totalProducts = await Manufacturer.findOne({user: manufacturerId}).populate('products').exec();
    manufacturerWithProducts = await Manufacturer.findOne({user: manufacturerId}).populate({
      path:'products',
      options: {
          limit: limit,
          sort: { title: 1},
          skip: skip
  
      }
  });
    
  } catch (err) {
    const error = new HttpError(
      'Fetching Products failed, please try again later.',
      500
    );
    return next(error);
  }
  if (!manufacturerWithProducts || manufacturerWithProducts.products.length === 0) {
    res.json({
      products: [],
      message: "Could not find products for the provided manufacturer id"
    })
    return
  }
    return res.status(200).json({
        products: manufacturerWithProducts && manufacturerWithProducts.products.map((product, index) =>
          ({
            ...product.toObject({ getters: true, }),
            serialNo : (parseInt(page) - 1)*10 + index + 1,
            
          }),
        ),
        size: size,
        message: "success",
        total: totalProducts.products.length,
      });
};

const getProductsByTraderId = async (req, res, next) => {
  const traderId = req.params.uid;

  // let Manufacturers;
  let traderWithProducts;
  try {
    traderWithProducts = await Trader.findById(traderId).populate('products');
  } catch (err) {
    const error = new HttpError(
      'Fetching Manufacturers failed, please try again later.',
      500
    );
    return next(error);
  }

  // if (!Manufacturers || Manufacturers.length === 0) {
  if (!traderWithProducts || traderWithProducts.products.length === 0) {
    res.json({
      products: [],
      message: "Could not find products for the provided trader id"
    })
    return
  }

  res.json({
    products: traderWithProducts.products.map(product =>
      product.toObject({ getters: true }),
    ),
    message: "success"
  });
};


const createProduct = async (req, res, next) => {
  
 
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { 
          folder,
          title,
          description,
          price,
          impurities,
          refStandards,
          pharmacopoeias,
          traders,
          dmf 
        } = req.body;

  

  const createdProduct = new Product({
    folder,
    title,
    description,
    price,
    image: req && req.files && req.files.image && req.files.image[0] && req.files.image[0].path.replace(/\\/g,"/") || "",
    coa: req && req.files && req.files.coa && req.files.coa[0].path.replace(/\\/g,"/") || "",
    msds: req && req.files && req.files.msds && req.files.msds[0].path.replace(/\\/g,"/") || "",
    cep: req && req.files && req.files.cep && req.files.cep[0].path.replace(/\\/g,"/") || "",
    qos: req && req.files && req.files.qos && req.files.qos[0].path.replace(/\\/g,"/") || "",
    dmf,
    impurities,
    refStandards,
    pharmacopoeias,
    manufacturer: req.userData.userId,
    traders
  });

  let manufacturer;
  try {
    manufacturer = await Manufacturer.findOne({user: req.userData.userId})
  } catch (err) {
    const error = new HttpError(
      'Creating Product failed, please try again.',
      500
    );
    return next(error);
  }

  if (!manufacturer) {
    const error = new HttpError('Could not find manufacturer for provided id.', 404);
    return next(error);
  }


  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdProduct.save({ session: sess });
    manufacturer.products.push(createdProduct);
    await manufacturer.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Creating Product failed, please try again.',
      500
    );
    return next(error);
  }

  res.status(201).json({ product: createdProduct });
};

const updateProduct = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { 
    title,
    description,
    price,
    image,
    coa,
    msds,
    cep,
    qos,
    impurities,
    refStandards,
    dmf,
    pharmacopoeias,
    traders 
  } = req.body;
  const productId = req.params.pid;

  let product;
  try {
    product = await Product.findById(productId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update Product.',
      500
    );
    return next(error);
  }

  if (product.manufacturer.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this Product.', 401);
    return next(error);
  }

  product.title = title;
  product.description = description;
  product.price = price;
  product.image = image;
  product.coa = coa;
  product.msds = msds;
  product.cep = cep;
  product.qos = qos;
  product.impurities = impurities;
  product.refStandards = refStandards;
  product.dmf = dmf;
  product.pharmacopoeias = pharmacopoeias;
  product.traders = traders;
 
  try {
    await product.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update Product.',
      500
    );
    return next(error);
  }

  res.status(200).json({ product: product.toObject({ getters: true }) });
};

const deleteProduct = async (req, res, next) => {
  const productId = req.params.pid;

  let product;
  try {
    product = await Product.findById(productId).populate('manufacturers');
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete Product.',
      500
    );
    return next(error);
  }

  if (!product) {
    const error = new HttpError('Could not find Product for this id.', 404);
    return next(error);
  }

  if (product.manufacturer.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this Product.',
      401
    );
    return next(error);
  }

  const imagePath = product.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await product.remove({ session: sess });
    product.manufacturer.products.pull(product);
    await product.manufacturer.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete Product.',
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, err => {
    console.log(err);
  });

  res.status(200).json({ message: 'Deleted Product.' });
};

exports.getProductById = getProductById;
exports.getProductsByManufacturerId = getProductsByManufacturerId;
exports.getProductsByTraderId = getProductsByTraderId;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
