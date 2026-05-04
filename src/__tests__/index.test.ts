import { describe, it, expect, vi, beforeEach } from "vitest";
import { handler } from "../index";
import { logger } from "../logger";
import { loadAndValidateConfig } from "../config";
import * as dbModule from "../db";
import * as osModule from "../open-search";
import { ScheduledEvent, Context } from "aws-lambda";
import { Achievement } from "../types";

interface SyncResponseBody {
  message?: string;
  error?: string;
}

vi.mock("../logger", () => ({
  logger: { addContext: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("../config");
vi.mock("../db");
vi.mock("../open-search");

vi.mock("../transformers", () => ({
  transformAchievement: vi.fn(() => ({ id: "ach-1", type: "achievement" })),
  transformProject: vi.fn(() => ({ id: "proj-1", type: "project" })),
  transformCompany: vi.fn(() => ({ id: "comp-1", type: "company" })),
  transformFeedback: vi.fn(() => ({ id: "feed-1", type: "feedback" })),
  transformTechnology: vi.fn(() => ({ id: "tech-1", type: "technology" })),
}));

describe("Lambda Handler Orchestrator", () => {
  const mockEvent = {} as ScheduledEvent;
  const mockContext = { awsRequestId: "123" } as Context;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("halts and returns 500 if config validation fails", async () => {
    vi.mocked(loadAndValidateConfig).mockReturnValue({
      success: false,
      errorMessage: "Missing Env",
    });

    const response = await handler(mockEvent, mockContext);
    expect(response.statusCode).toBe(500);
  });

  it("handles scenario with no data in database gracefully", async () => {
    vi.mocked(loadAndValidateConfig).mockReturnValue({
      success: true,
      data: {
        OPENSEARCH_ENDPOINT: "end",
        OPENSEARCH_INDEX_NAME: "idx",
        AWS_REGION: "us",
        MONGODB_URL: "mongo",
      },
    });

    vi.mocked(dbModule.getAchievements).mockResolvedValue([]);
    vi.mocked(dbModule.getProjects).mockResolvedValue([]);
    vi.mocked(dbModule.getCompanies).mockResolvedValue([]);
    vi.mocked(dbModule.getFeedback).mockResolvedValue([]);
    vi.mocked(dbModule.getTechnologies).mockResolvedValue([]);

    const response = await handler(mockEvent, mockContext);

    const body = JSON.parse(response.body) as SyncResponseBody;
    expect(body.message).toBe("No data to sync.");
  });

  it("skips deleteIndex if index does not exist (Increases Branch Coverage)", async () => {
    vi.mocked(loadAndValidateConfig).mockReturnValue({
      success: true,
      data: {
        OPENSEARCH_ENDPOINT: "e",
        OPENSEARCH_INDEX_NAME: "i",
        AWS_REGION: "u",
        MONGODB_URL: "m",
      },
    });

    vi.mocked(dbModule.getAchievements).mockResolvedValue([
      { title: "Ach" } as Achievement,
    ]);
    vi.mocked(osModule.checkIndexExists).mockResolvedValue(false);
    vi.mocked(osModule.bulkUpload).mockResolvedValue({ success: true });

    await handler(mockEvent, mockContext);

    expect(osModule.deleteIndex).not.toHaveBeenCalled();
    expect(osModule.createIndex).toHaveBeenCalled();
  });

  it("orchestrates full sync when index exists", async () => {
    vi.mocked(loadAndValidateConfig).mockReturnValue({
      success: true,
      data: {
        OPENSEARCH_ENDPOINT: "e",
        OPENSEARCH_INDEX_NAME: "i",
        AWS_REGION: "u",
        MONGODB_URL: "m",
      },
    });

    vi.mocked(dbModule.getAchievements).mockResolvedValue([
      { title: "Ach" } as Achievement,
    ]);
    vi.mocked(osModule.checkIndexExists).mockResolvedValue(true);
    vi.mocked(osModule.bulkUpload).mockResolvedValue({ success: true });

    const response = await handler(mockEvent, mockContext);

    expect(osModule.deleteIndex).toHaveBeenCalled();
    expect(osModule.createIndex).toHaveBeenCalled();
    expect(response.statusCode).toBe(200);
  });

  it("halts and returns 500 if bulk upload fails", async () => {
    vi.mocked(loadAndValidateConfig).mockReturnValue({
      success: true,
      data: {
        OPENSEARCH_ENDPOINT: "e",
        OPENSEARCH_INDEX_NAME: "i",
        AWS_REGION: "u",
        MONGODB_URL: "m",
      },
    });

    vi.mocked(dbModule.getAchievements).mockResolvedValue([
      { title: "Ach" } as Achievement,
    ]);
    vi.mocked(osModule.bulkUpload).mockResolvedValue({
      success: false,
      errorMessage: "Upload failed",
    });

    const response = await handler(mockEvent, mockContext);
    expect(response.statusCode).toBe(500);
  });

  it("skips deleteIndex if the index does not exist", async () => {
    vi.mocked(loadAndValidateConfig).mockReturnValue({
      success: true,
      data: {
        OPENSEARCH_ENDPOINT: "end",
        OPENSEARCH_INDEX_NAME: "idx",
        AWS_REGION: "us",
        MONGODB_URL: "mongo",
      },
    });

    vi.mocked(dbModule.getAchievements).mockResolvedValue([
      { title: "Ach" } as Achievement,
    ]);

    vi.mocked(osModule.checkIndexExists).mockResolvedValue(false);
    vi.mocked(osModule.bulkUpload).mockResolvedValue({ success: true });

    await handler(mockEvent, mockContext);

    expect(osModule.deleteIndex).not.toHaveBeenCalled();
    expect(osModule.createIndex).toHaveBeenCalled();
  });

  it("handles failure during the index deletion phase", async () => {
    vi.mocked(loadAndValidateConfig).mockReturnValue({
      success: true,
      data: {
        OPENSEARCH_ENDPOINT: "e",
        OPENSEARCH_INDEX_NAME: "i",
        AWS_REGION: "u",
        MONGODB_URL: "m",
      },
    });

    vi.mocked(dbModule.getAchievements).mockResolvedValue([
      { title: "Ach" } as Achievement,
    ]);
    vi.mocked(osModule.checkIndexExists).mockResolvedValue(true);

    vi.mocked(osModule.deleteIndex).mockRejectedValue(
      new Error("Delete failed")
    );

    const response = await handler(mockEvent, mockContext);

    expect(response.statusCode).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      "Internal Lambda Error (Unhandled Exception)",
      expect.any(Object)
    );
  });
});

describe("Lambda Handler - Error Path Coverage", () => {
  const mockEvent = {} as ScheduledEvent;
  const mockContext = { awsRequestId: "456" } as Context;

  it("handles non-Error objects thrown in the catch block", async () => {
    vi.mocked(loadAndValidateConfig).mockReturnValue({
      success: true,
      data: {
        OPENSEARCH_ENDPOINT: "e",
        OPENSEARCH_INDEX_NAME: "i",
        AWS_REGION: "u",
        MONGODB_URL: "m",
      },
    });

    vi.mocked(dbModule.getAchievements).mockRejectedValue(
      "Unexpected String Error"
    );

    const response = await handler(mockEvent, mockContext);

    expect(response.statusCode).toBe(500);
    expect(logger.error).toHaveBeenCalledWith(
      "Internal Lambda Error (Unhandled Exception)",
      expect.any(Object)
    );
  });

  it("returns error response if bulk upload result is unsuccessful with no message", async () => {
    vi.mocked(loadAndValidateConfig).mockReturnValue({
      success: true,
      data: {
        OPENSEARCH_ENDPOINT: "e",
        OPENSEARCH_INDEX_NAME: "i",
        AWS_REGION: "u",
        MONGODB_URL: "m",
      },
    });

    vi.mocked(dbModule.getAchievements).mockResolvedValue([
      { title: "Ach" } as Achievement,
    ]);

    vi.mocked(osModule.bulkUpload).mockResolvedValue({
      success: false,
      errorMessage: undefined,
    });

    const response = await handler(mockEvent, mockContext);

    expect(response.statusCode).toBe(500);

    const body = JSON.parse(response.body) as SyncResponseBody;
    expect(body.error).toBe("Internal Server Error.");
  });
});
