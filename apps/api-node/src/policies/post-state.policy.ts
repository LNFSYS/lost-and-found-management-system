import type { AccessTokenPayload } from "../middlewares/auth.middleware.js";
import type { PostStatus } from "../repositories/post.repository.js";
import { HttpError } from "../utils/http-error.js";

type MutablePostStatus = Exclude<PostStatus, "EXPIRED">;

const adminTransitions: Record<PostStatus, ReadonlySet<MutablePostStatus>> = {
  OPEN: new Set(["MATCHED", "RESOLVED", "CLOSED", "HIDDEN"]),
  MATCHED: new Set(["OPEN", "RESOLVED", "CLOSED", "HIDDEN"]),
  RESOLVED: new Set(["HIDDEN"]),
  CLOSED: new Set(["OPEN", "HIDDEN"]),
  EXPIRED: new Set(["OPEN", "CLOSED", "HIDDEN"]),
  HIDDEN: new Set(["OPEN", "CLOSED"])
};

const ownerTransitions: Record<PostStatus, ReadonlySet<MutablePostStatus>> = {
  OPEN: new Set(["CLOSED"]),
  MATCHED: new Set(["CLOSED"]),
  RESOLVED: new Set(),
  CLOSED: new Set(["OPEN"]),
  EXPIRED: new Set(),
  HIDDEN: new Set()
};

export function assertPostStatusTransition(input: {
  auth: AccessTokenPayload;
  ownerId: string;
  from: PostStatus;
  to: MutablePostStatus;
}) {
  const isAdmin = input.auth.roles.includes("ADMIN");
  const isOwner = input.auth.sub === input.ownerId;
  if (!isAdmin && !isOwner) {
    throw new HttpError(403, "You do not have permission to change this post status");
  }
  if (input.from === input.to) {
    return;
  }

  const allowed = (isAdmin ? adminTransitions : ownerTransitions)[input.from];
  if (!allowed.has(input.to)) {
    throw new HttpError(409, `Post status cannot transition from ${input.from} to ${input.to}`);
  }
}
