export type PostType = "LOST" | "FOUND";
export type PostStatus = "OPEN" | "MATCHED" | "RESOLVED" | "CLOSED" | "EXPIRED";
export type ClaimStatus = "PENDING" | "NEED_MORE_INFO" | "ACCEPTED" | "REJECTED" | "CANCELLED";
export type UserRole = "USER" | "STUDENT" | "LECTURER" | "STAFF" | "ADMIN";

export interface CampusLocation {
  campus: string;
  building: string;
  room?: string;
}

export interface LostFoundPostSummary {
  id: string;
  type: PostType;
  title: string;
  category: string;
  location: CampusLocation;
  status: PostStatus;
  reportedAt: string;
  matchScore?: number;
}
