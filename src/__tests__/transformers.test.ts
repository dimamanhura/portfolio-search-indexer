import { describe, it, expect } from "vitest";
import {
  transformProject,
  transformAchievement,
  transformFeedback,
  transformCompany,
  transformTechnology,
} from "../transformers";
import {
  SearchEntityType,
  Project,
  Achievement,
  Feedback,
  Company,
  Technology,
} from "../types";

const mockObjectId = (id: string) => ({ toString: () => id });

describe("Transformers", () => {
  it("transformAchievement handles missing fields", () => {
    const achievement = {
      _id: mockObjectId("456"),
    } as unknown as Achievement;

    const doc = transformAchievement(achievement);
    expect(doc.title).toBe("");
    expect(doc.searchable_text).toContain("Solution: ");
    expect(doc.searchable_text).toContain("Result: ");
    expect(doc.searchable_text).toContain("Notes:");
  });

  it("transformFeedback handles missing section", () => {
    const feedback = {
      _id: mockObjectId("789"),
      author: "Jane",
      review: "Great!",
    } as unknown as Feedback;

    const doc = transformFeedback(feedback);
    expect(doc.title).toBe("Feedback: General");
  });

  it("transformCompany handles missing logo and positions", () => {
    const company = {
      _id: mockObjectId("101"),
      name: "Minimal Corp",
      position: "Dev",
      location: { city: "London", country: "UK" },
    } as unknown as Company;

    const doc = transformCompany(company);
    expect(doc.image).toBeUndefined();
    expect(doc.searchable_text).toContain("Positions held: ");
    expect(doc.searchable_text).toContain("Reasons for leaving:");
  });

  it("transformTechnology handles missing logo and parent category", () => {
    const tech = {
      _id: mockObjectId("204"),
      title: "C#",
      type: "Language",
    } as unknown as Technology;

    const doc = transformTechnology(tech);
    expect(doc.subtitle).toBe("Tech Stack");
    expect(doc.image).toBeUndefined();
    expect(doc.searchable_text).toContain("Category/Stack:");
  });

  it("transformProject formats correctly", () => {
    const project = {
      _id: mockObjectId("123"),
      name: "Test Project",
      shortDescription: "Short info",
      longDescription: "Long info",
      slug: "test-project",
      position: "Developer",
      team: ["Alice", "Bob"],
      features: ["Login", "Auth"],
      responsibilities: ["Coding"],
      stacks: ["React"],
      tools: ["Git"],
      integrations: ["Stripe"],
      logo: "logo.png",
    } as unknown as Project;

    const doc = transformProject(project);
    expect(doc.id).toBe("123");
    expect(doc.type).toBe(SearchEntityType.project);
    expect(doc.title).toBe("Test Project");
    expect(doc.image).toBe("logo.png");
    expect(doc.searchable_text).toContain("Alice Bob");
    expect(doc.searchable_text).toContain("React Git");
  });

  it("transformProject handles missing optional arrays", () => {
    const project = {
      _id: mockObjectId("123"),
      name: "Test Project",
      slug: "test",
      shortDescription: "",
      longDescription: "",
      position: "",
    } as unknown as Project;

    const doc = transformProject(project);
    expect(doc.searchable_text).not.toContain("undefined");
  });

  it("transformAchievement formats correctly", () => {
    const achievement = {
      _id: mockObjectId("456"),
      title: "Saved 1M dollars",
      description: "Optimized AWS",
      solution: ["Lambda"],
      result: ["Money"],
      notes: ["Hard work"],
    } as unknown as Achievement;

    const doc = transformAchievement(achievement);
    expect(doc.id).toBe("456");
    expect(doc.type).toBe(SearchEntityType.achievement);
    expect(doc.searchable_text).toContain("Optimized AWS");
    expect(doc.searchable_text).toContain("Lambda");
  });

  it("transformFeedback formats correctly", () => {
    const feedback = {
      _id: mockObjectId("789"),
      section: "Frontend",
      author: "Jane",
      review: "Great job!",
    } as unknown as Feedback;

    const doc = transformFeedback(feedback);
    expect(doc.type).toBe(SearchEntityType.feedback);
    expect(doc.title).toBe("Feedback: Frontend");
    expect(doc.subtitle).toBe("Review by Jane");
    expect(doc.searchable_text).toBe("Great job!");
  });

  it("transformCompany formats correctly", () => {
    const company = {
      _id: mockObjectId("101"),
      name: "Tech Corp",
      position: "Engineer",
      location: { city: "NY", country: "USA" },
      positions: [{ title: "Junior" }, { title: "Senior" }],
      reasonsOfLeaving: ["Relocation"],
    } as unknown as Company;

    const doc = transformCompany(company);
    expect(doc.type).toBe(SearchEntityType.company);
    expect(doc.searchable_text).toContain("Junior, Senior");
    expect(doc.searchable_text).toContain("NY, USA");
    expect(doc.searchable_text).toContain("Relocation");
  });

  it("transformTechnology formats stacks correctly", () => {
    const tech = {
      _id: mockObjectId("202"),
      title: "React",
      category: "Frontend",
      type: "Library",
    } as unknown as Technology;

    const doc = transformTechnology(tech);
    expect(doc.type).toBe(SearchEntityType.technology);
    expect(doc.subtitle).toBe("Tech Stack • Frontend");
    expect(doc.searchable_text).toContain("React");
  });

  it("transformTechnology formats tools correctly", () => {
    const tech = {
      _id: mockObjectId("203"),
      title: "Jest",
      stack: "Testing",
      type: "Framework",
    } as unknown as Technology;

    const doc = transformTechnology(tech);
    expect(doc.subtitle).toBe("Tech Tool • Testing");
  });
});
