package vn.edu.fpt.lnfs.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.lnfs.dto.ApiResponse;
import vn.edu.fpt.lnfs.dto.HandoverRequests.StorageActionRequest;
import vn.edu.fpt.lnfs.dto.HandoverRequests.UpsertPoint;
import vn.edu.fpt.lnfs.entity.HandoverPointEntity;
import vn.edu.fpt.lnfs.entity.StorageLogEntity;
import vn.edu.fpt.lnfs.service.HandoverService;

@RestController
@RequestMapping("/admin/handover-points")
public class HandoverAdminController {
  private final HandoverService handoverService;

  public HandoverAdminController(HandoverService handoverService) {
    this.handoverService = handoverService;
  }

  @GetMapping
  @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
  public ApiResponse<List<HandoverPointEntity>> list() {
    return ApiResponse.ok(handoverService.activePoints());
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<HandoverPointEntity> create(@Valid @RequestBody UpsertPoint request) {
    return ApiResponse.ok(handoverService.create(request), "Handover point created");
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<HandoverPointEntity> update(@PathVariable String id, @Valid @RequestBody UpsertPoint request) {
    return ApiResponse.ok(handoverService.update(id, request), "Handover point updated");
  }

  @PatchMapping("/{id}/toggle")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<HandoverPointEntity> toggle(@PathVariable String id) {
    return ApiResponse.ok(handoverService.toggle(id), "Handover point toggled");
  }

  @PostMapping("/{id}/receive")
  @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
  public ApiResponse<StorageLogEntity> receive(@PathVariable String id, @Valid @RequestBody StorageActionRequest request) {
    return ApiResponse.ok(handoverService.receive(id, request), "Item received at handover point");
  }

  @PostMapping("/{id}/store")
  @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
  public ApiResponse<StorageLogEntity> store(@PathVariable String id, @Valid @RequestBody StorageActionRequest request) {
    return ApiResponse.ok(handoverService.store(id, request), "Item stored at handover point");
  }

  @PostMapping("/{id}/return")
  @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
  public ApiResponse<StorageLogEntity> returnItem(@PathVariable String id, @Valid @RequestBody StorageActionRequest request) {
    return ApiResponse.ok(handoverService.returnItem(id, request), "Item returned");
  }
}
