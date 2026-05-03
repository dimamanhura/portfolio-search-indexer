import {
  OpenSearchDocument,
  SearchItemType,
  Achievement,
  Technology,
  Feedback,
  Company,
  Project,
} from "./types";

export const transformProject = (project: Project): OpenSearchDocument => {
  const team = project.team?.join(" ") || "";
  const features = project.features?.join(" ") || "";
  const responsibilities = project.responsibilities?.join(" ") || "";
  const stacks = project.stacks?.join(" ") || "";
  const tools = project.tools?.join(" ") || "";
  const integrations = project.integrations?.join(" ") || "";

  return {
    id: project._id.toString(),
    type: SearchItemType.project,
    title: project.name,
    subtitle: project.shortDescription,
    url: `/projects/${project.slug}`,
    ...(project.logo && { image: project.logo }),
    searchable_text: `
      ${project.longDescription}
      Role: ${project.position}
      Features: ${features}
      Responsibilities: ${responsibilities}
      Team: ${team}
      Tech Stack: ${stacks} ${tools}
      Integrations: ${integrations}
    `
      .replace(/\s+/g, " ")
      .trim(),
  };
};

export const transformAchievement = (
  achievement: Achievement
): OpenSearchDocument => {
  const idStr = achievement._id.toString();

  return {
    id: idStr,
    type: SearchItemType.achievement,
    title: achievement.title || "",
    subtitle: "Project Achievement",
    url: `/achievements/?id=${idStr}`,
    searchable_text: `
      ${achievement.description || ""}
      Solution: ${achievement.solution?.join(", ") || ""}
      Result: ${achievement.result?.join(", ") || ""}
      Notes: ${achievement.notes?.join(", ") || ""}
    `
      .replace(/\s+/g, " ")
      .trim(),
  };
};

export const transformFeedback = (feedback: Feedback): OpenSearchDocument => {
  const idStr = feedback._id.toString();

  return {
    id: idStr,
    type: SearchItemType.feedback,
    title: `Feedback: ${feedback.section || "General"}`,
    subtitle: `Review by ${feedback.author}`,
    url: `/feedback/?id=${idStr}`,
    searchable_text: feedback.review || "",
  };
};

export const transformCompany = (company: Company): OpenSearchDocument => {
  const positions = company.positions?.map((p) => p.title).join(", ") || "";
  const reasons = company.reasonsOfLeaving?.join(", ") || "";

  return {
    id: company._id.toString(),
    type: SearchItemType.company,
    title: company.name,
    subtitle: `${company.position} at ${company.name} (${company.location.city}, ${company.location.country})`,
    ...(company.logo && { image: company.logo }),
    searchable_text: `
      Positions held: ${positions}
      Location: ${company.location.city}, ${company.location.country}
      Reasons for leaving: ${reasons}
    `
      .replace(/\s+/g, " ")
      .trim(),
  };
};

export const transformTechnology = (tech: Technology): OpenSearchDocument => {
  const isTool = tech.stack !== undefined;

  const baseSubtitle = isTool ? "Tech Tool" : "Tech Stack";
  const parentName = isTool ? tech.stack : tech.category;

  let subtitle = baseSubtitle;
  if (parentName) subtitle += ` • ${parentName}`;

  return {
    id: tech._id.toString(),
    type: SearchItemType.technology,
    title: tech.title,
    subtitle: subtitle,
    ...(tech.logo && { image: tech.logo }),
    searchable_text: `
      Technology: ${tech.title}
      Type: ${tech.type}
      Category/Stack: ${parentName || ""}
    `
      .replace(/\s+/g, " ")
      .trim(),
  };
};
