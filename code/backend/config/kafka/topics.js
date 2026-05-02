"use strict";Object.defineProperty(exports, "__esModule", {value: true});// Shared Kafka topic names
 const TOPICS = {
  RESUME_UPLOADED: "resume_uploaded",
  RESUME_PARSED: "resume_parsed",
  // Reuse an existing allowed topic because this cluster blocks topic creation.
  EMBEDDINGS_GENERATED: "resume_parsed",
  SKILL_EXTRACTED: "resume_parsed",
  MATCH_COMPLETED: "match_completed",
}; exports.TOPICS = TOPICS ;

 
