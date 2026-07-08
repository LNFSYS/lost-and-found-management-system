import type { Request, Response } from "express";
import { z } from "zod";
import { appointmentService } from "../services/appointment.service.js";
import { created, ok } from "../utils/api-response.js";
import { HttpError } from "../utils/http-error.js";

const appointmentSchema = z.object({
  claimId: z.string().uuid(),
  proposedAt: z.string().datetime(),
  handoverPointId: z.string().uuid().nullable().optional(),
  customLocation: z.string().trim().max(255).nullable().optional()
});
const rescheduleSchema = appointmentSchema.omit({ claimId: true });
const reminderSchema = z.object({
  hoursAhead: z.coerce.number().int().min(1).max(168).default(24)
});

const reasonSchema = z.object({
  reason: z.string().trim().min(2).max(500)
});
const feedbackSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).nullable().optional(),
  targetUserId: z.string().uuid().nullable().optional()
});
const proofSchema = z.object({
  note: z.string().trim().max(1000).nullable().optional()
});

function claimIdParam(request: Request) {
  const { claimId } = request.params;
  if (typeof claimId !== "string" || claimId.trim() === "") {
    throw new HttpError(400, "Missing claimId");
  }
  return claimId;
}

function appointmentIdParam(request: Request) {
  const { id } = request.params;
  if (typeof id !== "string" || id.trim() === "") {
    throw new HttpError(400, "Missing appointment id");
  }
  return id;
}

export const appointmentController = {
  async create(request: Request, response: Response) {
    response.status(201).json(created(await appointmentService.create(request.auth!, appointmentSchema.parse(request.body))));
  },

  async listByClaim(request: Request, response: Response) {
    response.json(ok(await appointmentService.listByClaim(request.auth!, claimIdParam(request))));
  },

  async accept(request: Request, response: Response) {
    response.json(ok(await appointmentService.accept(request.auth!, appointmentIdParam(request)), "Appointment accepted"));
  },

  async reject(request: Request, response: Response) {
    response.json(
      ok(
        await appointmentService.reject(request.auth!, appointmentIdParam(request), reasonSchema.parse(request.body).reason),
        "Appointment rejected"
      )
    );
  },

  async cancel(request: Request, response: Response) {
    response.json(
      ok(
        await appointmentService.cancel(request.auth!, appointmentIdParam(request), reasonSchema.parse(request.body).reason),
        "Appointment cancelled"
      )
    );
  },

  async reschedule(request: Request, response: Response) {
    response.json(
      ok(
        await appointmentService.reschedule(request.auth!, appointmentIdParam(request), rescheduleSchema.parse(request.body)),
        "Appointment rescheduled"
      )
    );
  },

  async complete(request: Request, response: Response) {
    response.json(ok(await appointmentService.complete(request.auth!, appointmentIdParam(request)), "Appointment completed"));
  },

  async feedback(request: Request, response: Response) {
    response
      .status(201)
      .json(created(await appointmentService.submitFeedback(request.auth!, appointmentIdParam(request), feedbackSchema.parse(request.body))));
  },

  async proof(request: Request, response: Response) {
    const input = proofSchema.parse(request.body);
    response
      .status(201)
      .json(created(await appointmentService.uploadProof(request.auth!, appointmentIdParam(request), request.file, input.note)));
  },

  async proofImage(request: Request, response: Response) {
    const { imageUrl } = await appointmentService.getProofImageUrl(request.auth!, appointmentIdParam(request));
    const upstream = await fetch(imageUrl);
    if (!upstream.ok) {
      throw new HttpError(502, "Unable to load appointment proof image");
    }
    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    const bytes = Buffer.from(await upstream.arrayBuffer());
    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", "private, no-store");
    response.send(bytes);
  },

  async remind(request: Request, response: Response) {
    const input = reminderSchema.parse(request.body);
    response.json(ok(await appointmentService.sendReminders(input.hoursAhead), "Appointment reminders sent"));
  }
};
