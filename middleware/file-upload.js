const path = require('path')
const multer = require('multer');
const mkdirp = require('mkdirp');
const uuid = require('uuid/v1');

const fs =  require("fs");

const MIME_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'application/pdf': 'pdf'
};

const fileUpload = multer({
  limits: 500000,
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const folder = req.body.folder || 'miscellaneous';
      const finalpath = `uploads/documents/${folder}/${file.fieldname}`
      mkdirp.sync(finalpath)
      cb(null, finalpath);
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype];
      // cb(null, uuid() + '.' + ext);
      cb(null, file.fieldname + '.' + ext);
    }
  }),
  fileFilter: (req, file, cb) => {
    const isValid = !!MIME_TYPE_MAP[file.mimetype];
    let error = isValid ? null : new Error('Invalid mime type!');
    cb(error, isValid);
  }
});

module.exports = fileUpload;
