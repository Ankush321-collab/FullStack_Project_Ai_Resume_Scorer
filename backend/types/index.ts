// Kafka Event Payloads
export interface ResumeUploadedEvent {
  resumeId: string;
  userId: string;
  fileUrl: string;
  fileName: string;
  jobId?: string;
}

export interface ResumeParsedEvent {
  resumeId: string;
  userId: string;
  parsedText: string;
  jobId?: string;
}

export interface EmbeddingsGeneratedEvent {
  resumeId: string;
  userId: string;
  resumeVector: number[];
  jobId?: string;
}

export interface SkillExtractedEvent {
  resumeId: string;
  userId: string;
  skills: string[];
  jobId?: string;
}

export interface MatchCompletedEvent {
  resumeId: string;
  jobId: string;
  userId: string;
  score: number;
  matchPercentage: number;
  skillGap: string[];
  confidence: number;
}

// AI Service Responses
export interface NebiusEmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

export interface NebiusChatResponse {
  choices: { message: { content: string } }[];
  model: string;
}

// GraphQL/API Types
export interface AnalysisStatus {
  resumeId: string;
  status: string;
  score?: number;
  matchPercentage?: number;
  skillGap?: string[];
  feedback?: string;
}
