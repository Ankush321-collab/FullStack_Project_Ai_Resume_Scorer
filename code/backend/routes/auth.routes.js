"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _express = require('express');
var _authcontroller = require('../controllers/auth.controller');
var _auth = require('../middleware/auth');

const router = _express.Router.call(void 0, );

// Wrap the authMiddleware to work with Express router
const protect = async (req, res, next) => {
  try {
    const user = await _auth.authMiddleware.call(void 0, req);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
};

router.post("/signup", _authcontroller.signUp);
router.post("/signin", _authcontroller.signIn);
router.get("/me", protect, _authcontroller.me);

exports. default = router;
