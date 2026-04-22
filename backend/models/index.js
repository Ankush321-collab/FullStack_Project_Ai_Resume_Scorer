"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _mongoose = require('mongoose'); var _mongoose2 = _interopRequireDefault(_mongoose);

// Enums
 exports.ResumeStatus; (function (ResumeStatus) {
  const UPLOADED = 'UPLOADED'; ResumeStatus["UPLOADED"] = UPLOADED;
  const PARSING = 'PARSING'; ResumeStatus["PARSING"] = PARSING;
  const PARSED = 'PARSED'; ResumeStatus["PARSED"] = PARSED;
  const EMBEDDING = 'EMBEDDING'; ResumeStatus["EMBEDDING"] = EMBEDDING;
  const EMBEDDED = 'EMBEDDED'; ResumeStatus["EMBEDDED"] = EMBEDDED;
  const SKILL_EXTRACTED = 'SKILL_EXTRACTED'; ResumeStatus["SKILL_EXTRACTED"] = SKILL_EXTRACTED;
  const COMPLETED = 'COMPLETED'; ResumeStatus["COMPLETED"] = COMPLETED;
  const FAILED = 'FAILED'; ResumeStatus["FAILED"] = FAILED;
})(exports.ResumeStatus || (exports.ResumeStatus = {}));

// User Schema









const UserSchema = new (0, _mongoose.Schema)({
  email: { type: String, required: true, unique: true },
  name: String,
  password: { type: String, required: true },
  avatarUrl: String,
}, { timestamps: true });

// Skill Schema





const SkillSchema = new (0, _mongoose.Schema)({
  name: { type: String, required: true, unique: true },
  category: String,
});

// Resume Schema













const ResumeSchema = new (0, _mongoose.Schema)({
  userId: { type: _mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  parsedText: String,
  resumeVector: [Number],
  feedback: String,
  improvedResumeUrl: String,
  improvedResumeName: String,
  status: { type: String, enum: Object.values(exports.ResumeStatus), default: exports.ResumeStatus.UPLOADED },
  skills: [{ type: _mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
}, { timestamps: true });

// Job Schema










const JobSchema = new (0, _mongoose.Schema)({
  title: { type: String, required: true },
  company: String,
  description: { type: String, required: true },
  jobVector: [Number],
  skills: [{ type: _mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
}, { timestamps: true });

// MatchResult Schema










const MatchResultSchema = new (0, _mongoose.Schema)({
  resumeId: { type: _mongoose.Schema.Types.ObjectId, ref: 'Resume', required: true },
  jobId: { type: _mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  score: { type: Number, required: true },
  matchPercentage: { type: Number, required: true },
  skillGap: [String],
  confidence: { type: Number, default: 0 },
  basis: String,
}, { timestamps: true });

// Ensure unique index for MatchResult
MatchResultSchema.index({ resumeId: 1, jobId: 1 }, { unique: true });

// Models
 const User = _mongoose2.default.model('User', UserSchema); exports.User = User;
 const Skill = _mongoose2.default.model('Skill', SkillSchema); exports.Skill = Skill;
 const Resume = _mongoose2.default.model('Resume', ResumeSchema); exports.Resume = Resume;
 const Job = _mongoose2.default.model('Job', JobSchema); exports.Job = Job;
 const MatchResult = _mongoose2.default.model('MatchResult', MatchResultSchema); exports.MatchResult = MatchResult;
