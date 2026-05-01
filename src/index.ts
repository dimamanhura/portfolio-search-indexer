import { ScheduledEvent, Context } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Client } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { PrismaClient } from "@prisma/client";

// Initialize external clients outside the handler for potential warm-start reuse
const logger = new Logger({ serviceName: "portfolio-search-indexer" });
const prisma = new PrismaClient();

// --- Types & Interfaces ---

interface Config {
  OPENSEARCH_ENDPOINT: string;
  OPENSEARCH_INDEX_NAME: string;
  AWS_REGION: string;
  MONGODB_URL: string; // <-- Added this
}

interface ValidationResult {
  success: boolean;
  data?: Config;
  errorMessage?: string;
}

interface TransformedDocument {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  searchable_text: string;
}

// --- Configuration Validator ---

const loadAndValidateConfig = (): ValidationResult => {
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
    return {
      success: false,
      errorMessage:
        "Missing required environment variables: OPENSEARCH_ENDPOINT, OPENSEARCH_INDEX_NAME, AWS_REGION, or MONGODB_URL",
    };
  }

  return {
    success: true,
    data: {
      OPENSEARCH_ENDPOINT,
      OPENSEARCH_INDEX_NAME,
      AWS_REGION,
      MONGODB_URL,
    },
  };
};

// --- Lambda Handler ---

export const handler = async (
  event: ScheduledEvent,
  context: Context
): Promise<{ statusCode: number; body: string }> => {
  logger.addContext(context);

  try {
    logger.info("Step 1: Checking configuration");
    const config = loadAndValidateConfig();

    if (!config.success || !config.data) {
      logger.error("Configuration Error", { missingVars: config.errorMessage });
      throw new Error("Internal Server Configuration Error");
    }

    const { OPENSEARCH_ENDPOINT, OPENSEARCH_INDEX_NAME, AWS_REGION } =
      config.data;

    logger.info("Step 2: Initializing OpenSearch Client");
    const osClient = new Client({
      ...AwsSigv4Signer({
        region: AWS_REGION,
        service: "es",
        getCredentials: () => {
          // Use fromNodeProviderChain instead of defaultProvider
          const credentialsProvider = fromNodeProviderChain();
          return credentialsProvider();
        },
      }),
      node: OPENSEARCH_ENDPOINT,
    });

    logger.info("Step 3: Fetching data from MongoDB via Prisma");
    // Note: Adjust the Prisma properties (.name, .role, etc.) to match your exact schema
    const [projects, companies, educations, techTools] = await Promise.all([
      prisma.project.findMany(),
      prisma.company.findMany(),
      prisma.education.findMany(),
      prisma.techTool.findMany(),
    ]);

    logger.info("Step 4: Transforming data for OpenSearch");
    const transformedData: TransformedDocument[] = [];

    projects.forEach((p: any) => {
      transformedData.push({
        id: p.id,
        type: "Project",
        title: p.name || "",
        subtitle: p.role || "",
        searchable_text: `${p.name || ""} ${p.description || ""} ${
          p.technologies?.join(" ") || ""
        }`,
      });
    });

    companies.forEach((c: any) => {
      transformedData.push({
        id: c.id,
        type: "Experience",
        title: c.name || "",
        subtitle: c.role || "",
        searchable_text: `${c.name || ""} ${c.role || ""} ${
          c.description || ""
        }`,
      });
    });

    educations.forEach((e: any) => {
      transformedData.push({
        id: e.id,
        type: "Education",
        title: e.degree || "",
        subtitle: e.institution || "",
        searchable_text: `${e.degree || ""} ${e.institution || ""} ${
          e.description || ""
        }`,
      });
    });

    techTools.forEach((t: any) => {
      transformedData.push({
        id: t.id,
        type: "TechTool",
        title: t.name || "",
        subtitle: t.category || "",
        searchable_text: `${t.name || ""} ${t.category || ""}`,
      });
    });

    if (transformedData.length === 0) {
      logger.warn("No data found to sync. Exiting early.");
      return { statusCode: 200, body: "No data to sync." };
    }

    logger.info("Step 5: Recreating OpenSearch Index", {
      indexName: OPENSEARCH_INDEX_NAME,
    });
    const { body: indexExists } = await osClient.indices.exists({
      index: OPENSEARCH_INDEX_NAME,
    });

    if (indexExists) {
      logger.info(`Deleting existing index: ${OPENSEARCH_INDEX_NAME}`);
      await osClient.indices.delete({ index: OPENSEARCH_INDEX_NAME });
    }

    logger.info(`Creating new index: ${OPENSEARCH_INDEX_NAME}`);
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

    logger.info("Step 6: Bulk uploading documents to OpenSearch", {
      count: transformedData.length,
    });
    const bulkOperations = transformedData.flatMap((doc) => [
      { index: { _index: OPENSEARCH_INDEX_NAME, _id: doc.id } },
      doc,
    ]);

    const bulkResponse = await osClient.bulk({
      refresh: true, // Force index refresh so data is immediately searchable
      body: bulkOperations,
    });

    if (bulkResponse.body.errors) {
      logger.error("Bulk upload completed with errors", {
        items: bulkResponse.body.items,
      });
      throw new Error("Failed to bulk insert all documents.");
    }

    logger.info("Sync completed successfully!");
    return {
      statusCode: 200,
      body: `Successfully synced ${transformedData.length} documents.`,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Internal Lambda Error (Unhandled Exception)", {
      error: error instanceof Error ? error : new Error(errorMessage),
    });

    // Throwing the error ensures EventBridge/CloudWatch registers the Lambda execution as a failure
    throw error;
  } finally {
    logger.info("Step 7: Cleaning up database connection");
    await prisma.$disconnect();
  }
};
