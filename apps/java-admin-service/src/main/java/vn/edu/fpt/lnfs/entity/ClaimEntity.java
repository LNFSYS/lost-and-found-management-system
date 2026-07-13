package vn.edu.fpt.lnfs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "claims")
public class ClaimEntity {
  @Id
  private String id;

  @Column(name = "post_id", nullable = false)
  private String postId;

  @Column(name = "claimant_id", nullable = false)
  private String claimantId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ClaimStatus status;

  private String description;

  @Column(name = "rejection_reason")
  private String rejectionReason;

  @Column(name = "more_info_request")
  private String moreInfoRequest;

  @Column(name = "accepted_at")
  private LocalDateTime acceptedAt;

  @Column(name = "rejected_at")
  private LocalDateTime rejectedAt;

  @Column(name = "cancelled_at")
  private LocalDateTime cancelledAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public String getId() {
    return id;
  }

  public String getPostId() {
    return postId;
  }

  public String getClaimantId() {
    return claimantId;
  }

  public ClaimStatus getStatus() {
    return status;
  }

  public String getDescription() {
    return description;
  }

  public void setStatus(ClaimStatus status) {
    this.status = status;
  }

  public String getRejectionReason() {
    return rejectionReason;
  }

  public void setRejectionReason(String rejectionReason) {
    this.rejectionReason = rejectionReason;
  }

  public String getMoreInfoRequest() {
    return moreInfoRequest;
  }

  public void setMoreInfoRequest(String moreInfoRequest) {
    this.moreInfoRequest = moreInfoRequest;
  }

  public LocalDateTime getAcceptedAt() {
    return acceptedAt;
  }

  public void setAcceptedAt(LocalDateTime acceptedAt) {
    this.acceptedAt = acceptedAt;
  }

  public LocalDateTime getRejectedAt() {
    return rejectedAt;
  }

  public void setRejectedAt(LocalDateTime rejectedAt) {
    this.rejectedAt = rejectedAt;
  }

  public LocalDateTime getCancelledAt() {
    return cancelledAt;
  }

  public void setCancelledAt(LocalDateTime cancelledAt) {
    this.cancelledAt = cancelledAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
