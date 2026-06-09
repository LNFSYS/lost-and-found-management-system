package vn.edu.fpt.lnfs.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.lnfs.entity.ConfigHistoryEntity;

public interface ConfigHistoryRepository extends JpaRepository<ConfigHistoryEntity, String> {
  List<ConfigHistoryEntity> findTop50ByOrderByChangedAtDesc();
}
