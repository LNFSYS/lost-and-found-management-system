import assert from "node:assert/strict";
import test from "node:test";
import { listPostsQuerySchema } from "../validators/post.validator.js";

const categoryA = "11111111-1111-4111-8111-111111111111";
const categoryB = "22222222-2222-4222-8222-222222222222";

test("post list accepts comma-separated categoryIds for advanced search", () => {
  const query = listPostsQuerySchema.parse({ categoryIds: `${categoryA},${categoryB}` });
  assert.deepEqual(query.categoryIds, [categoryA, categoryB]);
});

test("post list keeps the legacy single categoryId query compatible", () => {
  const query = listPostsQuerySchema.parse({ categoryId: categoryA });
  assert.equal(query.categoryId, categoryA);
  assert.equal(query.categoryIds, undefined);
});

test("post list rejects malformed or oversized category multi-select filters", () => {
  assert.throws(() => listPostsQuerySchema.parse({ categoryIds: "not-a-uuid" }));
  assert.throws(() => listPostsQuerySchema.parse({ categoryIds: Array.from({ length: 11 }, () => categoryA).join(",") }));
});
