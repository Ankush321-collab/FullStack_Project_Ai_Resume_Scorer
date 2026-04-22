import mongoose, { Schema, Document, Model } from 'mongoose';

// Enums
export enum ResumeStatus {
  UPLOADED = 'UPLOADED',
  PARSING = 'PARSING',
  PARSED = 'PARSED',
  EMBEDDING = 'EMBEDDING',
  EMBEDDED = 'EMBEDDED',
  SKILL_EXTRACTED = 'SKILL_EXTRACTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// User Schema
export interface IUser extends Document {
  email: string;
  name?: string;
  password?: string;
  avatarUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: String,
  password: { type: String, required: true },
  avatarUrl: String,
}, { timestamps: true });

// Skill Schema
export interface ISkill extends Document {
  name: string;
  category?: string;
}

const SkillSchema = new Schema<ISkill>({
  name: { type: String, required: true, unique: true },
  category: String,
});

// Resume Schema
export interface IResume extends Document {
  userId: mongoose.Types.ObjectId;
  fileUrl: string;
  fileName: string;
  parsedText?: string;
  resumeVector?: number[];
  feedback?: string;
  status: ResumeStatus;
  skills: mongoose.Types.ObjectId[]; // References to Skill
  createdAt: Date;
  updatedAt: Date;
}

const ResumeSchema = new Schema<IResume>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  parsedText: String,
  resumeVector: [Number],
  feedback: String,
  status: { type: String, enum: Object.values(ResumeStatus), default: ResumeStatus.UPLOADED },
  skills: [{ type: Schema.Types.ObjectId, ref: 'Skill' }],
}, { timestamps: true });

// Job Schema
export interface IJob extends Document {
  title: string;
  company?: string;
  description: string;
  jobVector?: number[];
  skills: mongoose.Types.ObjectId[]; // References to Skill
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema = new Schema<IJob>({
  title: { type: String, required: true },
  company: String,
  description: { type: String, required: true },
  jobVector: [Number],
  skills: [{ type: Schema.Types.ObjectId, ref: 'Skill' }],
}, { timestamps: true });

// MatchResult Schema
export interface IMatchResult extends Document {
  resumeId: mongoose.Types.ObjectId;
  jobId: mongoose.Types.ObjectId;
  score: number;
  matchPercentage: number;
  skillGap: string[];
  confidence: number;
  createdAt: Date;
}

const MatchResultSchema = new Schema<IMatchResult>({
  resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', required: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job', required: true },
  score: { type: Number, required: true },
  matchPercentage: { type: Number, required: true },
  skillGap: [String],
  confidence: { type: Number, default: 0 },
}, { timestamps: true });

// Ensure unique index for MatchResult
MatchResultSchema.index({ resumeId: 1, jobId: 1 }, { unique: true });

// Models
export const User = mongoose.model<IUser>('User', UserSchema);
export const Skill = mongoose.model<ISkill>('Skill', SkillSchema);
export const Resume = mongoose.model<IResume>('Resume', ResumeSchema);
export const Job = mongoose.model<IJob>('Job', JobSchema);
export const MatchResult = mongoose.model<IMatchResult>('MatchResult', MatchResultSchema);
