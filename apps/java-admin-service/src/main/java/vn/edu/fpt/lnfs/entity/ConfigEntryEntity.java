package vn.edu.fpt.lnfs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "config_entries")
public class ConfigEntryEntity {
  @Id
  private String id;

  @Column(name = "config_key", nullable = false, unique = true)
  private String configKey;

  @Column(name = "config_value", nullable = false)
  private String configValue;

  @Enumerated(EnumType.STRING)
  @Column(name = "value_type", nullable = false)
  private ValueType valueType;

  private String description;

  @Column(name = "is_public")
  private boolean publicEntry;

  @Column(name = "updated_by")
  private String updatedBy;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public String getId() {
    return id;
  }

  public String getConfigKey() {
    return configKey;
  }

  public String getConfigValue() {
    return configValue;
  }

  public void setConfigValue(String configValue) {
    this.configValue = configValue;
  }

  public ValueType getValueType() {
    return valueType;
  }

  public String getDescription() {
    return description;
  }

  public boolean isPublicEntry() {
    return publicEntry;
  }

  public String getUpdatedBy() {
    return updatedBy;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedBy(String updatedBy) {
    this.updatedBy = updatedBy;
  }

  public void touch() {
    this.updatedAt = LocalDateTime.now();
  }
}
