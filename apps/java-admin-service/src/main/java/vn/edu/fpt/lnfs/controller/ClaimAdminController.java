package vn.edu.fpt.lnfs.controller;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.lnfs.dto.ApiResponse;
import vn.edu.fpt.lnfs.dto.ClaimDecisionRequests.Cancel;
import vn.edu.fpt.lnfs.dto.ClaimDecisionRequests.Reject;
import vn.edu.fpt.lnfs.dto.ClaimDecisionRequests.RequestInfo;
import vn.edu.fpt.lnfs.entity.ClaimEntity;
import vn.edu.fpt.lnfs.service.ClaimBusinessService;

@RestController
@RequestMapping("/admin/claims")
public class ClaimAdminController {
  private final ClaimBusinessService claimBusinessService;

  public ClaimAdminController(ClaimBusinessService claimBusinessService) {
    this.claimBusinessService = claimBusinessService;
  }

  @PostMapping("/{id}/request-info")
  @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
  public ApiResponse<ClaimEntity> requestInfo(@PathVariable String id, @Valid @RequestBody RequestInfo request) {
    return ApiResponse.ok(claimBusinessService.requestInfo(id, request.message()), "Claim moved to NEED_MORE_INFO");
  }

  @PostMapping("/{id}/accept")
  @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
  public ApiResponse<ClaimEntity> accept(@PathVariable String id) {
    return ApiResponse.ok(claimBusinessService.accept(id), "Claim accepted");
  }

  @PostMapping("/{id}/reject")
  @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
  public ApiResponse<ClaimEntity> reject(@PathVariable String id, @Valid @RequestBody Reject request) {
    return ApiResponse.ok(claimBusinessService.reject(id, request.reason()), "Claim rejected");
  }

  @PostMapping("/{id}/cancel")
  @PreAuthorize("hasAnyRole('USER','STAFF','ADMIN')")
  public ApiResponse<ClaimEntity> cancel(@PathVariable String id, @Valid @RequestBody Cancel request) {
    return ApiResponse.ok(claimBusinessService.cancel(id, request.reason()), "Claim cancelled");
  }
}
