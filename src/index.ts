import { ScheduledEvent, Context } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Client as OpenSearchClient } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { connectToDatabase } from "./db";
import { Achievement } from "./types/achievement";
import { SearchItemType } from "./types/search-item-type";

const logger = new Logger({ serviceName: "portfolio-search-indexer" });

// --- Types & Interfaces ---

interface Config {
  OPENSEARCH_ENDPOINT: string;
  OPENSEARCH_INDEX_NAME: string;
  AWS_REGION: string;
  MONGODB_URL: string;
}

interface TransformedDocument {
  id: string;
  type: SearchItemType;
  title: string;
  subtitle: string;
  searchable_text: string;
}

// --- Configuration Validator ---

const loadAndValidateConfig = (): Config => {
  const {
    OPENSEARCH_ENDPOINT,
    OPENSEARCH_INDEX_NAME,
    AWS_REGION,
    MONGODB_URL,
  } = process.env;

  if (
    !OPENSEARCH_ENDPOINT ||
    !OPENSEARCH_INDEX_NAME ||
    !AWS_REGION ||
    !MONGODB_URL
  ) {
    throw new Error("Missing required environment variables.");
  }

  return {
    OPENSEARCH_ENDPOINT,
    OPENSEARCH_INDEX_NAME,
    AWS_REGION,
    MONGODB_URL,
  };
};

// --- Lambda Handler ---

export const handler = async (
  event: ScheduledEvent,
  context: Context
): Promise<{ statusCode: number; body: string }> => {
  logger.addContext(context);

  try {
    const config = loadAndValidateConfig();
    const {
      OPENSEARCH_ENDPOINT,
      OPENSEARCH_INDEX_NAME,
      AWS_REGION,
      MONGODB_URL,
    } = config;

    logger.info("Step 1: Initializing Clients");
    const osClient = new OpenSearchClient({
      ...AwsSigv4Signer({
        region: AWS_REGION,
        service: "es",
        getCredentials: () => fromNodeProviderChain()(),
      }),
      node: OPENSEARCH_ENDPOINT,
    });

    logger.info("Step 2: Connecting to MongoDB and fetching data");
    const db = await connectToDatabase(MONGODB_URL); // Uses the database name from your connection string

    // Fetching collections in parallel
    const [achievements] = await Promise.all([
      db.collection<Achievement>("Project").find().toArray(),
    ]);

    logger.info("Step 3: Transforming data");
    const transformedData: TransformedDocument[] = [
      ...achievements.map((achievement) => ({
        id: achievement._id.toString(),
        type: SearchItemType.achievement,
        title: achievement.title || "",
        subtitle: achievement.description || "",
        searchable_text: `
          Solution: ${achievement.solution?.join(",") || ""}
          Result: ${achievement.result?.join(",") || ""}
          Notes: ${achievement.notes?.join(",") || ""}
        `,
      })),
    ];

    if (transformedData.length === 0) {
      return { statusCode: 200, body: "No data to sync." };
    }

    logger.info("Step 4: Recreating OpenSearch Index", {
      indexName: OPENSEARCH_INDEX_NAME,
    });
    const { body: exists } = await osClient.indices.exists({
      index: OPENSEARCH_INDEX_NAME,
    });
    if (exists) await osClient.indices.delete({ index: OPENSEARCH_INDEX_NAME });

    await osClient.indices.create({
      index: OPENSEARCH_INDEX_NAME,
      body: {
        settings: {
          index: {
            number_of_shards: 1,
            number_of_replicas: OPENSEARCH_INDEX_NAME.includes("prod") ? 1 : 0,
          },
        },
        mappings: {
          properties: {
            id: { type: "keyword" },
            type: { type: "keyword" },
            title: { type: "text" },
            subtitle: { type: "text" },
            searchable_text: { type: "text" },
          },
        },
      },
    });

    logger.info("Step 5: Bulk upload", { count: transformedData.length });
    const body = transformedData.flatMap((doc) => [
      { index: { _index: OPENSEARCH_INDEX_NAME, _id: doc.id } },
      doc,
    ]);

    const result = await osClient.bulk({ refresh: true, body });

    if (result.body.errors) {
      throw new Error("Bulk upload errors occurred.");
    }

    return { statusCode: 200, body: `Synced ${transformedData.length} items.` };
  } catch (error) {
    logger.error("Sync failed", { error });
    throw error;
  }
};
