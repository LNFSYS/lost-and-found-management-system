import assert from "node:assert/strict";
import test from "node:test";
import { createPostSchema } from "../validators/post.validator.js";

const base = {
  title: "Ví da màu nâu",
  description: "Mô tả vật phẩm đủ dài để kiểm tra",
  categoryId: "11111111-1111-4111-8111-111111111111",
  contactInfo: "contact@example.com"
};

test("existing FOUND input defaults to PUBLIC for backward compatibility", () => {
  const result = createPostSchema.parse({ ...base, type: "FOUND", customLocation: "Alpha" });
  assert.equal(result.visibilityMode, "PUBLIC");
});

test("PRIVATE_DETAILS is rejected for LOST posts", () => {
  assert.throws(() => createPostSchema.parse({
    ...base,
    type: "LOST",
    visibilityMode: "PRIVATE_DETAILS",
    secretVerification: "vết xước riêng"
  }));
});
