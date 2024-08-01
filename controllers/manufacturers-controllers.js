const fs = require('fs');

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');


const HttpError = require('../models/http-error');
const Manufacturer = require('../models/manufacturer');
const User = require('../models/user');

const getManufacturerById = async (req, res, next) => {
  const manufacturerId = req.params.pid;
  let manufacturer;
  try {
    manufacturer = await Manufacturer.findById(manufacturerId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a Manufacturer.',
      500
    );
    return next(error);
  }

  if (!manufacturer) {
    const error = new HttpError(
      'Could not find Manufacturer for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ manufacturer: manufacturer.toObject({ getters: true }) });
};

const getManufacturersByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // let Manufacturers;
  let userWithManufacturers;
  try {
    userWithManufacturers = await User.findById(userId).populate('manufacturers');
  } catch (err) {
    const error = new HttpError(
      'Fetching Manufacturers failed, please try again later.',
      500
    );
    return next(error);
  }

  // if (!Manufacturers || Manufacturers.length === 0) {
  if (!userWithManufacturers || userWithManufacturers.manufacturers.length === 0) {
    res.json({
      products: [],
      message: "Could not find manufacturers for the provided admin id"
    })
    return
  }
  res.json({
    manufacturers: userWithManufacturers.manufacturers.map(manufacturer =>
      manufacturer.toObject({ getters: true  })
    ),
    message:"success"
  });
};

const createManufacturer = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description, address, image, traders, products, user } = req.body;

  

  const createdManufacturer = new Manufacturer({
    title,
    description,
    address,
    image,
    user,
    traders,
    products: []
  });

  let admin;
  try {
    admin = await User.findById("66a380fae638323838dd5286");
  } catch (err) {
    const error = new HttpError(
      'Creating Manufacturer failed, please try again.',
      500
    );
    return next(error);
  }

  if (!admin) {
    const error = new HttpError('Could not find admin for provided id.', 404);
    return next(error);
  }

  

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdManufacturer.save({ session: sess });
    admin.manufacturers.push(createdManufacturer);
    await admin.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Creating Manufacturer failed, please try again.',
      500
    );
    return next(error);
  }

  res.status(201).json({ manufacturer: createdManufacturer });
};

const updateManufacturer = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description, address, traders, products } = req.body;
  const manufacturerId = req.params.pid;

  let manufacturer;
  try {
    manufacturer = await Manufacturer.findById(manufacturerId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update Manufacturer.',
      500
    );
    return next(error);
  }

  if (manufacturer.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this Manufacturer.', 401);
    return next(error);
  }

  manufacturer.title = title;
  manufacturer.description = description;
  manufacturer.address = address;
  manufacturer.traders = traders;
  manufacturer.products = products;

  try {
    await manufacturer.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update Manufacturer.',
      500
    );
    return next(error);
  }

  res.status(200).json({ manufacturer: manufacturer.toObject({ getters: true }) });
};

const deleteManufacturer = async (req, res, next) => {
  const manufacturerId = req.params.pid;

  let manufacturer;
  try {
    manufacturer = await Manufacturer.findById(manufacturerId).populate('users');
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete Manufacturer.',
      500
    );
    return next(error);
  }

  if (!manufacturer) {
    const error = new HttpError('Could not find Manufacturer for this id.', 404);
    return next(error);
  }

  if (manufacturer.creator.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this Manufacturer.',
      401
    );
    return next(error);
  }

  const imagePath = manufacturer.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await manufacturer.remove({ session: sess });
    manufacturer.user.manufacturers.pull(manufacturer);
    await manufacturer.user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete Manufacturer.',
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, err => {
    console.log(err);
  });

  res.status(200).json({ message: 'Deleted Manufacturer.' });
};

exports.getManufacturerById = getManufacturerById;
exports.getManufacturersByUserId = getManufacturersByUserId;
exports.createManufacturer = createManufacturer;
exports.updateManufacturer = updateManufacturer;
exports.deleteManufacturer = deleteManufacturer;
