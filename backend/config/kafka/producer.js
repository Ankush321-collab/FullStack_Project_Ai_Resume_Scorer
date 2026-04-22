"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }var _kafkajs = require('kafkajs');
var _fs = require('fs'); var _fs2 = _interopRequireDefault(_fs);
var _path = require('path'); var _path2 = _interopRequireDefault(_path);

let producer = null;
let kafkaClient = null;
const ensuredTopics = new Set();

function resolveReadablePath(rawPath) {
  if (_path2.default.isAbsolute(rawPath)) {
    if (_fs2.default.existsSync(rawPath)) return rawPath;
    throw new Error(`Kafka TLS file not found: ${rawPath}`);
  }

  let dir = process.cwd();
  while (true) {
    const candidate = _path2.default.resolve(dir, rawPath);
    if (_fs2.default.existsSync(candidate)) return candidate;

    const parent = _path2.default.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(`Kafka TLS file not found (searched from cwd parents): ${rawPath}`);
}

function isTopicRoutingError(err) {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("does not host this topic-partition") ||
    lower.includes("unknown_topic_or_partition")
  );
}

async function ensureTopic(topic) {
  if (!kafkaClient || ensuredTopics.has(topic)) return;

  const admin = kafkaClient.admin();
  await admin.connect();
  try {
    const topics = await admin.listTopics();
    if (!topics.includes(topic)) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
      });
    }
    ensuredTopics.add(topic);
  } finally {
    await admin.disconnect();
  }
}

 async function getProducer() {
  if (producer) return producer;

  const caPath = process.env.KAFKA_CA_PATH;
  const keyPath = process.env.KAFKA_KEY_PATH;
  const certPath = process.env.KAFKA_CERT_PATH;

  const ssl = process.env.KAFKA_CA_PATH ? {
    ca: [_fs2.default.readFileSync(resolveReadablePath(caPath), "utf-8")],
    key: keyPath ? _fs2.default.readFileSync(resolveReadablePath(keyPath), "utf-8") : undefined,
    cert: certPath ? _fs2.default.readFileSync(resolveReadablePath(certPath), "utf-8") : undefined,
  } : undefined;

  const sasl = process.env.KAFKA_SASL_USERNAME ? {
    mechanism: "plain" ,
    username: process.env.KAFKA_SASL_USERNAME,
    password: process.env.KAFKA_SASL_PASSWORD,
  } : undefined;

  kafkaClient = new (0, _kafkajs.Kafka)({
    clientId: process.env.KAFKA_CLIENT_ID || "resume-analyser",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    ssl,
    sasl,
  });

  producer = kafkaClient.producer();
  await producer.connect();
  return producer;
} exports.getProducer = getProducer;

 async function publishEvent(
  topic,
  payload
) {
  const record = {
    topic,
    messages: [{ value: JSON.stringify(payload) }],
  };

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const p = await getProducer();
      await ensureTopic(topic);
      await p.send(record);
      return;
    } catch (err) {
      if (!isTopicRoutingError(err) || attempt === 2) {
        throw err;
      }

      if (producer) {
        await producer.disconnect().catch(() => undefined);
        producer = null;
      }
      ensuredTopics.delete(topic);
    }
  }
} exports.publishEvent = publishEvent;
