package vn.edu.fpt.lnfs.dto;

import jakarta.validation.constraints.NotBlank;

public final class ConfigRequests {
  private ConfigRequests() {
  }

  public record UpdateConfig(@NotBlank String value) {
  }
}
