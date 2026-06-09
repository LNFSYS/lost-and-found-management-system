package vn.edu.fpt.lnfs.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.lnfs.entity.StorageLogEntity;

public interface StorageLogRepository extends JpaRepository<StorageLogEntity, String> {
}
