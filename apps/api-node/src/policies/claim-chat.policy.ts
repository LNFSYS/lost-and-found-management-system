export interface ClaimChatAccess {
  claimantId: string;
  postOwnerId: string;
  status: "PENDING" | "NEED_MORE_INFO" | "ACCEPTED" | "REJECTED" | "CANCELLED";
}

export function canAccessClaimRecord(claim: ClaimChatAccess, userId: string, roles: string[]) {
  return (
    roles.includes("ADMIN") ||
    roles.includes("STAFF") ||
    claim.claimantId === userId ||
    claim.postOwnerId === userId
  );
}

export function canUseClaimChatRecord(claim: ClaimChatAccess, userId: string, roles: string[]) {
  return claim.status === "ACCEPTED" && canAccessClaimRecord(claim, userId, roles);
}
