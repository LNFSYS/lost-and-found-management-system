package vn.edu.fpt.lnfs.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.lnfs.entity.HandoverPointEntity;

public interface HandoverPointRepository extends JpaRepository<HandoverPointEntity, String> {
  List<HandoverPointEntity> findByActiveTrueOrderByName();
}
