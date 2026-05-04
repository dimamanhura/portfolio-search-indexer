import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkIndexExists,
  createIndex,
  deleteIndex,
  refreshIndex,
  bulkUpload,
} from "../open-search";
import { logger } from "../logger";
import {
  OpenSearchDocument,
  OpenSearchIndexConfig,
  SearchEntityType,
} from "../types";

const mockExists = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockRefresh = vi.fn();
const mockIndex = vi.fn();

vi.mock("@opensearch-project/opensearch", () => {
  return {
    Client: vi.fn().mockImplementation(function () {
      return {
        indices: {
          exists: mockExists,
          create: mockCreate,
          delete: mockDelete,
          refresh: mockRefresh,
        },
        index: mockIndex,
      };
    }),
  };
});

vi.mock("@opensearch-project/opensearch/aws", () => ({
  AwsSigv4Signer: vi.fn().mockReturnValue({}),
}));

vi.mock("@aws-sdk/credential-providers", () => ({
  fromNodeProviderChain: vi.fn(() => vi.fn()),
}));

vi.mock("../logger", () => ({
  logger: { error: vi.fn() },
}));

describe("OpenSearch Module", () => {
  const config: OpenSearchIndexConfig = {
    region: "us-east-1",
    index: "test-index",
    node: "http://node",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checkIndexExists returns true when body is true", async () => {
    mockExists.mockResolvedValueOnce({ body: true });
    const exists = await checkIndexExists(config);
    expect(exists).toBe(true);
    expect(mockExists).toHaveBeenCalledWith({ index: "test-index" });
  });

  it("createIndex calls indices.create with the exact configuration object", async () => {
    await createIndex(config);

    expect(mockCreate).toHaveBeenCalledWith({
      index: "test-index",
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
  });

  it("deleteIndex calls indices.delete", async () => {
    await deleteIndex(config);
    expect(mockDelete).toHaveBeenCalledWith({ index: "test-index" });
  });

  it("refreshIndex calls indices.refresh", async () => {
    await refreshIndex(config);
    expect(mockRefresh).toHaveBeenCalledWith({ index: "test-index" });
  });

  it("bulkUpload processes documents individually and returns success", async () => {
    mockIndex.mockResolvedValue({});
    const docs: OpenSearchDocument[] = [
      {
        id: "1",
        type: SearchEntityType.project,
        title: "Proj 1",
        subtitle: "Required Subtitle",
        searchable_text: "text",
      },
      {
        id: "2",
        type: SearchEntityType.technology,
        title: "Tech 1",
        subtitle: "Required Subtitle",
        searchable_text: "text",
      },
    ];

    const result = await bulkUpload(config, docs);
    expect(mockIndex).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
  });

  it("bulkUpload catches errors on individual documents and returns failure payload", async () => {
    mockIndex
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("Upload fail"));

    const docs: OpenSearchDocument[] = [
      {
        id: "1",
        type: SearchEntityType.project,
        title: "Proj 1",
        subtitle: "Sub 1",
        searchable_text: "text",
      },
      {
        id: "2",
        type: SearchEntityType.technology,
        title: "Tech 1",
        subtitle: "Sub 2",
        searchable_text: "text",
      },
    ];

    const result = await bulkUpload(config, docs);
    expect(logger.error).toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("1 succeeded, 1 failed");
  });
});
