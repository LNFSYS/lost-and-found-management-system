export const colors = {
  ink: "#172033",
  muted: "#667085",
  line: "#E6EAF0",
  surface: "#FFFFFF",
  canvas: "#F6F8FB",
  orange: "#F37021",
  orangeSoft: "#FFF1E8",
  green: "#2E9E44",
  greenSoft: "#EAF7EE",
  blue: "#0072BC",
  blueSoft: "#E8F3FB",
  red: "#D92D20",
  redSoft: "#FEEBE8",
  yellow: "#F7B500",
  shadow: "rgba(23, 32, 51, 0.14)"
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24
};

export function statusColor(status: string) {
  if (["OPEN", "ACTIVE", "PENDING", "PENDING_APPROVAL", "RECEIVED", "STORED"].includes(status)) {
    return { bg: colors.blueSoft, fg: colors.blue };
  }
  if (["MATCHED", "ACCEPTED", "CLAIMED", "HIGH_CONFIDENCE"].includes(status)) {
    return { bg: colors.greenSoft, fg: colors.green };
  }
  if (["REJECTED", "CANCELLED", "HIDDEN", "DISPOSED"].includes(status)) {
    return { bg: colors.redSoft, fg: colors.red };
  }
  return { bg: "#EEF2F6", fg: colors.muted };
}
