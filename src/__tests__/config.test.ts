import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadAndValidateConfig } from "../config";

describe("loadAndValidateConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return success and config data when all variables are present", () => {
    process.env.OPENSEARCH_ENDPOINT = "https://search.aws.com";
    process.env.OPENSEARCH_INDEX_NAME = "portfolio";
    process.env.AWS_REGION = "us-east-1";
    process.env.MONGODB_URL = "mongodb://localhost:27017";

    const result = loadAndValidateConfig();

    expect(result).toEqual({
      success: true,
      data: {
        OPENSEARCH_ENDPOINT: "https://search.aws.com",
        OPENSEARCH_INDEX_NAME: "portfolio",
        AWS_REGION: "us-east-1",
        MONGODB_URL: "mongodb://localhost:27017",
      },
    });
  });

  it("should return failure listing a single missing variable", () => {
    process.env.OPENSEARCH_ENDPOINT = "https://search.aws.com";
    process.env.OPENSEARCH_INDEX_NAME = "portfolio";
    process.env.AWS_REGION = "us-east-1";
    delete process.env.MONGODB_URL;

    const result = loadAndValidateConfig();

    expect(result).toEqual({
      success: false,
      errorMessage: "Missing critical environment variables: MONGODB_URL",
    });
  });

  it("returns success: false when a required env var is missing (Hits lines 13-15)", () => {
    const result = loadAndValidateConfig();

    expect(result).toEqual({
      success: false,
      errorMessage:
        "Missing critical environment variables: OPENSEARCH_ENDPOINT, OPENSEARCH_INDEX_NAME, AWS_REGION, MONGODB_URL",
    });
  });
});
