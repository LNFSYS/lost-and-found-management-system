package vn.edu.fpt.lnfs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "config_history")
public class ConfigHistoryEntity {
  @Id
  private String id;

  @Column(name = "config_key", nullable = false)
  private String configKey;

  @Column(name = "old_value")
  private String oldValue;

  @Column(name = "new_value", nullable = false)
  private String newValue;

  @Column(name = "changed_by", nullable = false)
  private String changedBy;

  @Column(name = "changed_at")
  private LocalDateTime changedAt;

  public ConfigHistoryEntity() {
  }

  public ConfigHistoryEntity(String id, String configKey, String oldValue, String newValue, String changedBy) {
    this.id = id;
    this.configKey = configKey;
    this.oldValue = oldValue;
    this.newValue = newValue;
    this.changedBy = changedBy;
    this.changedAt = LocalDateTime.now();
  }

  public String getId() {
    return id;
  }

  public String getConfigKey() {
    return configKey;
  }

  public String getOldValue() {
    return oldValue;
  }

  public String getNewValue() {
    return newValue;
  }

  public String getChangedBy() {
    return changedBy;
  }

  public LocalDateTime getChangedAt() {
    return changedAt;
  }
}
