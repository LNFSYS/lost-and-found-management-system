import { z } from "zod";

export const radarEventTypeSchema = z.enum([
  "ACADEMIC",
  "SPORTS",
  "CULTURAL",
  "CAMPUS_OPERATIONS",
  "WEATHER",
  "OTHER"
]);

export const radarSourceTypeSchema = z.enum([
  "OFFICIAL_CALENDAR",
  "CAMPUS_NOTICE",
  "SECURITY_LOG",
  "WEATHER_BULLETIN"
]);

const sourceReferenceSchema = z.string().trim().min(3).max(255).refine((value) => {
  if (value.includes("@") || /(?:phone|email|contact)=/i.test(value)) {
    return false;
  }
  if (/^https:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return Boolean(url.hostname) && url.username === "" && url.password === "";
    } catch {
      return false;
    }
  }
  return /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{2,254}$/.test(value);
}, "Source reference must be an HTTPS URL or official bulletin identifier without contact data");

export const createRadarEventSchema = z.object({
  eventType: radarEventTypeSchema,
  sourceType: radarSourceTypeSchema,
  sourceReference: sourceReferenceSchema,
  areaId: z.string().uuid().nullable().optional(),
  buildingId: z.string().uuid().nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
}).strict().superRefine((input, context) => {
  const startsAt = new Date(input.startsAt).getTime();
  const endsAt = new Date(input.endsAt).getTime();
  const durationMs = endsAt - startsAt;
  const radarStepMs = 15 * 60 * 1000;

  if (durationMs < 60 * 60 * 1000 || durationMs > 24 * 60 * 60 * 1000) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endsAt"],
      message: "Campus radar events must last between 1 and 24 hours"
    });
  }
  if (startsAt % radarStepMs !== 0 || endsAt % radarStepMs !== 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["startsAt"],
      message: "Campus radar event times must align to 15-minute boundaries"
    });
  }
  if (input.buildingId && !input.areaId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["areaId"],
      message: "areaId is required when buildingId is provided"
    });
  }
  if (input.eventType === "WEATHER" && input.sourceType !== "WEATHER_BULLETIN") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sourceType"],
      message: "Weather events require an explicit WEATHER_BULLETIN source"
    });
  }
});

export const radarEventListQuerySchema = z.object({
  status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).strict();

export const radarAlertListQuerySchema = z.object({
  eventId: z.string().uuid().optional(),
  status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]).optional(),
  severity: z.enum(["WATCH", "WARNING", "CRITICAL"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
}).strict();

export const radarAlertStatusSchema = z.object({
  status: z.enum(["ACKNOWLEDGED", "RESOLVED", "DISMISSED"]),
  reason: z.enum(["REVIEWED_NO_ACTION", "MONITORING", "OPERATIONAL_FOLLOW_UP", "FALSE_POSITIVE"])
}).strict();

export type CreateRadarEventInput = z.infer<typeof createRadarEventSchema>;
export type RadarEventListQuery = z.infer<typeof radarEventListQuerySchema>;
export type RadarAlertListQuery = z.infer<typeof radarAlertListQuerySchema>;
export type RadarAlertStatusInput = z.infer<typeof radarAlertStatusSchema>;
