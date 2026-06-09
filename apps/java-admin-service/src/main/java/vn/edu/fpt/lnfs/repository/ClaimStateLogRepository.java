package vn.edu.fpt.lnfs.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.lnfs.entity.ClaimStateLogEntity;

public interface ClaimStateLogRepository extends JpaRepository<ClaimStateLogEntity, String> {
}
