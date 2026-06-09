package vn.edu.fpt.lnfs.repository;

import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.fpt.lnfs.entity.ClaimEntity;

public interface ClaimRepository extends JpaRepository<ClaimEntity, String> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from ClaimEntity c where c.id = :id")
  Optional<ClaimEntity> findByIdForUpdate(@Param("id") String id);

  @Query(
      value = "SELECT COUNT(*) FROM claim_evidence WHERE claim_id = :claimId AND created_at >= :createdAfter",
      nativeQuery = true)
  long countEvidenceCreatedAfter(@Param("claimId") String claimId, @Param("createdAfter") LocalDateTime createdAfter);
}
