package vn.edu.fpt.lnfs.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.lnfs.entity.ConfigEntryEntity;

public interface ConfigEntryRepository extends JpaRepository<ConfigEntryEntity, String> {
  Optional<ConfigEntryEntity> findByConfigKey(String configKey);
}
