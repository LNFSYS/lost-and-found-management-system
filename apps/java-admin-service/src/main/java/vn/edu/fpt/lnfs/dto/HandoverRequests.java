package vn.edu.fpt.lnfs.dto;

import jakarta.validation.constraints.NotBlank;

public final class HandoverRequests {
  private HandoverRequests() {
  }

  public record UpsertPoint(
      @NotBlank String name,
      @NotBlank String address,
      String openingHours,
      String contactInfo,
      String mapImageUrl,
      Double mapPositionX,
      Double mapPositionY,
      String areaId,
      String buildingId) {
  }

  public record StorageActionRequest(@NotBlank String postId, String conditionNotes) {
  }
}
