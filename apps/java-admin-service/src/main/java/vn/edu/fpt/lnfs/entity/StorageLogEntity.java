package vn.edu.fpt.lnfs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "storage_logs")
public class StorageLogEntity {
  @Id
  private String id;

  @Column(name = "post_id", nullable = false)
  private String postId;

  @Column(name = "handover_point_id", nullable = false)
  private String handoverPointId;

  @Column(name = "actor_id", nullable = false)
  private String actorId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private StorageAction action;

  @Column(name = "condition_notes")
  private String conditionNotes;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  public StorageLogEntity() {
  }

  public StorageLogEntity(String id, String postId, String handoverPointId, String actorId, StorageAction action,
      String conditionNotes) {
    this.id = id;
    this.postId = postId;
    this.handoverPointId = handoverPointId;
    this.actorId = actorId;
    this.action = action;
    this.conditionNotes = conditionNotes;
    this.createdAt = LocalDateTime.now();
  }

  public String getId() {
    return id;
  }

  public String getPostId() {
    return postId;
  }

  public String getHandoverPointId() {
    return handoverPointId;
  }

  public String getActorId() {
    return actorId;
  }

  public StorageAction getAction() {
    return action;
  }

  public String getConditionNotes() {
    return conditionNotes;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }
}
