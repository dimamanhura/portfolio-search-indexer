import { describe, it, expect, vi, beforeEach } from "vitest";
import { MongoClient } from "mongodb";
import {
  connectToDatabase,
  getAchievements,
  getProjects,
  getCompanies,
  getFeedback,
  getTechnologies,
  _resetCache,
} from "../db";

const mockToArray = vi.fn();
const mockFind = vi.fn(() => ({ toArray: mockToArray }));
const mockAggregate = vi.fn(() => ({ toArray: mockToArray }));
const mockCollection = vi.fn(() => ({
  find: mockFind,
  aggregate: mockAggregate,
}));

vi.mock("mongodb", () => {
  return {
    MongoClient: vi.fn().mockImplementation(function () {
      return {
        connect: vi.fn().mockResolvedValue(null),
        db: vi.fn().mockReturnValue({ collection: mockCollection }),
        close: vi.fn().mockResolvedValue(null),
      };
    }),
  };
});

describe("Database Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetCache();
  });

  it("connectToDatabase should cache connection", async () => {
    await connectToDatabase("mongodb://mock");
    await connectToDatabase("mongodb://mock");
    expect(MongoClient).toHaveBeenCalledTimes(1);
  });

  it("getAchievements should fetch from Achievement collection", async () => {
    mockToArray.mockResolvedValueOnce([{ title: "Achieve 1" }]);
    const result = await getAchievements("uri");
    expect(mockCollection).toHaveBeenCalledWith("Achievement");
    expect(result).toHaveLength(1);
  });

  it("getCompanies should fetch from Company collection", async () => {
    mockToArray.mockResolvedValueOnce([{ name: "Company A" }]);
    const result = await getCompanies("uri");
    expect(mockCollection).toHaveBeenCalledWith("Company");
    expect(result).toHaveLength(1);
  });

  it("getFeedback should fetch from Feedback collection", async () => {
    mockToArray.mockResolvedValueOnce([{ review: "Good" }]);
    const result = await getFeedback("uri");
    expect(mockCollection).toHaveBeenCalledWith("Feedback");
    expect(result).toHaveLength(1);
  });

  it("getProjects should run aggregation pipeline", async () => {
    mockToArray.mockResolvedValueOnce([{ name: "Project A" }]);
    await getProjects("uri");
    expect(mockCollection).toHaveBeenCalledWith("Project");
    expect(mockAggregate).toHaveBeenCalled();
  });

  it("getTechnologies should aggregate both Stacks and Tools", async () => {
    mockToArray
      .mockResolvedValueOnce([{ title: "Stack A" }])
      .mockResolvedValueOnce([{ title: "Tool A" }]);

    const result = await getTechnologies("uri");
    expect(mockCollection).toHaveBeenCalledWith("TechStack");
    expect(mockCollection).toHaveBeenCalledWith("TechTool");
    expect(result).toEqual([{ title: "Stack A" }, { title: "Tool A" }]);
  });
});
