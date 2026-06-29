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

  async remind(request: Request, response: Response) {
    const input = reminderSchema.parse(request.body);
    response.json(ok(await appointmentService.sendReminders(input.hoursAhead), "Appointment reminders sent"));
  }
};
