"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _express = require('express');
var _analyticscontroller = require('../controllers/analytics.controller');
var _protect = require('../middleware/protect');

const router = _express.Router.call(void 0, );

router.use(_protect.protect);

router.get("/overview", _analyticscontroller.getAnalyticsOverview);

exports. default = router;
