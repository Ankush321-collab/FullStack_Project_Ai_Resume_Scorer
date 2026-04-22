import { Kafka, Producer, ProducerRecord } from "kafkajs";
import fs from "fs";
import path from "path";

let producer: Producer | null = null;
let kafkaClient: Kafka | null = null;
const ensuredTopics = new Set<string>();

function resolveReadablePath(rawPath: string): string {
  if (path.isAbsolute(rawPath)) {
    if (fs.existsSync(rawPath)) return rawPath;
    throw new Error(`Kafka TLS file not found: ${rawPath}`);
  }

  let dir = process.cwd();
  while (true) {
    const candidate = path.resolve(dir, rawPath);
    if (fs.existsSync(candidate)) return candidate;

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(`Kafka TLS file not found (searched from cwd parents): ${rawPath}`);
}

function isTopicRoutingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    lower.includes("does not host this topic-partition") ||
    lower.includes("unknown_topic_or_partition")
  );
}

async function ensureTopic(topic: string): Promise<void> {
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

export async function getProducer(): Promise<Producer> {
  if (producer) return producer;

  const caPath = process.env.KAFKA_CA_PATH;
  const keyPath = process.env.KAFKA_KEY_PATH;
  const certPath = process.env.KAFKA_CERT_PATH;

  const ssl = process.env.KAFKA_CA_PATH ? {
    ca: [fs.readFileSync(resolveReadablePath(caPath!), "utf-8")],
    key: keyPath ? fs.readFileSync(resolveReadablePath(keyPath), "utf-8") : undefined,
    cert: certPath ? fs.readFileSync(resolveReadablePath(certPath), "utf-8") : undefined,
  } : undefined;

  const sasl = process.env.KAFKA_SASL_USERNAME ? {
    mechanism: "plain" as const,
    username: process.env.KAFKA_SASL_USERNAME,
    password: process.env.KAFKA_SASL_PASSWORD!,
  } : undefined;

  kafkaClient = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "resume-analyser",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    ssl,
    sasl,
  });

  producer = kafkaClient.producer();
  await producer.connect();
  return producer;
}

export async function publishEvent(
  topic: string,
  payload: Record<string, unknown>
): Promise<void> {
  const record: ProducerRecord = {
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
}
