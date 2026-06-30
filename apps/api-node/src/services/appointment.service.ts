import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { appointmentRepository, type AppointmentInput } from "../repositories/appointment.repository.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { HttpError } from "../utils/http-error.js";

function canUseClaim(auth: AccessTokenPayload, claim: { claimant_id: string; post_owner_id: string }) {
  return (
    auth.sub === claim.claimant_id ||
    auth.sub === claim.post_owner_id ||
    auth.roles.includes("STAFF") ||
    auth.roles.includes("ADMIN")
  );
}

function assertCanUseAppointment(auth: AccessTokenPayload, appointment: { claimant_id: string; post_owner_id: string }) {
  if (!canUseClaim(auth, appointment)) {
    throw new HttpError(403, "You do not have permission to manage this appointment");
  }
}

async function requireAppointmentForAction(appointmentId: string) {
  const appointment = await appointmentRepository.findForAction(appointmentId);
  if (!appointment) {
    throw new HttpError(404, "Appointment not found");
  }
  return appointment;
}

async function notifyAppointmentUsers(
  appointment: { claimant_id: string; post_owner_id: string; id: string },
  type: string,
  title: string,
  body: string
) {
  await notificationRepository.createMany([
    {
      userId: appointment.claimant_id,
      type,
      title,
      body,
      entityType: "APPOINTMENT",
      entityId: appointment.id
    },
    {
      userId: appointment.post_owner_id,
      type,
      title,
      body,
      entityType: "APPOINTMENT",
      entityId: appointment.id
    }
  ]);
}

export const appointmentService = {
  async create(auth: AccessTokenPayload, input: AppointmentInput) {
    const claim = await appointmentRepository.findClaimForAppointment(input.claimId);
    if (!claim) {
      throw new HttpError(404, "Claim not found");
    }
    if (!canUseClaim(auth, claim)) {
      throw new HttpError(403, "You do not have permission to schedule this claim");
    }
    if (claim.status !== "ACCEPTED") {
      throw new HttpError(409, "Appointments can only be created after a claim is accepted");
    }
    if (!input.handoverPointId && !input.customLocation?.trim()) {
      throw new HttpError(422, "Choose a handover point or enter a custom return location");
    }
    if (input.handoverPointId && !(await appointmentRepository.activeHandoverPointExists(input.handoverPointId))) {
      throw new HttpError(422, "Handover point does not exist or is inactive");
    }
    const proposedAt = new Date(input.proposedAt);
    if (Number.isNaN(proposedAt.getTime()) || proposedAt.getTime() <= Date.now()) {
      throw new HttpError(422, "Appointment time must be in the future");
    }
    if (await appointmentRepository.hasScheduleConflict(input)) {
      throw new HttpError(409, "This handover point already has another appointment near that time");
    }
    const appointment = await appointmentRepository.create(input, auth.sub);
    if (!appointment) {
      throw new HttpError(404, "Claim not found");
    }
    await notifyAppointmentUsers(
      {
        ...claim,
        id: appointment.id
      },
      "APPOINTMENT_CREATED",
      "Lịch hẹn bàn giao mới",
      "Một lịch hẹn bàn giao vừa được tạo. Hãy kiểm tra và xác nhận thời gian phù hợp."
    );
    return { appointment };
  },

  async listByClaim(auth: AccessTokenPayload, claimId: string) {
    const claim = await appointmentRepository.findClaimForAppointment(claimId);
    if (!claim) {
      throw new HttpError(404, "Claim not found");
    }
    if (!canUseClaim(auth, claim)) {
      throw new HttpError(403, "You do not have permission to view appointments for this claim");
    }
    return { appointments: await appointmentRepository.listByClaim(claimId) };
  },

  async accept(auth: AccessTokenPayload, appointmentId: string) {
    const appointment = await requireAppointmentForAction(appointmentId);
    assertCanUseAppointment(auth, appointment);
    if (appointment.status !== "PENDING" && appointment.status !== "RESCHEDULED") {
      throw new HttpError(409, "Only pending or rescheduled appointments can be accepted");
    }
    const updated = await appointmentRepository.accept(appointmentId);
    await notifyAppointmentUsers(
      { ...appointment, id: appointmentId },
      "APPOINTMENT_ACCEPTED",
      "Lịch hẹn đã được xác nhận",
      "Lịch hẹn bàn giao đã được xác nhận. Vui lòng đến đúng thời gian và địa điểm đã hẹn."
    );
    return { appointment: updated };
  },

  async reject(auth: AccessTokenPayload, appointmentId: string, reason: string) {
    const appointment = await requireAppointmentForAction(appointmentId);
    assertCanUseAppointment(auth, appointment);
    if (appointment.status !== "PENDING" && appointment.status !== "RESCHEDULED") {
      throw new HttpError(409, "Only pending or rescheduled appointments can be rejected");
    }
    const updated = await appointmentRepository.reject(appointmentId, reason.trim());
    await notifyAppointmentUsers(
      { ...appointment, id: appointmentId },
      "APPOINTMENT_REJECTED",
      "Lịch hẹn bị từ chối",
      reason.trim()
    );
    return { appointment: updated };
  },

  async cancel(auth: AccessTokenPayload, appointmentId: string, reason: string) {
    const appointment = await requireAppointmentForAction(appointmentId);
    assertCanUseAppointment(auth, appointment);
    if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED" || appointment.status === "REJECTED") {
      throw new HttpError(409, "This appointment can no longer be cancelled");
    }
    const updated = await appointmentRepository.cancel(appointmentId, reason.trim());
    await notifyAppointmentUsers(
      { ...appointment, id: appointmentId },
      "APPOINTMENT_CANCELLED",
      "Lịch hẹn đã bị hủy",
      reason.trim()
    );
    return { appointment: updated };
  },

  async reschedule(auth: AccessTokenPayload, appointmentId: string, input: Omit<AppointmentInput, "claimId">) {
    const appointment = await requireAppointmentForAction(appointmentId);
    assertCanUseAppointment(auth, appointment);
    if (appointment.status === "COMPLETED" || appointment.status === "CANCELLED" || appointment.status === "REJECTED") {
      throw new HttpError(409, "This appointment can no longer be rescheduled");
    }
    if (!input.handoverPointId && !input.customLocation?.trim()) {
      throw new HttpError(422, "Choose a handover point or enter a custom return location");
    }
    if (input.handoverPointId && !(await appointmentRepository.activeHandoverPointExists(input.handoverPointId))) {
      throw new HttpError(422, "Handover point does not exist or is inactive");
    }
    const proposedAt = new Date(input.proposedAt);
    if (Number.isNaN(proposedAt.getTime()) || proposedAt.getTime() <= Date.now()) {
      throw new HttpError(422, "Appointment time must be in the future");
    }
    if (await appointmentRepository.hasScheduleConflict({ ...input, appointmentId })) {
      throw new HttpError(409, "This handover point already has another appointment near that time");
    }
    const updated = await appointmentRepository.reschedule(appointmentId, input);
    await notifyAppointmentUsers(
      { ...appointment, id: appointmentId },
      "APPOINTMENT_RESCHEDULED",
      "Lịch hẹn đã được đổi",
      "Lịch hẹn bàn giao vừa được đề xuất lại. Hãy kiểm tra và xác nhận nếu thời gian phù hợp."
    );
    return { appointment: updated };
  },

  async complete(auth: AccessTokenPayload, appointmentId: string) {
    const appointment = await requireAppointmentForAction(appointmentId);
    assertCanUseAppointment(auth, appointment);
    if (appointment.status !== "ACCEPTED") {
      throw new HttpError(409, "Only accepted appointments can be completed");
    }
    const completed = await appointmentRepository.complete(appointmentId);
    await userRepository.addReputation({
      userId: appointment.claimant_id,
      delta: 10,
      reason: "Successful item claim",
      entityType: "CLAIM",
      entityId: appointment.claim_id
    });
    await userRepository.addReputation({
      userId: appointment.post_owner_id,
      delta: 5,
      reason: "Successful item return",
      entityType: "POST",
      entityId: appointment.post_id
    });
    await notifyAppointmentUsers(
      { ...appointment, id: appointmentId },
      "APPOINTMENT_COMPLETED",
      "Ban giao da hoan tat",
      "Lịch hẹn bàn giao đã hoàn tất. Bài đăng và kho được cập nhật theo trạng thái mới."
    );
    return { appointment: completed };
  },

  async sendReminders(hoursAhead = 24) {
    const targets = await appointmentRepository.listUpcomingReminderTargets(hoursAhead);
    for (const appointment of targets) {
      await notifyAppointmentUsers(
        {
          id: appointment.id,
          claimant_id: appointment.claimant_id,
          post_owner_id: appointment.post_owner_id
        },
        "APPOINTMENT_REMINDER",
        "Sắp đến lịch bàn giao",
        `Lịch bàn giao sắp diễn ra vào ${appointment.proposed_at}. Hãy kiểm tra lại địa điểm và mang theo bằng chứng cần thiết.`
      );
    }
    return { reminded: targets.length };
  }
};
