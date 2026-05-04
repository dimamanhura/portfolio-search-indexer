import { Client as OpenSearchClient } from "@opensearch-project/opensearch";
import { AwsSigv4Signer } from "@opensearch-project/opensearch/aws";
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import { OpenSearchDocument, OpenSearchIndexConfig } from "./types";
import { logger } from "./logger";

let cachedClient: OpenSearchClient | null = null;

export const getClient = ({
  region,
  node,
}: {
  region: string;
  node: string;
}) => {
  if (!cachedClient) {
    cachedClient = new OpenSearchClient({
      ...AwsSigv4Signer({
        region,
        service: "es",
        getCredentials: () => fromNodeProviderChain()(),
      }),
      node,
    });
  }
  return cachedClient;
};

export const checkIndexExists = async (config: OpenSearchIndexConfig) => {
  const { region, index, node } = config;
  const osClient = getClient({ region, node });
  const { body: exists } = await osClient.indices.exists({
    index,
  });
  return exists;
};

export const createIndex = async (config: OpenSearchIndexConfig) => {
  const { region, index, node } = config;
  const osClient = getClient({ region, node });
  await osClient.indices.create({
    index,
    body: {
      settings: {
        index: {
          number_of_shards: 1,
          number_of_replicas: 0,
        },
      },
      mappings: {
        properties: {
          id: { type: "keyword" },
          type: { type: "keyword" },
          title: { type: "text" },
          subtitle: { type: "text" },
          url: { type: "keyword" },
          image: { type: "keyword" },
          searchable_text: {
            type: "text",
            term_vector: "with_positions_offsets",
          },
        },
      },
    },
  });
};

export const deleteIndex = async (config: OpenSearchIndexConfig) => {
  const { region, index, node } = config;
  const osClient = getClient({ region, node });
  await osClient.indices.delete({ index });
  return;
};

export const refreshIndex = async (config: OpenSearchIndexConfig) => {
  const { region, index, node } = config;
  const osClient = getClient({ region, node });
  await osClient.indices.refresh({ index });
  return;
};

export const bulkUpload = async (
  config: OpenSearchIndexConfig,
  data: OpenSearchDocument[]
) => {
  const { region, index, node } = config;
  const osClient = getClient({ region, node });
  let successCount = 0;
  let errorCount = 0;

  // Note: Using individual index operations instead of the native _bulk API
  // to avoid IAM permission issues at the root domain level.
  for (const doc of data) {
    try {
      await osClient.index({
        index,
        id: doc.id,
        body: doc,
      });
      successCount++;
    } catch (err) {
      logger.error(`Failed to index document ID: ${doc.id}`, { error: err });
      errorCount++;
    }
  }

  if (errorCount > 0) {
    return {
      success: false,
      errorMessage: `Upload completed with errors. ${successCount} succeeded, ${errorCount} failed.`,
    };
  }

  return {
    success: true,
  };
};
