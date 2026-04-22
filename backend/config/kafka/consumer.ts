import { Kafka, Consumer, EachMessagePayload } from "kafkajs";
import fs from "fs";
import path from "path";

export type MessageHandler = (payload: Record<string, unknown>) => Promise<void>;

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

async function ensureTopic(kafka: Kafka, topic: string): Promise<void> {
  const admin = kafka.admin();
  await admin.connect();
  try {
    const topics = await admin.listTopics();
    if (!topics.includes(topic)) {
      await admin.createTopics({
        waitForLeaders: true,
        topics: [{ topic, numPartitions: 1, replicationFactor: 1 }],
      });
    }
  } finally {
    await admin.disconnect();
  }
}

export async function createConsumer(
  groupId: string,
  topic: string,
  handler: MessageHandler
): Promise<Consumer> {
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

  const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID || "resume-analyser",
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    ssl,
    sasl,
  });

  const consumer = kafka.consumer({ groupId });

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await ensureTopic(kafka, topic);
      await consumer.connect();
      await consumer.subscribe({ topic, fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;
          const payload = JSON.parse(message.value.toString()) as Record<string, unknown>;
          await handler(payload);
        },
      });
      break;
    } catch (err) {
      if (!isTopicRoutingError(err) || attempt === 2) {
        throw err;
      }
      await consumer.disconnect().catch(() => undefined);
    }
  }

  return consumer;
}
