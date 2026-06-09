package vn.edu.fpt.lnfs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "claim_state_logs")
public class ClaimStateLogEntity {
  @Id
  private String id;

  @Column(name = "claim_id", nullable = false)
  private String claimId;

  @Column(name = "from_status")
  private String fromStatus;

  @Column(name = "to_status", nullable = false)
  private String toStatus;

  @Column(name = "actor_id")
  private String actorId;

  private String note;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  public ClaimStateLogEntity() {
  }

  public ClaimStateLogEntity(String id, String claimId, String fromStatus, String toStatus, String actorId, String note) {
    this.id = id;
    this.claimId = claimId;
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
    this.actorId = actorId;
    this.note = note;
    this.createdAt = LocalDateTime.now();
  }

  public String getId() {
    return id;
  }

  public String getClaimId() {
    return claimId;
  }

  public String getFromStatus() {
    return fromStatus;
  }

  public String getToStatus() {
    return toStatus;
  }

  public String getActorId() {
    return actorId;
  }

  public String getNote() {
    return note;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }
}
