package vn.edu.fpt.lnfs.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.fpt.lnfs.entity.PostEntity;
import vn.edu.fpt.lnfs.entity.PostStatus;

public interface PostRepository extends JpaRepository<PostEntity, String> {
  List<PostEntity> findByStatusAndDeletedAtIsNull(PostStatus status);
}
