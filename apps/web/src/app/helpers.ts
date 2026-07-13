import type { AdminWarehouseItem, AdminWarehouseStatus, BoardPost, Category, PostMatchSuggestion, PublicConfigEntry } from "../services/api";
import { warehouseStatusLabels } from "./constants";
import type { ImageUploadRules, View } from "./types";

export function matchSuggestionsSignature(suggestions: PostMatchSuggestion[]) {
  return suggestions
    .map((suggestion) => `${suggestion.sourcePostId ?? "unknown"}:${suggestion.match.id}:${suggestion.post.id}`)
    .sort()
    .join("|");
}

export function viewTitle(view: View) {
  const titles: Record<View, string> = {
    board: "Bảng Lost & Found",
    "my-posts": "Tin của tôi",
    create: "Đăng tin mới",
    handover: "Điểm bàn giao",
    account: "Tài khoản",
    "post-detail": "Chi tiết bài đăng"
  };
  return titles[view];
}

export function getImageUploadRules(entries: PublicConfigEntry[] | undefined): ImageUploadRules {
  const map = new Map((entries ?? []).map((entry) => [entry.key, entry.value]));
  const allowedFormats = String(map.get("post.allowed_image_formats") ?? "jpg,png,webp")
    .split(",")
    .map((format) => format.trim().toLowerCase())
    .filter(Boolean);
  const maxImageSizeMb = Number(map.get("post.max_image_size_mb") ?? 10);
  const maxImages = Number(map.get("post.max_images") ?? 5);

  return {
    allowedFormats: allowedFormats.length > 0 ? allowedFormats : ["jpg", "png", "webp"],
    maxImageSizeMb: Number.isFinite(maxImageSizeMb) && maxImageSizeMb > 0 ? maxImageSizeMb : 10,
    maxImages: Number.isFinite(maxImages) && maxImages > 0 ? maxImages : 5
  };
}

export function acceptAttribute(rules: ImageUploadRules) {
  return rules.allowedFormats.map((format) => `image/${format === "jpg" ? "jpeg" : format}`).join(",");
}

export function formText(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}

export function formNullable(data: FormData, key: string) {
  const value = formText(data, key);
  return value === "" ? null : value;
}

export function formNumber(data: FormData, key: string) {
  const value = Number(data.get(key) ?? 0);
  return Number.isFinite(value) ? value : 0;
}

export function validateImageFiles(files: File[], rules: ImageUploadRules, maxFiles: number) {
  const errors: string[] = [];
  if (files.length > maxFiles) {
    errors.push(`Chỉ được chọn tối đa ${maxFiles} ảnh.`);
  }

  for (const file of files) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const normalizedExtension = extension === "jpeg" ? "jpg" : extension;
    const typeFormat = file.type.replace("image/", "").replace("jpeg", "jpg").toLowerCase();
    const allowed = rules.allowedFormats.includes(normalizedExtension) || rules.allowedFormats.includes(typeFormat);
    if (!allowed) {
      errors.push(`${file.name} không đúng định dạng ${rules.allowedFormats.join(", ").toUpperCase()}.`);
    }
    if (file.size > rules.maxImageSizeMb * 1024 * 1024) {
      errors.push(`${file.name} vượt quá ${rules.maxImageSizeMb}MB.`);
    }
  }

  return errors;
}

export function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function storageLocationText(post: BoardPost) {
  if (post.handoverPoint?.name) {
    return `Điểm bàn giao: ${post.handoverPoint.name}`;
  }
  const exactLocation = [post.location.areaName, post.location.buildingName, post.location.roomName].filter(Boolean).join(", ");
  return exactLocation || post.location.customLocation || "Chưa có vị trí lưu trữ cụ thể";
}

export function locationText(post: BoardPost) {
  return (
    post.location.customLocation ||
    [post.location.areaName, post.location.buildingName, post.location.roomName].filter(Boolean).join(", ") ||
    post.handoverPoint?.name ||
    "Chưa rõ vị trí"
  );
}

export function categorySelectOptions(categories: Category[]) {
  const roots = categories.filter((category) => !category.parentId);
  const options: Array<{ id: string; label: string }> = [];

  for (const root of roots) {
    const children = categories.filter((category) => category.parentId === root.id);
    options.push({
      id: root.id,
      label: children.length > 0 ? `${root.name} (tất cả)` : root.name
    });
    for (const child of children) {
      options.push({ id: child.id, label: `- ${child.name}` });
    }
  }

  for (const category of categories) {
    if (category.parentId && !categories.some((parent) => parent.id === category.parentId)) {
      options.push({ id: category.id, label: category.name });
    }
  }

  return options;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function avatarInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2);
  return (initials || "U").toUpperCase();
}

export function warehouseStatusLabel(status: AdminWarehouseStatus) {
  return warehouseStatusLabels[status] ?? status;
}

export function warehouseLocationText(item: AdminWarehouseItem) {
  return (
    item.location.roomText ||
    [item.location.areaName, item.location.buildingName].filter(Boolean).join(", ") ||
    item.handoverPoint?.name ||
    "Chưa rõ vị trí kho"
  );
}

export function dateTimeLocalInputValue(value: string | undefined) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export function emptyToNull(value: FormDataEntryValue | null) {
  const text = value?.toString().trim() ?? "";
  return text.length > 0 ? text : null;
}

export function toDateTimeIso(value: FormDataEntryValue | null) {
  const text = value?.toString();
  return text ? new Date(text).toISOString() : null;
}

export function dateToIso(value: string, edge: "start" | "end") {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}T${edge === "start" ? "00:00:00" : "23:59:59"}`).toISOString();
}

export function dateInputValue(value: string | undefined) {
  return value ? value.slice(0, 10) : "";
}

export function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    fullName: "Họ tên",
    email: "Email",
    studentCode: "Mã sinh viên",
    password: "Mật khẩu",
    newPassword: "Mật khẩu mới",
    otp: "OTP"
  };
  return labels[field] ?? field;
}
