package vn.edu.fpt.lnfs.dto;

public record ApiResponse<T>(boolean success, T data, String error, String message) {
  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, data, null, null);
  }

  public static <T> ApiResponse<T> ok(T data, String message) {
    return new ApiResponse<>(true, data, null, message);
  }

  public static ApiResponse<Void> error(String error, String message) {
    return new ApiResponse<>(false, null, error, message);
  }
}
