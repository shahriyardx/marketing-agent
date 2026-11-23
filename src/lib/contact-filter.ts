// Shared by the contacts list and bulk sends so "all matching" means the same.
export function buildContactWhere(search: string, campaignFilter: string) {
  const q = search.trim();
  return {
    ...(campaignFilter === "none"
      ? { lastCampaignSentId: null }
      : campaignFilter === "sent"
        ? { lastCampaignSentId: { not: null } }
        : campaignFilter !== "all"
          ? { lastCampaignSentId: campaignFilter }
          : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" as const } },
            { lastName: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}
