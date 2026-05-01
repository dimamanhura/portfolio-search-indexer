import { OpenSearchDocument, SearchItemType, Achievement } from "./types";

export const transformAchievement = (
  achievement: Achievement
): OpenSearchDocument => ({
  id: achievement._id.toString(),
  type: SearchItemType.achievement,
  title: achievement.title || "",
  subtitle: achievement.description || "",
  searchable_text: `
    Solution: ${achievement.solution?.join(", ") || ""}
    Result: ${achievement.result?.join(", ") || ""}
    Notes: ${achievement.notes?.join(", ") || ""}
  `.trim(),
});
