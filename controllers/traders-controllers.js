const fs = require('fs');

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');


const HttpError = require('../models/http-error');
const Trader = require('../models/trader');
const Manufacturer = require('../models/manufacturer');

const getTraderById = async (req, res, next) => {
  const traderId = req.params.pid;

  let trader;
  try {
    trader = await Trader.findById(traderId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a Trader.',
      500
    );
    return next(error);
  }

  if (!trader) {
    const error = new HttpError(
      'Could not find Trader for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ trader: trader.toObject({ getters: true }) });
};

const getTradersByManufacturerId = async (req, res, next) => {
  const manufacturerId = req.params.uid;

  // let Manufacturers;
  let manufacturerWithTraders;
  try {
    manufacturerWithTraders = await Manufacturer.findById(manufacturerId).populate('traders');
  } catch (err) {
    const error = new HttpError(
      'Fetching Traders failed, please try again later.',
      500
    );
    return next(error);
  }

  // if (!Manufacturers || Manufacturers.length === 0) {
  if (!manufacturerWithTraders || manufacturerWithTraders.traders.length === 0) {
    res.json({
      products: [],
      message: "Could not find traders for the provided manufacturer id"
    })
    return
  }

  res.json({
    traders: manufacturerWithTraders.traders.map(trader =>
      trader.toObject({ getters: true })
    ),
    message:"success"
  });
};

const createTrader = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, email, address, products } = req.body;

  

  const createdTrader = new Trader({
    title,
    email,
    image: req.file.path,
    address,
    manufacturer: req.userData.userId,
    products,
  });

  let manufacturer;
  try {
    manufacturer = await Manufacturer.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      'Creating Trader failed, please try again.',
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
    await createdTrader.save({ session: sess });
    manufacturer.traders.push(createdTrader);
    await manufacturer.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Creating Trader failed, please try again.',
      500
    );
    return next(error);
  }

  res.status(201).json({ trader: createdTrader });
};

const updateTrader = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, email, address, products } = req.body;
  const traderId = req.params.pid;

  let trader;
  try {
    trader = await Trader.findById(traderId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update Trader.',
      500
    );
    return next(error);
  }

  if (trader.manufacturer.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this Trader.', 401);
    return next(error);
  }

  trader.title = title;
  trader.email = email;
  trader.address = address;
  trader.products = products;

  try {
    await trader.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update Trader.',
      500
    );
    return next(error);
  }

  res.status(200).json({ trader: trader.toObject({ getters: true }) });
};

const deleteTrader = async (req, res, next) => {
  const traderId = req.params.pid;

  let trader;
  try {
    trader = await Trader.findById(traderId).populate('manufacturers');
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete Trader.',
      500
    );
    return next(error);
  }

  if (!trader) {
    const error = new HttpError('Could not find Trader for this id.', 404);
    return next(error);
  }

  if (trader.manufacturer.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this Trader.',
      401
    );
    return next(error);
  }

  const imagePath = trader.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await trader.remove({ session: sess });
    trader.manufacturer.traders.pull(trader);
    await trader.manufacturer.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete Trader.',
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, err => {
    console.log(err);
  });

  res.status(200).json({ message: 'Deleted Trader.' });
};

exports.getTraderById = getTraderById;
exports.getTradersByManufacturerId = getTradersByManufacturerId;
exports.createTrader = createTrader;
exports.updateTrader = updateTrader;
exports.deleteTrader = deleteTrader;
