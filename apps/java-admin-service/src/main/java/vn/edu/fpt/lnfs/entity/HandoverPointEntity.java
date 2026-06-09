package vn.edu.fpt.lnfs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "handover_points")
public class HandoverPointEntity {
  @Id
  private String id;

  private String name;
  private String address;

  @Column(name = "area_id")
  private String areaId;

  @Column(name = "building_id")
  private String buildingId;

  @Column(name = "room_id")
  private String roomId;

  @Column(name = "opening_hours")
  private String openingHours;

  @Column(name = "contact_info")
  private String contactInfo;

  @Column(name = "is_active")
  private boolean active;

  @Column(name = "created_by")
  private String createdBy;

  @Column(name = "created_at")
  private LocalDateTime createdAt;

  @Column(name = "updated_at")
  private LocalDateTime updatedAt;

  public HandoverPointEntity() {
  }

  public HandoverPointEntity(String id, String name, String address, String openingHours, String contactInfo,
      String areaId, String buildingId, String roomId, String createdBy) {
    this.id = id;
    this.name = name;
    this.address = address;
    this.openingHours = openingHours;
    this.contactInfo = contactInfo;
    this.areaId = areaId;
    this.buildingId = buildingId;
    this.roomId = roomId;
    this.createdBy = createdBy;
    this.active = true;
    this.createdAt = LocalDateTime.now();
    this.updatedAt = LocalDateTime.now();
  }

  public String getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getAddress() {
    return address;
  }

  public void setAddress(String address) {
    this.address = address;
  }

  public String getAreaId() {
    return areaId;
  }

  public void setAreaId(String areaId) {
    this.areaId = areaId;
  }

  public String getBuildingId() {
    return buildingId;
  }

  public void setBuildingId(String buildingId) {
    this.buildingId = buildingId;
  }

  public String getRoomId() {
    return roomId;
  }

  public void setRoomId(String roomId) {
    this.roomId = roomId;
  }

  public String getOpeningHours() {
    return openingHours;
  }

  public void setOpeningHours(String openingHours) {
    this.openingHours = openingHours;
  }

  public String getContactInfo() {
    return contactInfo;
  }

  public void setContactInfo(String contactInfo) {
    this.contactInfo = contactInfo;
  }

  public boolean isActive() {
    return active;
  }

  public void setActive(boolean active) {
    this.active = active;
  }

  public void touch() {
    this.updatedAt = LocalDateTime.now();
  }
}
