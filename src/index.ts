import { ScheduledEvent, Context } from "aws-lambda";
import { logger } from "./logger";
import {
  getTechnologies,
  getAchievements,
  getCompanies,
  getProjects,
  getFeedback,
} from "./db";
import { loadAndValidateConfig } from "./config";
import { errorResponse, successResponse } from "./response";
import {
  checkIndexExists,
  refreshIndex,
  deleteIndex,
  createIndex,
  bulkUpload,
} from "./open-search";
import { OpenSearchDocument, OpenSearchIndexConfig } from "./types";
import {
  transformAchievement,
  transformTechnology,
  transformFeedback,
  transformProject,
  transformCompany,
} from "./transformers";

export const handler = async (
  event: ScheduledEvent,
  context: Context
): Promise<{ statusCode: number; body: string }> => {
  logger.addContext(context);

  try {
    logger.info("Step 1: Checking configuration");
    const config = loadAndValidateConfig();

    if (!config.success) {
      logger.error("Configuration Error", { missingVars: config.errorMessage });
      return errorResponse(500, "Internal Server Configuration Error.");
    }

    const {
      OPENSEARCH_ENDPOINT,
      OPENSEARCH_INDEX_NAME,
      AWS_REGION,
      MONGODB_URL,
    } = config.data;

    logger.info("Step 2: Connecting to MongoDB and fetching data");
    const [achievements, projects, companies, feedback, technologies] =
      await Promise.all([
        getAchievements(MONGODB_URL),
        getProjects(MONGODB_URL),
        getCompanies(MONGODB_URL),
        getFeedback(MONGODB_URL),
        getTechnologies(MONGODB_URL),
      ]);

    logger.info("Step 3: Transforming data", {
      counts: {
        achievements: achievements.length,
        projects: projects.length,
        companies: companies.length,
        feedback: feedback.length,
        technologies: technologies.length,
      },
    });

    const transformedData: OpenSearchDocument[] = [
      ...achievements.map(transformAchievement),
      ...projects.map(transformProject),
      ...companies.map(transformCompany),
      ...feedback.map(transformFeedback),
      ...technologies.map(transformTechnology),
    ];

    if (transformedData.length === 0) {
      logger.info("Sync aborted: No data found in database to sync.");
      return successResponse("No data to sync.");
    }

    logger.info("Step 4: Preparing OpenSearch Index environment", {
      indexName: OPENSEARCH_INDEX_NAME,
    });

    const indexConfig: OpenSearchIndexConfig = {
      region: AWS_REGION,
      index: OPENSEARCH_INDEX_NAME,
      node: OPENSEARCH_ENDPOINT,
    };

    logger.info("Checking if OpenSearch index exists...", {
      indexName: OPENSEARCH_INDEX_NAME,
    });
    const isIndexExists = await checkIndexExists(indexConfig);

    if (isIndexExists) {
      logger.info("Index found. Deleting old index...", {
        indexName: OPENSEARCH_INDEX_NAME,
      });
      await deleteIndex(indexConfig);
      logger.info("Old index successfully deleted.");
    } else {
      logger.info("No existing index found. Proceeding to creation.");
    }

    logger.info("Creating new OpenSearch index...", {
      indexName: OPENSEARCH_INDEX_NAME,
    });
    await createIndex(indexConfig);
    logger.info("New index successfully created.");

    logger.info("Step 5: Executing bulk upload", {
      documentCount: transformedData.length,
    });
    const uploadResult = await bulkUpload(indexConfig, transformedData);

    if (!uploadResult.success) {
      logger.error("Bulk upload failed", { error: uploadResult.errorMessage });
      return errorResponse(
        500,
        uploadResult.errorMessage || "Bulk upload operation failed."
      );
    }
    logger.info("Bulk upload completed successfully.");

    logger.info("Step 6: Refreshing index to make documents searchable...", {
      indexName: OPENSEARCH_INDEX_NAME,
    });
    await refreshIndex(indexConfig);
    logger.info("Index refreshed successfully.");

    return successResponse(`Synced ${transformedData.length} items.`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Internal Lambda Error (Unhandled Exception)", {
      error: error instanceof Error ? error : new Error(errorMessage),
    });
    return errorResponse(500, "Internal Server Error.");
  }
};
