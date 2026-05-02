"use strict";Object.defineProperty(exports, "__esModule", {value: true});var _express = require('express');
var _jobcontroller = require('../controllers/job.controller');
var _protect = require('../middleware/protect');

const router = _express.Router.call(void 0, );

router.use(_protect.protect);

router.get("/", _jobcontroller.listJobs);
router.post("/", _jobcontroller.createJob);
router.patch("/:id", _jobcontroller.updateJob);
router.get("/score/:resumeId", _jobcontroller.getResumeScore);
router.get("/skill-gap/:resumeId/:jobId", _jobcontroller.getSkillGap);
router.get("/match/:resumeId/:jobId", _jobcontroller.matchJob);

exports. default = router;
