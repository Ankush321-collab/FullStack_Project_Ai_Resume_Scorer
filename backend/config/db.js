"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; } function _createStarExport(obj) { Object.keys(obj) .filter((key) => key !== "default" && key !== "__esModule") .forEach((key) => { if (exports.hasOwnProperty(key)) { return; } Object.defineProperty(exports, key, {enumerable: true, configurable: true, get: () => obj[key]}); }); }var _mongoose = require('mongoose'); var _mongoose2 = _interopRequireDefault(_mongoose);

const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/resume-analyser';

let cached = (global ).mongoose;

if (!cached) {
  cached = (global ).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = _mongoose2.default.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

exports.connectDB = connectDB; exports.mongoose = _mongoose2.default;
var _index = require('../models/index'); _createStarExport(_index);
