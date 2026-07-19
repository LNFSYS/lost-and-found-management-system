export const openApiDocument = {
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
} as const;
