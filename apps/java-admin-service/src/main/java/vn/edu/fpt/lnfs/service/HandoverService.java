package vn.edu.fpt.lnfs.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.fpt.lnfs.dto.HandoverRequests.StorageActionRequest;
import vn.edu.fpt.lnfs.dto.HandoverRequests.UpsertPoint;
import vn.edu.fpt.lnfs.entity.HandoverPointEntity;
import vn.edu.fpt.lnfs.entity.PostEntity;
import vn.edu.fpt.lnfs.entity.PostStatus;
import vn.edu.fpt.lnfs.entity.StorageAction;
import vn.edu.fpt.lnfs.entity.StorageLogEntity;
import vn.edu.fpt.lnfs.repository.HandoverPointRepository;
import vn.edu.fpt.lnfs.repository.PostRepository;
import vn.edu.fpt.lnfs.repository.StorageLogRepository;

@Service
public class HandoverService {
  private final HandoverPointRepository handoverPointRepository;
  private final PostRepository postRepository;
  private final StorageLogRepository storageLogRepository;
  private final AuthContext authContext;

  public HandoverService(HandoverPointRepository handoverPointRepository, PostRepository postRepository,
      StorageLogRepository storageLogRepository, AuthContext authContext) {
    this.handoverPointRepository = handoverPointRepository;
    this.postRepository = postRepository;
    this.storageLogRepository = storageLogRepository;
    this.authContext = authContext;
  }

  public List<HandoverPointEntity> activePoints() {
    return handoverPointRepository.findByActiveTrueOrderByName();
  }

  @Transactional
  public HandoverPointEntity create(UpsertPoint request) {
    return handoverPointRepository.save(new HandoverPointEntity(
        UUID.randomUUID().toString(),
        request.name(),
        request.address(),
        request.openingHours(),
        request.contactInfo(),
        request.mapImageUrl(),
        request.mapPositionX(),
        request.mapPositionY(),
        request.areaId(),
        request.buildingId(),
        authContext.currentUserId()));
  }

  @Transactional
  public HandoverPointEntity update(String id, UpsertPoint request) {
    HandoverPointEntity point = loadPoint(id);
    point.setName(request.name());
    point.setAddress(request.address());
    point.setOpeningHours(request.openingHours());
    point.setContactInfo(request.contactInfo());
    point.setMapImageUrl(request.mapImageUrl());
    point.setMapPositionX(request.mapPositionX());
    point.setMapPositionY(request.mapPositionY());
    point.setAreaId(request.areaId());
    point.setBuildingId(request.buildingId());
    point.touch();
    return handoverPointRepository.save(point);
  }

  @Transactional
  public HandoverPointEntity toggle(String id) {
    HandoverPointEntity point = loadPoint(id);
    point.setActive(!point.isActive());
    point.touch();
    return handoverPointRepository.save(point);
  }

  @Transactional
  public StorageLogEntity receive(String pointId, StorageActionRequest request) {
    HandoverPointEntity point = requireActivePoint(pointId);
    PostEntity post = loadPost(request.postId());
    post.setHandoverPointId(point.getId());
    post.setUpdatedAt(LocalDateTime.now());
    postRepository.save(post);
    return log(post.getId(), point.getId(), StorageAction.RECEIVED, request.conditionNotes());
  }

  @Transactional
  public StorageLogEntity store(String pointId, StorageActionRequest request) {
    HandoverPointEntity point = requireActivePoint(pointId);
    PostEntity post = loadPost(request.postId());
    post.setHandoverPointId(point.getId());
    post.setUpdatedAt(LocalDateTime.now());
    postRepository.save(post);
    return log(post.getId(), point.getId(), StorageAction.STORED, request.conditionNotes());
  }

  @Transactional
  public StorageLogEntity returnItem(String pointId, StorageActionRequest request) {
    HandoverPointEntity point = requireActivePoint(pointId);
    PostEntity post = loadPost(request.postId());
    post.setStatus(PostStatus.RESOLVED);
    post.setResolvedAt(LocalDateTime.now());
    post.setUpdatedAt(LocalDateTime.now());
    postRepository.save(post);
    return log(post.getId(), point.getId(), StorageAction.RETURNED, request.conditionNotes());
  }

  private StorageLogEntity log(String postId, String pointId, StorageAction action, String conditionNotes) {
    return storageLogRepository.save(new StorageLogEntity(
        UUID.randomUUID().toString(),
        postId,
        pointId,
        authContext.currentUserId(),
        action,
        conditionNotes));
  }

  private HandoverPointEntity loadPoint(String id) {
    return handoverPointRepository.findById(id).orElseThrow(() -> new NoSuchElementException("Handover point not found"));
  }

  private HandoverPointEntity requireActivePoint(String id) {
    HandoverPointEntity point = loadPoint(id);
    if (!point.isActive()) {
      throw new IllegalStateException("Handover point is inactive");
    }
    return point;
  }

  private PostEntity loadPost(String postId) {
    return postRepository.findById(postId).orElseThrow(() -> new NoSuchElementException("Post not found"));
  }
}
