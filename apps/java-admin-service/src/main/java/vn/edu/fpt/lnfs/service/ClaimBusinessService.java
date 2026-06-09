package vn.edu.fpt.lnfs.service;

import java.time.LocalDateTime;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.lnfs.entity.ClaimEntity;
import vn.edu.fpt.lnfs.entity.ClaimStateLogEntity;
import vn.edu.fpt.lnfs.entity.ClaimStatus;
import vn.edu.fpt.lnfs.repository.ClaimRepository;
import vn.edu.fpt.lnfs.repository.ClaimStateLogRepository;

@Service
public class ClaimBusinessService {
  private final ClaimRepository claimRepository;
  private final ClaimStateLogRepository logRepository;
  private final AuthContext authContext;

  public ClaimBusinessService(ClaimRepository claimRepository, ClaimStateLogRepository logRepository,
      AuthContext authContext) {
    this.claimRepository = claimRepository;
    this.logRepository = logRepository;
    this.authContext = authContext;
  }

  @Transactional
  public ClaimEntity requestInfo(String claimId, String message) {
    ClaimEntity claim = loadForUpdate(claimId);
    requireStatus(claim, ClaimStatus.PENDING);
    ClaimStatus from = claim.getStatus();
    claim.setStatus(ClaimStatus.NEED_MORE_INFO);
    claim.setMoreInfoRequest(message);
    claim.setUpdatedAt(LocalDateTime.now());
    log(claim, from, "Requested more information: " + message);
    return claimRepository.save(claim);
  }

  @Transactional
  public ClaimEntity accept(String claimId) {
    ClaimEntity claim = loadForUpdate(claimId);
    if (claim.getStatus() != ClaimStatus.PENDING && claim.getStatus() != ClaimStatus.NEED_MORE_INFO) {
      throw new IllegalStateException("Only pending claims can be accepted");
    }
    if (claim.getStatus() == ClaimStatus.NEED_MORE_INFO && !hasNewEvidenceAfterInfoRequest(claim)) {
      throw new IllegalStateException("Claim needs additional evidence before it can be accepted");
    }
    ClaimStatus from = claim.getStatus();
    claim.setStatus(ClaimStatus.ACCEPTED);
    claim.setAcceptedAt(LocalDateTime.now());
    claim.setUpdatedAt(LocalDateTime.now());
    log(claim, from, "Claim accepted");
    return claimRepository.save(claim);
  }

  @Transactional
  public ClaimEntity reject(String claimId, String reason) {
    ClaimEntity claim = loadForUpdate(claimId);
    if (claim.getStatus() != ClaimStatus.PENDING && claim.getStatus() != ClaimStatus.NEED_MORE_INFO) {
      throw new IllegalStateException("Only pending claims can be rejected");
    }
    ClaimStatus from = claim.getStatus();
    claim.setStatus(ClaimStatus.REJECTED);
    claim.setRejectionReason(reason);
    claim.setRejectedAt(LocalDateTime.now());
    claim.setUpdatedAt(LocalDateTime.now());
    log(claim, from, "Claim rejected: " + reason);
    return claimRepository.save(claim);
  }

  @Transactional
  public ClaimEntity cancel(String claimId, String reason) {
    ClaimEntity claim = loadForUpdate(claimId);
    if (!claim.getClaimantId().equals(authContext.currentUserId())) {
      throw new AccessDeniedException("Only the claimant can cancel this claim");
    }
    requireStatus(claim, ClaimStatus.PENDING);
    ClaimStatus from = claim.getStatus();
    claim.setStatus(ClaimStatus.CANCELLED);
    claim.setCancelledAt(LocalDateTime.now());
    claim.setUpdatedAt(LocalDateTime.now());
    log(claim, from, "Claim cancelled: " + reason);
    return claimRepository.save(claim);
  }

  private ClaimEntity load(String claimId) {
    return claimRepository.findById(claimId).orElseThrow(() -> new NoSuchElementException("Claim not found"));
  }

  private ClaimEntity loadForUpdate(String claimId) {
    return claimRepository.findByIdForUpdate(claimId)
        .orElseThrow(() -> new NoSuchElementException("Claim not found"));
  }

  private boolean hasNewEvidenceAfterInfoRequest(ClaimEntity claim) {
    if (claim.getUpdatedAt() == null) {
      return false;
    }
    return claimRepository.countEvidenceCreatedAfter(claim.getId(), claim.getUpdatedAt()) > 0;
  }

  private void requireStatus(ClaimEntity claim, ClaimStatus status) {
    if (claim.getStatus() != status) {
      throw new IllegalStateException("Claim must be " + status);
    }
  }

  private void log(ClaimEntity claim, ClaimStatus from, String note) {
    logRepository.save(new ClaimStateLogEntity(
        UUID.randomUUID().toString(),
        claim.getId(),
        from.name(),
        claim.getStatus().name(),
        authContext.currentUserId(),
        note));
  }
}
