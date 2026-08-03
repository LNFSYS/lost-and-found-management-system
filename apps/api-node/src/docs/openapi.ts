const uuidPathParameter = (name: string) => ({
  name,
  in: "path",
  required: true,
  schema: { type: "string", format: "uuid" }
});

const jsonRequestBody = (schema: Record<string, unknown>) => ({
  required: true,
  content: { "application/json": { schema } }
});

function withPathParameters<T extends { paths: Record<string, Record<string, unknown>> }>(document: T): T {
  for (const [path, pathItem] of Object.entries(document.paths)) {
    const names = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
    if (names.length === 0) continue;
    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== "object") continue;
      const mutableOperation = operation as { parameters?: Array<Record<string, unknown>> };
      const parameters = mutableOperation.parameters ? [...mutableOperation.parameters] : [];
      for (const name of names) {
        if (!parameters.some((parameter) => parameter.in === "path" && parameter.name === name)) {
          parameters.push(uuidPathParameter(name));
        }
      }
      mutableOperation.parameters = parameters;
    }
  }
  return document;
}

export const openApiDocument = withPathParameters({
  openapi: "3.0.3",
  info: {
    title: "FPTU Lost & Found Node API",
    version: "0.1.0"
  },
  servers: [{ url: "http://localhost:3001/api" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Process liveness check",
        responses: { "200": { description: "Service status" } }
      }
    },
    "/health/live": {
      get: {
        summary: "Process liveness check for orchestrators",
        responses: { "200": { description: "Process is alive" } }
      }
    },
    "/health/ready": {
      get: {
        summary: "Dependency-aware readiness check for database, matching queue and optional Redis",
        responses: {
          "200": { description: "Service is ready" },
          "503": { description: "One or more required dependencies are unavailable" }
        }
      }
    },
    "/metrics": {
      get: {
        summary: "Prometheus-compatible operational metrics",
        responses: {
          "200": { description: "Metrics text" },
          "403": { description: "Invalid metrics token" },
          "404": { description: "Metrics are hidden in production when no token is configured" }
        }
      }
    },
    "/auth/register": {
      post: {
        summary: "Register account after validating registration OTP",
        responses: { "201": { description: "Registration completed" } }
      }
    },
    "/auth/register/request-otp": {
      post: {
        summary: "Send registration OTP before account creation",
        responses: { "200": { description: "Registration OTP sent" } }
      }
    },
    "/auth/verify-otp": {
      post: {
        summary: "Verify registration OTP",
        responses: { "200": { description: "Email verified and token pair issued" } }
      }
    },
    "/auth/resend-otp": {
      post: {
        summary: "Resend registration OTP for a pending account",
        responses: { "200": { description: "Verification OTP resent" } }
      }
    },
    "/auth/login": {
      post: {
        summary: "Login with email and password",
        responses: { "200": { description: "Token pair issued" } }
      }
    },
    "/auth/google": {
      get: {
        summary: "Start Google OAuth login",
        responses: { "302": { description: "Redirect to Google OAuth consent" } }
      }
    },
    "/auth/google/callback": {
      get: {
        summary: "Google OAuth callback; issues Node JWT tokens and redirects to the web app",
        responses: { "302": { description: "Redirect to web app with OAuth result in URL fragment" } }
      }
    },
    "/auth/forgot-password": {
      post: {
        summary: "Request password reset OTP",
        responses: { "200": { description: "Password reset OTP requested" } }
      }
    },
    "/auth/reset-password": {
      post: {
        summary: "Reset password with OTP",
        responses: { "200": { description: "Password reset successful" } }
      }
    },
    "/auth/refresh": {
      post: {
        summary: "Rotate refresh token",
        responses: { "200": { description: "New token pair issued" } }
      }
    },
    "/auth/logout": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Revoke refresh token",
        responses: { "200": { description: "Refresh token revoked" } }
      }
    },
    "/auth/me": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Get current user",
        responses: { "200": { description: "Current user" } }
      }
    },
    "/auth/profile": {
      put: {
        security: [{ bearerAuth: [] }],
        summary: "Update current user profile",
        responses: { "200": { description: "Updated profile" } }
      }
    },
    "/auth/avatar": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Upload current user avatar",
        responses: { "200": { description: "Avatar uploaded" } }
      }
    },
    "/auth/activity": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Get current user activity",
        responses: { "200": { description: "Activity list" } }
      }
    },
    "/auth/reputation": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Get current user reputation",
        responses: { "200": { description: "Reputation summary" } }
      }
    },
    "/admin/dashboard/overview": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Admin dashboard overview metrics",
        responses: { "200": { description: "Admin overview" } }
      }
    },
    "/admin/dashboard/export.csv": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Export dashboard overview metrics as CSV",
        responses: { "200": { description: "Dashboard CSV export" } }
      }
    },
    "/admin/jobs/expire-posts": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Expire overdue posts",
        responses: { "200": { description: "Expired post count" } }
      }
    },
    "/admin/config": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Admin list all system configuration entries",
        responses: { "200": { description: "System config list" } }
      }
    },
    "/admin/config/history": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Admin list system configuration change history",
        responses: { "200": { description: "System config history" } }
      }
    },
    "/admin/config/{key}": {
      put: {
        security: [{ bearerAuth: [] }],
        summary: "Admin update a typed system configuration entry",
        responses: { "200": { description: "System config updated" } }
      }
    },
    "/admin/config/history/{id}/rollback": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Admin rollback a system configuration change",
        responses: { "200": { description: "System config rolled back" } }
      }
    },
    "/admin/users": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Admin list users",
        responses: { "200": { description: "User list" } }
      }
    },
    "/admin/categories": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Admin list categories",
        responses: { "200": { description: "Category list" } }
      },
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Admin create category",
        responses: { "201": { description: "Category created" } }
      }
    },
    "/admin/locations/areas": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Admin list campus areas",
        responses: { "200": { description: "Area list" } }
      },
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Admin create campus area",
        responses: { "201": { description: "Area created" } }
      }
    },
    "/admin/locations/buildings": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Admin list campus buildings",
        responses: { "200": { description: "Building list" } }
      },
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Admin create campus building",
        responses: { "201": { description: "Building created" } }
      }
    },
    "/admin/handover-points": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Admin list handover points",
        responses: { "200": { description: "Handover point list" } }
      },
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Admin create handover point",
        responses: { "201": { description: "Handover point created" } }
      }
    },
    "/admin/warehouse-items/expire-overdue": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Mark overdue warehouse items as expired",
        responses: { "200": { description: "Overdue items expired" } }
      }
    },
    "/admin/warehouse-items/export.csv": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Export warehouse items as CSV",
        responses: { "200": { description: "Warehouse CSV export" } }
      }
    },
    "/admin/warehouse/capacity": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Get warehouse capacity snapshot",
        responses: { "200": { description: "Warehouse capacity" } }
      }
    },
    "/admin/warehouse/alert-capacity": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Send warehouse capacity warning if threshold is reached",
        responses: { "200": { description: "Capacity alert result" } }
      }
    },
    "/admin/warehouse-items/alert-near-expiry": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Send near-expiry alerts for warehouse items",
        responses: { "200": { description: "Near-expiry alert result" } }
      }
    },
    "/admin/warehouse-items/{id}/process": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Process an expired warehouse item as disposed, donated, or transferred",
        responses: { "200": { description: "Expired item processed" } }
      }
    },
    "/admin/return-feedback": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Staff/Admin list feedback submitted after completed handovers",
        responses: { "200": { description: "Return feedback list" } }
      }
    },
    "/admin/return-feedback/{id}/review": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Admin review or flag return feedback",
        responses: { "200": { description: "Return feedback reviewed" } }
      }
    },
    "/admin/radar/events": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Staff/Admin list sourced campus events for LOST Radar",
        responses: { "200": { description: "Campus Radar event list" } }
      },
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Admin create a sourced campus event",
        requestBody: jsonRequestBody({
          type: "object",
          required: ["eventType", "sourceType", "sourceReference", "startsAt", "endsAt"],
          properties: {
            eventType: { type: "string", enum: ["ACADEMIC", "SPORTS", "CULTURAL", "CAMPUS_OPERATIONS", "WEATHER", "OTHER"] },
            sourceType: { type: "string", enum: ["OFFICIAL_CALENDAR", "CAMPUS_NOTICE", "SECURITY_LOG", "WEATHER_BULLETIN"] },
            sourceReference: { type: "string", minLength: 3, maxLength: 255 },
            areaId: { type: "string", format: "uuid", nullable: true },
            buildingId: { type: "string", format: "uuid", nullable: true },
            startsAt: { type: "string", format: "date-time" },
            endsAt: { type: "string", format: "date-time" }
          }
        }),
        responses: { "201": { description: "Campus Radar event created" }, "403": { description: "Admin required" } }
      }
    },
    "/admin/radar/events/{id}/analyze": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Admin run sliding-window LOST anomaly analysis",
        parameters: [uuidPathParameter("id")],
        responses: { "200": { description: "Aggregate analysis and emitted alert counts" } }
      }
    },
    "/admin/radar/alerts": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Staff/Admin list privacy-preserving Radar alerts",
        responses: { "200": { description: "Campus Radar alert list" } }
      }
    },
    "/admin/radar/alerts/{id}/posts": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Staff/Admin list public LOST summaries within an alert scope",
        description: "No contact, media, evidence or OCR data is returned.",
        parameters: [
          uuidPathParameter("id"),
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 50 } }
        ],
        responses: { "200": { description: "Related LOST post summaries" }, "404": { description: "Alert not found" } }
      }
    },
    "/admin/radar/alerts/{id}/status": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Staff/Admin acknowledge, resolve or dismiss a Radar alert",
        parameters: [uuidPathParameter("id")],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["status", "reason"],
          properties: {
            status: { type: "string", enum: ["ACKNOWLEDGED", "RESOLVED", "DISMISSED"] },
            reason: { type: "string", enum: ["REVIEWED_NO_ACTION", "MONITORING", "OPERATIONAL_FOLLOW_UP", "FALSE_POSITIVE"] }
          }
        }),
        responses: { "200": { description: "Alert disposition updated" } }
      }
    },
    "/admin/radar/audit": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Admin list Campus Radar audit records",
        responses: { "200": { description: "Radar audit records" } }
      }
    },
    "/admin/visual-hunt": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Staff/Admin rank candidates from one explicit image/frame",
        description: "Google Vision metadata/OCR-assisted ranking; raw input is ephemeral and no post state changes automatically.",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image"],
                properties: {
                  image: { type: "string", format: "binary" },
                  targetType: { type: "string", enum: ["LOST", "FOUND"] },
                  categoryId: { type: "string", format: "uuid" },
                  areaId: { type: "string", format: "uuid" },
                  maxResults: { type: "integer", minimum: 1, maximum: 20, default: 20 }
                }
              }
            }
          }
        },
        responses: { "200": { description: "Advisory candidate list" }, "403": { description: "Staff/Admin required" } }
      }
    },
    "/admin/visual-hunt/feedback": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Record Staff/Admin candidate or not-relevant feedback",
        requestBody: jsonRequestBody({
          type: "object",
          required: ["postId", "decision", "source"],
          properties: {
            postId: { type: "string", format: "uuid" },
            decision: { type: "string", enum: ["CANDIDATE", "NOT_RELEVANT"] },
            similarityScore: { type: "number", minimum: 0, maximum: 1, nullable: true },
            source: { type: "string", enum: ["CAMERA", "IMAGE", "VIDEO_FRAMES", "BATCH_IMAGES"] }
          }
        }),
        responses: { "200": { description: "Visual Hunt feedback recorded" } }
      }
    },
    "/posts": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Create LOST or FOUND post",
        responses: { "201": { description: "Post created" } }
      },
      get: {
        summary: "List public posts with pagination and filters",
        responses: { "200": { description: "Post list" } }
      }
    },
    "/posts/ai-draft": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Create an ephemeral AI-assisted post draft from one image",
        description: "Uses Google Vision assisted OCR/tags when available. The image and draft are not persisted; user review is required before create post.",
        responses: { "200": { description: "Editable draft with provider/fallback status" }, "422": { description: "Invalid or unsafe image" } }
      }
    },
    "/posts/finder-quick-scan": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Analyze one finder-selected image and create an idempotent FOUND draft session",
        description: "Uses Google Vision assisted OCR/tags or a filter fallback. The raw image and raw OCR are not persisted; returned LOST candidates are advisory.",
        responses: { "200": { description: "Draft session and redacted candidate summaries" }, "422": { description: "Invalid or unsafe image" } }
      }
    },
    "/posts/finder-quick-scan/{sessionId}/create-draft": {
      post: { security: [{ bearerAuth: [] }], summary: "Confirm the scan candidate and prepare an editable FOUND draft", parameters: [uuidPathParameter("sessionId")], responses: { "200": { description: "Draft ready for human review" } } }
    },
    "/posts/finder-quick-scan/{sessionId}/publish": {
      post: { security: [{ bearerAuth: [] }], summary: "Publish one FOUND post from a locked scan session", parameters: [uuidPathParameter("sessionId")], description: "Concurrent retries return the same post. Matching remains advisory and cannot confirm ownership.", responses: { "201": { description: "FOUND post created" }, "200": { description: "Existing post returned for an idempotent retry" } } }
    },
    "/proof-vault": {
      get: { security: [{ bearerAuth: [] }], summary: "List current user's private proofs", responses: { "200": { description: "Owner-only proof list without raw storage identifiers" } } },
      post: { security: [{ bearerAuth: [] }], summary: "Create a private ownership proof", responses: { "201": { description: "Secret value is write-only and hashed" } } }
    },
    "/proof-vault/{id}": {
      patch: { security: [{ bearerAuth: [] }], summary: "Update an active owned proof", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Private proof updated" } } },
      delete: { security: [{ bearerAuth: [] }], summary: "Archive proof without breaking claim history", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Private proof archived" } } }
    },
    "/proof-vault/{id}/media": {
      get: { security: [{ bearerAuth: [] }], summary: "Stream owner-only proof media through the authenticated proxy", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Protected image stream" } } },
      post: { security: [{ bearerAuth: [] }], summary: "Upload or replace private proof media", parameters: [uuidPathParameter("id")], responses: { "201": { description: "Private proof media stored" } } }
    },
    "/posts/my": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "List current user's posts",
        responses: { "200": { description: "Post list" } }
      }
    },
    "/posts/{id}": {
      get: {
        summary: "Get post detail",
        responses: { "200": { description: "Post detail" } }
      },
      put: {
        security: [{ bearerAuth: [] }],
        summary: "Update post",
        responses: { "200": { description: "Post updated" } }
      },
      delete: {
        security: [{ bearerAuth: [] }],
        summary: "Soft-delete post",
        responses: { "200": { description: "Post deleted" } }
      }
    },
    "/posts/{id}/media": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Upload post images",
        responses: { "201": { description: "Post media uploaded" } }
      }
    },
    "/posts/{id}/media/{mediaId}": {
      delete: {
        security: [{ bearerAuth: [] }],
        summary: "Delete post media",
        responses: { "200": { description: "Post media deleted" } }
      }
    },
    "/posts/{id}/matches": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Get post matching results",
        responses: { "200": { description: "Match result list" } }
      }
    },
    "/posts/{id}/matches/explanations": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Explain why matches are similar",
        responses: { "200": { description: "Match explanations" } }
      }
    },
    "/posts/{id}/matches/re-run": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Admin re-run matching for a post",
        responses: { "200": { description: "Matching re-run completed" } }
      }
    },
    "/posts/{id}/status": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Update post status",
        responses: { "200": { description: "Post status updated" } }
      }
    },
    "/posts/{id}/claims": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "List claims for a post",
        responses: { "200": { description: "Claim list" } }
      }
    },
    "/posts/{id}/report": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Report a post for moderation",
        responses: { "201": { description: "Report submitted" } }
      }
    },
    "/search": {
      get: {
        summary: "Search public posts",
        responses: { "200": { description: "Search results" } }
      }
    },
    "/claims": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Submit claim for a FOUND post",
        responses: { "201": { description: "Claim submitted" } }
      }
    },
    "/claims/{id}": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Get claim detail",
        responses: { "200": { description: "Claim detail" } }
      }
    },
    "/claims/{id}/verification": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Calculate claim evidence ownership verification percentage",
        responses: { "200": { description: "Claim verification confidence" } }
      }
    },
    "/claims/{id}/consistency-map": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Reviewer-only Evidence Consistency Map",
        description: "Advisory rule/OCR/user/human signals. Human decision required; no automatic ownership approval.",
        parameters: [uuidPathParameter("id")],
        responses: { "200": { description: "Evidence consistency signals" }, "403": { description: "Reviewer authorization required" } }
      }
    },
    "/posts/{id}/search-companion": {
      get: { security: [{ bearerAuth: [] }], summary: "Get the owner-only private search profile and next safe question", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Search profile without FOUND private details" }, "403": { description: "Not the active LOST post owner" } } }
    },
    "/posts/{id}/search-companion/answers": {
      post: { security: [{ bearerAuth: [] }], summary: "Save one private Search Companion answer", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Profile revision updated" } } }
    },
    "/posts/{id}/search-companion/skip": {
      post: { security: [{ bearerAuth: [] }], summary: "Skip one Search Companion question", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Question skipped" } } }
    },
    "/posts/{id}/search-companion/undo": {
      post: { security: [{ bearerAuth: [] }], summary: "Remove the most recently saved Search Companion answer", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Last answer removed" } } }
    },
    "/posts/{id}/search-companion/recalculate": {
      post: { security: [{ bearerAuth: [] }], summary: "Preview matching score changes without writing matches or statuses", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Backend-redacted candidates and score deltas" } } }
    },
    "/posts/{id}/search-companion/apply": {
      post: { security: [{ bearerAuth: [] }], summary: "Apply only confirmed non-secret fields to the public LOST post", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Post updated; private answers remain private" } } }
    },
    "/posts/{id}/recovery-timeline": {
      get: { security: [{ bearerAuth: [] }], summary: "Get an authorized recovery timeline derived from business and audit records", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Stable, privacy-safe timeline" }, "403": { description: "Not a participant or reviewer" } } }
    },
    "/claims/{id}/proof-vault": {
      get: { security: [{ bearerAuth: [] }], summary: "List private proofs attached to an authorized claim", parameters: [uuidPathParameter("id")], responses: { "200": { description: "Attached proof snapshots without raw storage identifiers" } } }
    },
    "/claims/{id}/proof-vault/{proofId}": {
      post: { security: [{ bearerAuth: [] }], summary: "Claimant attach an owned active proof", parameters: [uuidPathParameter("id"), uuidPathParameter("proofId")], responses: { "201": { description: "Proof attached transactionally" } } },
      delete: { security: [{ bearerAuth: [] }], summary: "Claimant detach proof while claim is editable", parameters: [uuidPathParameter("id"), uuidPathParameter("proofId")], responses: { "200": { description: "Proof detached" } } }
    },
    "/claims/{id}/proof-vault/{proofId}/media": {
      get: { security: [{ bearerAuth: [] }], summary: "Stream attached proof media for claim participants/reviewers", parameters: [uuidPathParameter("id"), uuidPathParameter("proofId")], responses: { "200": { description: "Protected image stream" }, "403": { description: "Not a claim participant or reviewer" } } }
    },
    "/claims/{id}/more-info": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Request more information for a claim",
        responses: { "200": { description: "Claim marked as needing more info" } }
      }
    },
    "/claims/{id}/accept": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Accept a claim",
        responses: { "200": { description: "Claim accepted" } }
      }
    },
    "/claims/{id}/reject": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Reject a claim with reason",
        responses: { "200": { description: "Claim rejected" } }
      }
    },
    "/claims/{id}/cancel": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Cancel a claim",
        responses: { "200": { description: "Claim cancelled" } }
      }
    },
    "/claims/{id}/evidence": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Upload claim evidence image",
        responses: { "201": { description: "Claim evidence uploaded" } }
      }
    },
    "/claims/{id}/verification-questions": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "List version-pinned claim verification questions",
        description: "Claimants never receive expected answers or per-attempt correctness; reviewers receive advisory comparison data.",
        parameters: [uuidPathParameter("id")],
        responses: { "200": { description: "Role-aware claim question list" } }
      }
    },
    "/claims/{id}/verification-questions/{questionId}/answer": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Claimant submit a private verification answer",
        parameters: [uuidPathParameter("id"), uuidPathParameter("questionId")],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["answer"],
          properties: { answer: { type: "string", minLength: 1, maxLength: 500, writeOnly: true } }
        }),
        responses: { "200": { description: "Answer recorded without correctness disclosure" }, "429": { description: "Attempt limit reached" } }
      }
    },
    "/posts/{id}/verification-questions/suggest": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Suggest item-specific private verification questions",
        description: "Suggestions are deterministic/template-driven and never contain an expected answer.",
        parameters: [uuidPathParameter("id")],
        responses: { "200": { description: "Question suggestions" } }
      }
    },
    "/posts/{id}/verification-questions": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "List verification questions using role-aware redaction",
        parameters: [uuidPathParameter("id")],
        responses: { "200": { description: "Redacted question list" } }
      },
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Create a verification question with a hashed expected answer",
        parameters: [uuidPathParameter("id")],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["prompt", "questionType", "sourceSignal", "expectedAnswer"],
          properties: {
            prompt: { type: "string", minLength: 8, maxLength: 500 },
            questionType: { type: "string", enum: ["TEXT", "MASKED_SERIAL", "MULTIPLE_CHOICE", "VISUAL_DETAIL"] },
            sourceSignal: { type: "string", minLength: 2, maxLength: 100 },
            expectedAnswer: { type: "string", minLength: 2, maxLength: 500, writeOnly: true },
            options: { type: "array", minItems: 2, maxItems: 8, items: { type: "string", maxLength: 200 } },
            weight: { type: "number", minimum: 0.1, maximum: 1, default: 0.5 },
            privacyLevel: { type: "string", enum: ["PRIVATE", "HIGHLY_PRIVATE"], default: "PRIVATE" },
            approved: { type: "boolean", default: false }
          }
        }),
        responses: { "201": { description: "Verification question created" } }
      }
    },
    "/posts/{id}/verification-questions/{questionId}/status": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Approve or disable a verification question",
        parameters: [uuidPathParameter("id"), uuidPathParameter("questionId")],
        requestBody: jsonRequestBody({
          type: "object",
          required: ["status"],
          properties: { status: { type: "string", enum: ["APPROVED", "DISABLED"] } }
        }),
        responses: { "200": { description: "Question status updated" } }
      }
    },
    "/claims/{id}/evidence/{evidenceId}/image": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Download a protected claim evidence image",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "evidenceId", in: "path", required: true, schema: { type: "string", format: "uuid" } }
        ],
        responses: {
          "200": { description: "Protected claim evidence image stream" },
          "403": { description: "Current user cannot view this claim evidence" },
          "404": { description: "Claim or evidence image not found" }
        }
      }
    },
    "/claims/{id}/chat-image": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Download a protected claim chat image",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "publicId", in: "query", required: true, schema: { type: "string" } }
        ],
        responses: {
          "200": { description: "Protected claim chat image stream" },
          "403": { description: "Current user cannot view this claim chat image" },
          "404": { description: "Claim chat image not found" }
        }
      },
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Upload a private image for claim chat before sending a realtime image message",
        responses: { "201": { description: "Claim chat image uploaded" } }
      }
    },
    "/config/public": {
      get: {
        summary: "Get public configuration entries",
        responses: { "200": { description: "Public config list" } }
      }
    },
    "/appointments": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Create return appointment after an accepted claim",
        responses: { "201": { description: "Appointment created" } }
      }
    },
    "/appointments/claim/{claimId}": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "List appointments for a claim",
        responses: { "200": { description: "Appointment list" } }
      }
    },
    "/appointments/{id}/accept": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Accept an appointment",
        responses: { "200": { description: "Appointment accepted" } }
      }
    },
    "/appointments/{id}/reject": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Reject an appointment with reason",
        responses: { "200": { description: "Appointment rejected" } }
      }
    },
    "/appointments/{id}/cancel": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Cancel an appointment with reason",
        responses: { "200": { description: "Appointment cancelled" } }
      }
    },
    "/appointments/{id}/reschedule": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Reschedule an appointment",
        responses: { "200": { description: "Appointment rescheduled" } }
      }
    },
    "/appointments/{id}/complete": {
      patch: {
        security: [{ bearerAuth: [] }],
        summary: "Complete an accepted appointment",
        responses: { "200": { description: "Appointment completed" } }
      }
    },
    "/appointments/{id}/feedback": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Submit feedback after a completed handover appointment",
        responses: { "201": { description: "Return feedback submitted" } }
      }
    },
    "/appointments/{id}/proof": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Upload a handover or return proof image for an accepted/completed appointment",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["proof"],
                properties: {
                  proof: { type: "string", format: "binary", description: "JPG, PNG or WEBP handover proof image" },
                  note: { type: "string", maxLength: 1000, nullable: true }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Appointment proof uploaded" } }
      }
    },
    "/appointments/{id}/proof-image": {
      get: {
        security: [{ bearerAuth: [] }],
        summary: "Load a protected handover proof image for authorized appointment participants/staff/admin",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Image bytes" },
          "403": { description: "Not authorized to view this proof image" },
          "404": { description: "Proof image not found" }
        }
      }
    },
    "/appointments/jobs/send-reminders": {
      post: {
        security: [{ bearerAuth: [] }],
        summary: "Send appointment reminders",
        responses: { "200": { description: "Reminder count" } }
      }
    },
    "/categories": {
      get: {
        summary: "List active categories",
        responses: { "200": { description: "Category list" } }
      }
    },
    "/locations/areas": {
      get: {
        summary: "List active campus areas",
        responses: { "200": { description: "Area list" } }
      }
    },
    "/locations/areas/{id}/buildings": {
      get: {
        summary: "List active buildings in an area",
        responses: { "200": { description: "Building list" } }
      }
    },
    "/handover-points": {
      get: {
        summary: "List active handover points",
        responses: { "200": { description: "Handover point list" } }
      }
    },
    "/handover-points/{id}": {
      get: {
        summary: "Get active handover point detail",
        responses: { "200": { description: "Handover point detail" } }
      }
    },
    "/docs": {
      get: {
        summary: "OpenAPI document",
        responses: { "200": { description: "OpenAPI JSON" } }
      }
    }
  }
} as const);
