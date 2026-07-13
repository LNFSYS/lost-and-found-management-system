import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import { appointmentRepository, type AppointmentInput } from "../repositories/appointment.repository.js";
import { feedbackRepository } from "../repositories/feedback.repository.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { postRepository } from "../repositories/post.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { HttpError } from "../utils/http-error.js";
import { cloudinaryService } from "./cloudinary.service.js";

const proofMimeToFormat = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);

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

function requireProofFile(file: Express.Multer.File | undefined) {
  if (!file) {
    throw new HttpError(400, "Missing uploaded file field: proof");
  }
  return file;
}

async function assertProofImageFile(file: Express.Multer.File) {
  const format = proofMimeToFormat.get(file.mimetype);
  if (!format) {
    throw new HttpError(422, "Only JPG, PNG and WEBP proof images are allowed");
  }

  const allowedFormats = (await postRepository.getConfigString("post.allowed_image_formats", "jpg,png,webp"))
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!allowedFormats.includes(format)) {
    throw new HttpError(422, `Image format ${format} is not allowed by current config`);
  }

  const maxImageSizeMb = await postRepository.getConfigNumber("post.max_image_size_mb", 10);
  if (file.size > maxImageSizeMb * 1024 * 1024) {
    throw new HttpError(422, `Image size exceeds ${maxImageSizeMb} MB`);
  }
}

function appointmentNotificationText(type: string, title: string, body: string) {
  if (type === "APPOINTMENT_CREATED") {
    return {
      title: "Lịch hẹn bàn giao mới",
      body: "Một lịch hẹn bàn giao vừa được tạo. Hãy kiểm tra và xác nhận thời gian phù hợp."
    };
  }
  if (type === "APPOINTMENT_ACCEPTED") {
    return {
      title: "Lịch hẹn đã được xác nhận",
      body: "Lịch hẹn bàn giao đã được xác nhận. Vui lòng đến đúng thời gian và địa điểm đã hẹn."
    };
  }
  if (type === "APPOINTMENT_REJECTED") {
    return { title: "Lịch hẹn bị từ chối", body };
  }
  if (type === "APPOINTMENT_CANCELLED") {
    return { title: "Lịch hẹn đã bị hủy", body };
  }
  if (type === "APPOINTMENT_RESCHEDULED") {
    return {
      title: "Lịch hẹn đã được đổi",
      body: "Lịch hẹn bàn giao vừa được đề xuất lại. Hãy kiểm tra và xác nhận nếu thời gian phù hợp."
    };
  }
  if (type === "APPOINTMENT_COMPLETED") {
    return {
      title: "Bàn giao đã hoàn tất",
      body: "Lịch hẹn bàn giao đã hoàn tất. Bài đăng và kho được cập nhật theo trạng thái mới."
    };
  }
  if (type === "APPOINTMENT_REMINDER") {
    return {
      title: "Sắp đến lịch bàn giao",
      body: "Lịch bàn giao sắp diễn ra. Hãy kiểm tra lại địa điểm và mang theo bằng chứng cần thiết."
    };
  }
  return { title, body };
}

async function notifyAppointmentUsers(
  appointment: { claimant_id: string; post_owner_id: string; id: string },
  type: string,
  title: string,
  body: string
) {
  const normalized = appointmentNotificationText(type, title, body);
  await notificationRepository.createMany([
    {
      userId: appointment.claimant_id,
      type,
      title: normalized.title,
      body: normalized.body,
      entityType: "APPOINTMENT",
      entityId: appointment.id
    },
    {
      userId: appointment.post_owner_id,
      type,
      title: normalized.title,
      body: normalized.body,
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
      "Bàn giao đã hoàn tất",
      "Lịch hẹn bàn giao đã hoàn tất. Bài đăng và kho được cập nhật theo trạng thái mới."
    );
    return { appointment: completed };
  },

  async uploadProof(
    auth: AccessTokenPayload,
    appointmentId: string,
    file: Express.Multer.File | undefined,
    note?: string | null
  ) {
    const appointment = await requireAppointmentForAction(appointmentId);
    assertCanUseAppointment(auth, appointment);
    if (appointment.status !== "ACCEPTED" && appointment.status !== "COMPLETED") {
      throw new HttpError(409, "Proof can only be uploaded for accepted or completed appointments");
    }

    const image = requireProofFile(file);
    await assertProofImageFile(image);

    const uploaded = await cloudinaryService.uploadImage(image.buffer, `lnfs/private/appointment-proofs/${appointmentId}`);
    const updated = await appointmentRepository.saveProof(appointmentId, {
      imageUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
      uploadedBy: auth.sub,
      note
    });
    if (!updated) {
      throw new HttpError(404, "Appointment not found");
    }

    if (appointment.proof_public_id) {
      try {
        await cloudinaryService.deleteAsset(appointment.proof_public_id);
      } catch (error) {
        console.warn(`Failed to delete replaced appointment proof: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }

    await userRepository.createActivityLog({
      userId: auth.sub,
      action: "APPOINTMENT_PROOF_UPLOADED",
      entityType: "APPOINTMENT",
      entityId: appointmentId,
      metadata: {
        publicId: uploaded.publicId,
        bytes: uploaded.bytes ?? null
      }
    });
    await notifyAppointmentUsers(
      { ...appointment, id: appointmentId },
      "APPOINTMENT_PROOF_UPLOADED",
      "Đã tải chứng từ bàn giao",
      "Lịch hẹn vừa được cập nhật ảnh chứng từ bàn giao. Bạn có thể kiểm tra trong chi tiết yêu cầu nhận đồ."
    );

    return { appointment: updated };
  },

  async getProofImageUrl(auth: AccessTokenPayload, appointmentId: string) {
    const appointment = await requireAppointmentForAction(appointmentId);
    assertCanUseAppointment(auth, appointment);
    if (!appointment.proof_image_url) {
      throw new HttpError(404, "Appointment proof image not found");
    }
    return { imageUrl: appointment.proof_image_url };
  },

  async submitFeedback(
    auth: AccessTokenPayload,
    appointmentId: string,
    input: { rating: number; comment?: string | null; targetUserId?: string | null }
  ) {
    const appointment = await feedbackRepository.findAppointmentContext(appointmentId);
    if (!appointment) {
      throw new HttpError(404, "Appointment not found");
    }

    const isClaimant = auth.sub === appointment.claimant_id;
    const isPostOwner = auth.sub === appointment.post_owner_id;
    const isStaffOrAdmin = auth.roles.includes("STAFF") || auth.roles.includes("ADMIN");
    if (!isClaimant && !isPostOwner && !isStaffOrAdmin) {
      throw new HttpError(403, "You do not have permission to review this appointment");
    }
    if (appointment.status !== "COMPLETED") {
      throw new HttpError(409, "Feedback can only be submitted after the handover is completed");
    }

    const participantIds = new Set([appointment.claimant_id, appointment.post_owner_id]);
    const targetUserId = input.targetUserId?.trim() || (isClaimant ? appointment.post_owner_id : isPostOwner ? appointment.claimant_id : null);
    if (!targetUserId) {
      throw new HttpError(422, "Choose a participant to review");
    }
    if (targetUserId === auth.sub) {
      throw new HttpError(422, "You cannot review yourself");
    }
    if (!participantIds.has(targetUserId)) {
      throw new HttpError(422, "Feedback target must be one of the appointment participants");
    }

    const existing = await feedbackRepository.findByAppointmentAndReviewer(appointmentId, auth.sub);
    if (existing) {
      throw new HttpError(409, "You already submitted feedback for this appointment");
    }

    const feedback = await feedbackRepository.createReturnFeedback({
      appointmentId,
      claimId: appointment.claim_id,
      postId: appointment.post_id,
      reviewerId: auth.sub,
      targetUserId,
      rating: input.rating,
      comment: input.comment
    });

    await notificationRepository.create({
      userId: targetUserId,
      type: "RETURN_FEEDBACK_RECEIVED",
      title: "Có feedback sau bàn giao",
      body: `Bạn vừa nhận được đánh giá ${input.rating}/5 sau lịch bàn giao.`,
      entityType: "APPOINTMENT",
      entityId: appointmentId
    });

    return { feedback };
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
