import assert from "node:assert/strict";
import test from "node:test";
import { redactPrivateFound } from "./post.service.js";

const privateFound = {
  id: "post-1",
  userId: "owner-1",
  type: "FOUND",
  visibilityMode: "PRIVATE_DETAILS",
  title: "AirPods có serial ABCD123456",
  description: "Nhặt tại phòng A101, có vết xước bên trái",
  category: { name: "Tai nghe" },
  location: {
    areaId: "area-1",
    areaName: "Alpha",
    buildingId: "building-1",
    buildingName: "Alpha",
    roomText: "A101",
    roomName: "A101",
    customLocation: "Bàn cuối lớp"
  },
  contactInfo: "0901234567",
  handoverPoint: { id: "point-1" },
  coverImageUrl: "https://private.example/image",
  lostFoundAt: "2026-08-01T10:30:00.000Z"
};

test("public viewer receives backend-redacted PRIVATE_DETAILS FOUND data", () => {
  const result = redactPrivateFound(privateFound);
  const serialized = JSON.stringify(result);
  assert.equal(result.privateDetailsHidden, true);
  assert.equal(result.location.roomText, null);
  assert.equal(result.coverImageUrl, null);
  assert.equal(result.contactInfo, null);
  assert.doesNotMatch(serialized, /ABCD123456|A101|0901234567|Bàn cuối/);
});

test("owner receives full PRIVATE_DETAILS FOUND data", () => {
  const result = redactPrivateFound(privateFound, { sub: "owner-1", email: "owner@example.com", roles: ["STUDENT"] });
  assert.equal(result.privateDetailsHidden, false);
  assert.equal(result.location.roomText, "A101");
  assert.equal(result.contactInfo, "0901234567");
});
