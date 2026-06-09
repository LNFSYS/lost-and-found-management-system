package vn.edu.fpt.lnfs.dto;

import jakarta.validation.constraints.NotBlank;

public final class ClaimDecisionRequests {
  private ClaimDecisionRequests() {
  }

  public record RequestInfo(@NotBlank String message) {
  }

  public record Reject(@NotBlank String reason) {
  }

  public record Cancel(@NotBlank String reason) {
  }
}
