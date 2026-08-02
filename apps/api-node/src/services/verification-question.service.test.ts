import assert from "node:assert/strict";
import test from "node:test";
import { buildVerificationQuestionSuggestions } from "./verification-question.service.js";

test("electronic items receive serial and device-private verification suggestions", () => {
  const suggestions = buildVerificationQuestionSuggestions({
    title: "Tai nghe không dây",
    description: "Nhặt tại Alpha",
    categoryName: "Thiết bị điện tử",
    tags: [{ tag: "headphones", source: "VISION_OBJECT" }]
  });
  assert.ok(suggestions.some((item) => item.sourceSignal === "serial_suffix"));
  assert.ok(suggestions.some((item) => item.sourceSignal === "device_private_content"));
});

test("wallet suggestions include hidden contents without exposing an answer", () => {
  const suggestions = buildVerificationQuestionSuggestions({
    title: "Ví màu nâu",
    description: "Nhặt được ở Beta",
    categoryName: "Ví và túi",
    tags: []
  });
  const hiddenContents = suggestions.find((item) => item.sourceSignal === "hidden_contents");
  assert.ok(hiddenContents);
  assert.equal("expectedAnswer" in hiddenContents, false);
});
