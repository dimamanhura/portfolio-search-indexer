import { ConfigResult } from "./types";

export const loadAndValidateConfig = (): ConfigResult => {
  const {
    OPENSEARCH_ENDPOINT,
    OPENSEARCH_INDEX_NAME,
    AWS_REGION,
    MONGODB_URL,
  } = process.env;

  const missingVars: string[] = [];

  if (!OPENSEARCH_ENDPOINT) missingVars.push("OPENSEARCH_ENDPOINT");
  if (!OPENSEARCH_INDEX_NAME) missingVars.push("OPENSEARCH_INDEX_NAME");
  if (!AWS_REGION) missingVars.push("AWS_REGION");
  if (!MONGODB_URL) missingVars.push("MONGODB_URL");

  if (missingVars.length > 0) {
    return {
      success: false,
      errorMessage: `Missing critical environment variables: ${missingVars.join(
        ", "
      )}`,
    };
  }

  return {
    success: true,
    data: {
      OPENSEARCH_ENDPOINT: OPENSEARCH_ENDPOINT as string,
      OPENSEARCH_INDEX_NAME: OPENSEARCH_INDEX_NAME as string,
      AWS_REGION: AWS_REGION as string,
      MONGODB_URL: MONGODB_URL as string,
    },
  };
};
