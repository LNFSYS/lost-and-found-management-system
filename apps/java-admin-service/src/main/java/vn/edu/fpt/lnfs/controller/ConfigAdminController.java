package vn.edu.fpt.lnfs.controller;

import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.fpt.lnfs.dto.ApiResponse;
import vn.edu.fpt.lnfs.dto.ConfigRequests.UpdateConfig;
import vn.edu.fpt.lnfs.entity.ConfigEntryEntity;
import vn.edu.fpt.lnfs.entity.ConfigHistoryEntity;
import vn.edu.fpt.lnfs.service.ConfigService;

@RestController
@RequestMapping("/admin/config")
@PreAuthorize("hasRole('ADMIN')")
public class ConfigAdminController {
  private final ConfigService configService;

  public ConfigAdminController(ConfigService configService) {
    this.configService = configService;
  }

  @GetMapping
  public ApiResponse<List<ConfigEntryEntity>> list() {
    return ApiResponse.ok(configService.list());
  }

  @PutMapping("/{key}")
  public ApiResponse<ConfigEntryEntity> update(@PathVariable String key, @Valid @RequestBody UpdateConfig request) {
    return ApiResponse.ok(configService.update(key, request.value()), "Configuration updated");
  }

  @GetMapping("/history")
  public ApiResponse<List<ConfigHistoryEntity>> history() {
    return ApiResponse.ok(configService.history());
  }
}
