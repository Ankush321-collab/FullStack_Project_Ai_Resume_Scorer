"use strict";Object.defineProperty(exports, "__esModule", {value: true});
var _auth = require('./auth');

 const protect = async (req, res, next) => {
  try {
    const user = await _auth.authMiddleware.call(void 0, req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing token" });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}; exports.protect = protect;
