export type View = "board" | "my-posts" | "create" | "handover" | "account" | "post-detail";
export type AuthMode = "login" | "register" | "forgot" | "reset";
export type AuthEntryMode = Extract<AuthMode, "login" | "register">;
export type AudienceRole = "STUDENT" | "LECTURER";
export type AdminTab = "overview" | "moderation" | "categories" | "locations" | "handover" | "warehouse" | "users" | "reports" | "feedback" | "config";

export type ChatMessageView = {
  id: string;
  sender: { id: string; fullName: string | null };
  content: string | null;
  mediaUrl: string | null;
  mediaPublicId: string | null;
  messageType: "TEXT" | "IMAGE" | "SYSTEM";
  isRead: boolean;
  createdAt: string;
};

export interface ImageUploadRules {
  allowedFormats: string[];
  maxImageSizeMb: number;
  maxImages: number;
}

export type AdminActionRunner = (task: () => Promise<unknown>) => void;
