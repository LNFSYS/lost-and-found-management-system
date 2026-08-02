import type { RowDataPacket } from "mysql2";
import { dbPool } from "../config/db.js";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const ownerEmail = process.env.E2E_EMAIL ?? "adminlnf@gmail.com";
const ownerPassword = process.env.E2E_PASSWORD ?? "12345678";
const claimantEmail = process.env.E2E_FIRST_CLAIMANT_EMAIL ?? "stafflnf@gmail.com";
const claimantPassword = process.env.E2E_FIRST_CLAIMANT_PASSWORD ?? "12345678";

interface Envelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface Appointment {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "RESCHEDULED";
}

async function request<T>(path: string, init: RequestInit = {}, token?: string, expectedStatus = 200) {
  const response = await rawRequest(path, init, token);
  if (response.status !== expectedStatus || (expectedStatus < 400 && !response.payload.success)) {
    throw new Error(
      `${path} expected ${expectedStatus}, got ${response.status}: ${
        response.payload.message ?? response.payload.error ?? "unknown"
      }`
    );
  }
  return response.payload.data as T;
}

async function rawRequest(path: string, init: RequestInit = {}, token?: string) {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  return {
    status: response.status,
    payload: (await response.json().catch(() => ({}))) as Envelope<unknown>
  };
}

async function login(email: string, password: string) {
  const data = await request<{ tokens: { accessToken: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  return data.tokens.accessToken;
}

function assertSingleWinner(label: string, statuses: number[], successStatus = 200) {
  const successCount = statuses.filter((status) => status === successStatus).length;
  const conflictCount = statuses.filter((status) => status === 409).length;
  if (successCount !== 1 || conflictCount !== 1) {
    throw new Error(`${label}: expected one ${successStatus} winner and one 409 loser, got ${statuses.join(", ")}`);
  }
}

async function race(label: string, requests: Array<Promise<{ status: number }>>, successStatus = 200) {
  const results = await Promise.all(requests);
  const statuses = results.map((result) => result.status);
  assertSingleWinner(label, statuses, successStatus);
  return statuses;
}

async function assertSingleTransitionSideEffect(appointmentId: string, transitionTypes: [string, string]) {
  const [rows] = await dbPool.query<Array<RowDataPacket & { type: string; total: number }>>(
    `
      SELECT type, COUNT(*) AS total
      FROM notifications
      WHERE entity_type = 'APPOINTMENT'
        AND entity_id = ?
        AND type IN (?, ?)
      GROUP BY type
    `,
    [appointmentId, ...transitionTypes]
  );
  const notificationCount = rows.reduce((total, row) => total + Number(row.total), 0);
  if (rows.length !== 1 || notificationCount !== 2) {
    throw new Error(
      `${transitionTypes.join("-vs-")}: expected exactly one transition's two participant notifications, got ${JSON.stringify(
        rows
      )}`
    );
  }
}

async function findAvailableSlot(handoverPointId: string) {
  for (let daysAhead = 7; daysAhead <= 90; daysAhead += 1) {
    const proposedAt = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    const [rows] = await dbPool.query<Array<RowDataPacket & { total: number }>>(
      `
        SELECT COUNT(*) AS total
        FROM return_appointments
        WHERE handover_point_id = ?
          AND status IN ('PENDING', 'ACCEPTED', 'RESCHEDULED')
          AND proposed_at BETWEEN DATE_SUB(?, INTERVAL 30 MINUTE) AND DATE_ADD(?, INTERVAL 30 MINUTE)
      `,
      [handoverPointId, proposedAt, proposedAt]
    );
    if (Number(rows[0]?.total ?? 0) === 0) {
      return proposedAt.toISOString();
    }
  }
  throw new Error(`Could not find an available test slot for handover point ${handoverPointId}`);
}

async function cleanupStaleTestAppointments() {
  await dbPool.execute(
    `
      UPDATE return_appointments ra
      INNER JOIN posts p ON p.id = ra.post_id
      SET ra.status = 'CANCELLED',
          ra.cancellation_reason = 'Stale appointment concurrency smoke cleanup',
          ra.updated_at = UTC_TIMESTAMP()
      WHERE p.title LIKE 'e2e-appointment-race-%'
        AND p.deleted_at IS NOT NULL
        AND ra.status IN ('PENDING', 'ACCEPTED', 'RESCHEDULED')
    `
  );
}

async function main() {
  const ownerToken = await login(ownerEmail, ownerPassword);
  const claimantToken = await login(claimantEmail, claimantPassword);
  await cleanupStaleTestAppointments();
  const categories = await request<{ categories: Array<{ id: string }> }>("/categories", {}, ownerToken);
  const categoryId = categories.categories[0]?.id;
  if (!categoryId) {
    throw new Error("No category available for appointment concurrency smoke.");
  }

  const createdPostIds: string[] = [];
  const createdAppointmentIds: string[] = [];
  const marker = `e2e-appointment-race-${Date.now()}`;

  async function createAcceptedClaim(suffix: string) {
    const post = await request<{ post: { id: string } }>("/posts", {
      method: "POST",
      body: JSON.stringify({
        type: "FOUND",
        title: `${marker}-${suffix}`,
        description: `Appointment concurrency fixture ${suffix}`,
        categoryId,
        roomText: "E2E appointment race storage",
        contactInfo: "e2e@example.com",
        lostFoundAt: new Date(Date.now() - 20 * 60 * 1000).toISOString()
      })
    }, ownerToken, 201);
    createdPostIds.push(post.post.id);

    const claim = await request<{ claim: { id: string } }>("/claims", {
      method: "POST",
      body: JSON.stringify({
        postId: post.post.id,
        secretAnswer: `Private appointment race proof ${suffix}`,
        description: `Appointment race claim ${suffix}`,
        approximateLocation: "E2E race campus"
      })
    }, claimantToken, 201);
    await request(`/claims/${claim.claim.id}/accept`, { method: "PATCH" }, ownerToken);
    return claim.claim.id;
  }

  async function createAppointment(suffix: string, accepted = false) {
    const claimId = await createAcceptedClaim(suffix);
    const result = await request<{ appointment: Appointment }>("/appointments", {
      method: "POST",
      body: JSON.stringify({
        claimId,
        proposedAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        customLocation: `E2E appointment race location ${suffix}`
      })
    }, ownerToken, 201);
    createdAppointmentIds.push(result.appointment.id);
    if (accepted) {
      await request(`/appointments/${result.appointment.id}/accept`, { method: "PATCH" }, claimantToken);
    }
    return { claimId, appointmentId: result.appointment.id };
  }

  async function appointmentStatus(claimId: string) {
    const result = await request<{ appointments: Appointment[] }>(`/appointments/claim/${claimId}`, {}, ownerToken);
    const appointment = result.appointments[0];
    if (!appointment) {
      throw new Error(`No appointment found for claim ${claimId}`);
    }
    return appointment.status;
  }

  try {
    const acceptReject = await createAppointment("accept-reject");
    await race("accept-vs-reject", [
      rawRequest(`/appointments/${acceptReject.appointmentId}/accept`, { method: "PATCH" }, claimantToken),
      rawRequest(`/appointments/${acceptReject.appointmentId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: "Concurrent rejection" })
      }, ownerToken)
    ]);
    const acceptRejectStatus = await appointmentStatus(acceptReject.claimId);
    if (acceptRejectStatus !== "ACCEPTED" && acceptRejectStatus !== "REJECTED") {
      throw new Error(`accept-vs-reject left invalid status ${acceptRejectStatus}`);
    }
    await assertSingleTransitionSideEffect(acceptReject.appointmentId, ["APPOINTMENT_ACCEPTED", "APPOINTMENT_REJECTED"]);

    const completeCancel = await createAppointment("complete-cancel", true);
    await race("complete-vs-cancel", [
      rawRequest(`/appointments/${completeCancel.appointmentId}/complete`, { method: "PATCH" }, ownerToken),
      rawRequest(`/appointments/${completeCancel.appointmentId}/cancel`, {
        method: "PATCH",
        body: JSON.stringify({ reason: "Concurrent cancellation" })
      }, claimantToken)
    ]);
    const completeCancelStatus = await appointmentStatus(completeCancel.claimId);
    if (completeCancelStatus !== "COMPLETED" && completeCancelStatus !== "CANCELLED") {
      throw new Error(`complete-vs-cancel left invalid status ${completeCancelStatus}`);
    }
    await assertSingleTransitionSideEffect(completeCancel.appointmentId, ["APPOINTMENT_COMPLETED", "APPOINTMENT_CANCELLED"]);

    const rescheduleComplete = await createAppointment("reschedule-complete", true);
    await race("reschedule-vs-complete", [
      rawRequest(`/appointments/${rescheduleComplete.appointmentId}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({
          proposedAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          customLocation: "Concurrent reschedule location"
        })
      }, claimantToken),
      rawRequest(`/appointments/${rescheduleComplete.appointmentId}/complete`, { method: "PATCH" }, ownerToken)
    ]);
    const rescheduleCompleteStatus = await appointmentStatus(rescheduleComplete.claimId);
    if (rescheduleCompleteStatus !== "RESCHEDULED" && rescheduleCompleteStatus !== "COMPLETED") {
      throw new Error(`reschedule-vs-complete left invalid status ${rescheduleCompleteStatus}`);
    }
    await assertSingleTransitionSideEffect(rescheduleComplete.appointmentId, [
      "APPOINTMENT_RESCHEDULED",
      "APPOINTMENT_COMPLETED"
    ]);

    const handoverPoints = await request<{ handoverPoints: Array<{ id: string }> }>("/handover-points");
    const handoverPointId = handoverPoints.handoverPoints[0]?.id;
    if (!handoverPointId) {
      throw new Error("No active handover point available for slot conflict smoke.");
    }
    const [firstSlotClaimId, secondSlotClaimId] = await Promise.all([
      createAcceptedClaim("slot-first"),
      createAcceptedClaim("slot-second")
    ]);
    const proposedAt = await findAvailableSlot(handoverPointId);
    await race("slot-conflict", [
      rawRequest("/appointments", {
        method: "POST",
        body: JSON.stringify({ claimId: firstSlotClaimId, proposedAt, handoverPointId })
      }, ownerToken),
      rawRequest("/appointments", {
        method: "POST",
        body: JSON.stringify({ claimId: secondSlotClaimId, proposedAt, handoverPointId })
      }, ownerToken)
    ], 201);

    const slotStatuses = await Promise.all([
      request<{ appointments: Appointment[] }>(`/appointments/claim/${firstSlotClaimId}`, {}, ownerToken),
      request<{ appointments: Appointment[] }>(`/appointments/claim/${secondSlotClaimId}`, {}, ownerToken)
    ]);
    const createdSlotCount = slotStatuses.reduce((total, item) => total + item.appointments.length, 0);
    if (createdSlotCount !== 1) {
      throw new Error(`slot-conflict expected exactly one persisted appointment, got ${createdSlotCount}`);
    }
    const slotAppointment = slotStatuses.flatMap((item) => item.appointments)[0];
    if (slotAppointment) {
      createdAppointmentIds.push(slotAppointment.id);
    }

    console.log("Appointment concurrency smoke passed: accept/reject, complete/cancel, reschedule/complete, slot conflict.");
  } finally {
    await Promise.all(
      createdAppointmentIds.map((appointmentId) =>
        rawRequest(`/appointments/${appointmentId}/cancel`, {
          method: "PATCH",
          body: JSON.stringify({ reason: "Appointment concurrency smoke cleanup" })
        }, ownerToken).catch(() => undefined)
      )
    );
    await Promise.all(
      createdPostIds.map((postId) =>
        request(`/posts/${postId}`, { method: "DELETE" }, ownerToken).catch((error: unknown) => {
          console.warn(`Appointment race cleanup skipped for ${postId}: ${error instanceof Error ? error.message : "unknown"}`);
        })
      )
    );
    await dbPool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
