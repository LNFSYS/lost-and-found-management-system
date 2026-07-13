import { postRepository, type MatchCandidatePost } from "../repositories/post.repository.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { normalizeText } from "../utils/normalize-text.js";

interface WeightedScores {
  textScore: number;
  categoryScore: number;
  locationScore: number;
  timeScore: number;
  imageScore: number;
  ocrScore: number;
  totalScore: number;
}

interface ScoreExplanation {
  tier: "WEAK" | "SUGGESTION" | "NOTIFY" | "HIGH_CONFIDENCE";
  summary: string;
  reasons: string[];
  matchedTokens: string[];
  matchedImageTags: string[];
  matchedOcrTokens: string[];
  locationReason: string;
  categoryReason: string;
  daysDiff: number | null;
  penalties: string[];
}

interface ScoreDetail extends WeightedScores {
  explanation: ScoreExplanation;
}

export interface MatchRunResult extends WeightedScores {
  id: string;
  lostPostId: string;
  foundPostId: string;
  isNotified: boolean;
  createdAt: string;
  tier?: ScoreExplanation["tier"];
  explanation?: ScoreExplanation;
}

const STOPWORDS = new Set([
  "bi",
  "can",
  "cua",
  "da",
  "do",
  "duoc",
  "em",
  "giup",
  "mat",
  "mon",
  "nay",
  "nhat",
  "roi",
  "tim",
  "toi",
  "trong",
  "vat",
  "va",
  "voi"
]);

const SYNONYMS = new Map([
  ["airpods", "airpod"],
  ["earphone", "tainghe"],
  ["earphones", "tainghe"],
  ["headphone", "tainghe"],
  ["headphones", "tainghe"],
  ["tai", "tainghe"],
  ["nghe", "tainghe"],
  ["dt", "dienthoai"],
  ["phone", "dienthoai"],
  ["mobile", "dienthoai"],
  ["bop", "vi"],
  ["wallet", "vi"],
  ["card", "the"],
  ["id", "the"],
  ["alpha", "alpha"],
  ["alfa", "alpha"],
  ["beta", "beta"],
  ["gamma", "gamma"],
  ["ktx", "kytucxa"]
]);

function normalizeToken(token: string) {
  const cleaned = normalizeText(token).replace(/[^a-z0-9]/g, "");
  return SYNONYMS.get(cleaned) ?? cleaned;
}

function tokenize(text: string, minimumLength = 2) {
  return normalizeText(text)
    .split(/\s+/)
    .map(normalizeToken)
    .filter((token) => token.length >= minimumLength && !STOPWORDS.has(token));
}

function tokenSet(text: string, minimumLength = 2) {
  return new Set(tokenize(text, minimumLength));
}

function intersection(left: Set<string>, right: Set<string>) {
  return Array.from(left).filter((token) => right.has(token));
}

function overlapRatio(leftText: string, rightText: string, minimumLength = 2) {
  const left = tokenSet(leftText, minimumLength);
  const right = tokenSet(rightText, minimumLength);
  if (left.size === 0 || right.size === 0) {
    return { score: 0, tokens: [] };
  }

  const tokens = intersection(left, right);
  return {
    score: Math.min(1, tokens.length / Math.min(left.size, right.size)),
    tokens
  };
}

function termFrequency(tokens: string[]) {
  const map = new Map<string, number>();
  for (const token of tokens) {
    map.set(token, (map.get(token) ?? 0) + 1);
  }

  for (const [token, count] of map.entries()) {
    map.set(token, count / Math.max(tokens.length, 1));
  }

  return map;
}

function buildTfidfVectors(documents: string[]) {
  const tokenized = documents.map((document) => tokenize(document));
  const documentFrequency = new Map<string, number>();

  for (const tokens of tokenized) {
    for (const token of new Set(tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  return tokenized.map((tokens) => {
    const tf = termFrequency(tokens);
    const vector = new Map<string, number>();

    for (const [token, value] of tf.entries()) {
      const idf = Math.log((documents.length + 1) / ((documentFrequency.get(token) ?? 0) + 1)) + 1;
      vector.set(token, value * idf);
    }

    return vector;
  });
}

function cosineSimilarity(left: Map<string, number>, right: Map<string, number>) {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const value of left.values()) {
    leftMagnitude += value * value;
  }
  for (const value of right.values()) {
    rightMagnitude += value * value;
  }
  for (const [token, leftValue] of left.entries()) {
    dot += leftValue * (right.get(token) ?? 0);
  }

  const denominator = Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude);
  return denominator === 0 ? 0 : dot / denominator;
}

function categoryScore(left: MatchCandidatePost, right: MatchCandidatePost) {
  if (!left.categoryId || !right.categoryId) {
    return { score: 0, reason: "Chưa đủ thông tin danh mục" };
  }
  if (left.categoryId === right.categoryId) {
    return { score: 1, reason: "Trùng danh mục" };
  }
  if (
    (left.parentCategoryId && left.parentCategoryId === right.parentCategoryId) ||
    left.parentCategoryId === right.categoryId ||
    right.parentCategoryId === left.categoryId
  ) {
    return { score: 0.5, reason: "Gần danh mục cha/con" };
  }

  return { score: 0, reason: "Khác danh mục" };
}

function locationScore(left: MatchCandidatePost, right: MatchCandidatePost) {
  if (left.roomText && right.roomText && normalizeText(left.roomText) === normalizeText(right.roomText)) {
    return { score: 1, reason: `Trùng phòng/khu vực: ${left.roomText}` };
  }
  if (left.buildingId && left.buildingId === right.buildingId) {
    return { score: 0.7, reason: "Cùng tòa nhà" };
  }
  if (left.areaId && left.areaId === right.areaId) {
    return { score: 0.4, reason: "Cùng khu vực campus" };
  }

  return { score: 0, reason: "Khác vị trí" };
}

function timeScore(left: MatchCandidatePost, right: MatchCandidatePost) {
  if (!left.lostFoundAt || !right.lostFoundAt) {
    return { score: 0, daysDiff: null };
  }

  const leftTime = new Date(`${left.lostFoundAt.replace(" ", "T")}Z`).getTime();
  const rightTime = new Date(`${right.lostFoundAt.replace(" ", "T")}Z`).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return { score: 0, daysDiff: null };
  }

  const daysDiff = Math.abs(leftTime - rightTime) / (24 * 60 * 60 * 1000);
  if (daysDiff <= 1) {
    return { score: 1, daysDiff };
  }

  return { score: 1 / (1 + daysDiff / 7), daysDiff };
}

function normalizeScore(value: number) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(4));
}

function clampConfig(value: number, fallback: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

async function loadWeights() {
  const [
    threshold,
    suggestionThreshold,
    notificationThreshold,
    highConfidenceThreshold,
    autoMarkMatchedEnabled,
    weightText,
    weightCategory,
    weightLocation,
    weightTime,
    weightImage,
    weightOcr
  ] = await Promise.all([
    postRepository.getConfigNumber("matching.weak_threshold", 0.45),
    postRepository.getConfigNumber("matching.suggestion_threshold", 0.6),
    postRepository.getConfigNumber("matching.notification_threshold", 0.75),
    postRepository.getConfigNumber("matching.high_confidence_threshold", 0.85),
    postRepository.getConfigNumber("matching.auto_mark_matched_enabled", 0),
    postRepository.getConfigNumber("matching.weight_text", 0.3),
    postRepository.getConfigNumber("matching.weight_category", 0.2),
    postRepository.getConfigNumber("matching.weight_location", 0.15),
    postRepository.getConfigNumber("matching.weight_time", 0.1),
    postRepository.getConfigNumber("matching.weight_image", 0.15),
    postRepository.getConfigNumber("matching.weight_ocr", 0.1)
  ]);

  const rawWeights = {
    weightText,
    weightCategory,
    weightLocation,
    weightTime,
    weightImage,
    weightOcr
  };
  const weightSum = Object.values(rawWeights).reduce((sum, value) => sum + Math.max(0, value), 0) || 1;

  return {
    threshold: clampConfig(threshold, 0.45),
    suggestionThreshold: clampConfig(suggestionThreshold, 0.6),
    notificationThreshold: clampConfig(notificationThreshold, 0.75),
    highConfidenceThreshold: clampConfig(highConfidenceThreshold, 0.85),
    autoMarkMatchedEnabled: autoMarkMatchedEnabled >= 1,
    weightText: Math.max(0, rawWeights.weightText) / weightSum,
    weightCategory: Math.max(0, rawWeights.weightCategory) / weightSum,
    weightLocation: Math.max(0, rawWeights.weightLocation) / weightSum,
    weightTime: Math.max(0, rawWeights.weightTime) / weightSum,
    weightImage: Math.max(0, rawWeights.weightImage) / weightSum,
    weightOcr: Math.max(0, rawWeights.weightOcr) / weightSum
  };
}

function pairIds(left: MatchCandidatePost, right: MatchCandidatePost) {
  return left.type === "LOST"
    ? { lostPostId: left.id, foundPostId: right.id }
    : { lostPostId: right.id, foundPostId: left.id };
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function tierForScore(totalScore: number, weights: Awaited<ReturnType<typeof loadWeights>>): ScoreExplanation["tier"] {
  if (totalScore >= weights.highConfidenceThreshold) {
    return "HIGH_CONFIDENCE";
  }
  if (totalScore >= weights.notificationThreshold) {
    return "NOTIFY";
  }
  if (totalScore >= weights.suggestionThreshold) {
    return "SUGGESTION";
  }
  return "WEAK";
}

function applyCaps(input: {
  totalScore: number;
  categoryScore: number;
  locationScore: number;
  timeScore: number;
  daysDiff: number | null;
  textScore: number;
  imageScore: number;
  ocrScore: number;
}) {
  let totalScore = input.totalScore;
  const penalties: string[] = [];
  const strongPrivateSignal = input.ocrScore >= 0.5 || input.imageScore >= 0.7 || input.textScore >= 0.75;

  if (input.categoryScore === 0 && !strongPrivateSignal && totalScore > 0.55) {
    totalScore = 0.55;
    penalties.push("Khác danh mục và không có tín hiệu riêng mạnh, giới hạn điểm tối đa 55%.");
  } else if (input.categoryScore === 0 && totalScore > 0.69) {
    totalScore = 0.69;
    penalties.push("Khác danh mục, giới hạn điểm tối đa 69%.");
  }

  if (input.daysDiff !== null && input.daysDiff > 30 && input.ocrScore < 0.5 && totalScore > 0.59) {
    totalScore = 0.59;
    penalties.push("Lệch thời gian hơn 30 ngày và OCR/serial không mạnh, giới hạn điểm tối đa 59%.");
  }

  if (input.locationScore === 0 && input.textScore < 0.35 && input.imageScore < 0.35 && input.ocrScore < 0.35 && totalScore > 0.6) {
    totalScore = 0.6;
    penalties.push("Khác vị trí và nội dung/ảnh/OCR yếu, giới hạn điểm tối đa 60%.");
  }

  return { totalScore, penalties };
}

function buildScoreDetail(
  post: MatchCandidatePost,
  candidate: MatchCandidatePost,
  postVector: Map<string, number>,
  candidateVector: Map<string, number>,
  weights: Awaited<ReturnType<typeof loadWeights>>
): ScoreDetail {
  const matchedText = overlapRatio(post.text, candidate.text);
  const matchedImage = overlapRatio(post.imageText, candidate.imageText);
  const matchedOcr = overlapRatio(post.ocrText, candidate.ocrText, 3);
  const category = categoryScore(post, candidate);
  const location = locationScore(post, candidate);
  const temporal = timeScore(post, candidate);

  const textScore = normalizeScore(Math.max(cosineSimilarity(postVector, candidateVector), matchedText.score));
  const catScore = normalizeScore(category.score);
  const locScore = normalizeScore(location.score);
  const temporalScore = normalizeScore(temporal.score);
  const imageScore = normalizeScore(matchedImage.score);
  const ocrScore = normalizeScore(matchedOcr.score);
  const uncappedScore =
    weights.weightText * textScore +
    weights.weightCategory * catScore +
    weights.weightLocation * locScore +
    weights.weightTime * temporalScore +
    weights.weightImage * imageScore +
    weights.weightOcr * ocrScore;
  const capped = applyCaps({
    totalScore: uncappedScore,
    categoryScore: catScore,
    locationScore: locScore,
    timeScore: temporalScore,
    daysDiff: temporal.daysDiff,
    textScore,
    imageScore,
    ocrScore
  });
  const totalScore = normalizeScore(capped.totalScore);
  const tier = tierForScore(totalScore, weights);

  return {
    textScore,
    categoryScore: catScore,
    locationScore: locScore,
    timeScore: temporalScore,
    imageScore,
    ocrScore,
    totalScore,
    explanation: {
      tier,
      summary: `Hai bài có độ tương đồng ${percent(totalScore)} (${tier}).`,
      reasons: [
        `nội dung ${percent(textScore)}`,
        `danh mục ${percent(catScore)}`,
        `vị trí ${percent(locScore)}`,
        `thời gian ${percent(temporalScore)}`,
        `ảnh/tag ${percent(imageScore)}`,
        `OCR/serial ${percent(ocrScore)}`
      ],
      matchedTokens: matchedText.tokens.slice(0, 12),
      matchedImageTags: matchedImage.tokens.slice(0, 12),
      matchedOcrTokens: matchedOcr.tokens.slice(0, 12),
      locationReason: location.reason,
      categoryReason: category.reason,
      daysDiff: temporal.daysDiff === null ? null : Number(temporal.daysDiff.toFixed(2)),
      penalties: capped.penalties
    }
  };
}

async function notifyHighConfidenceMatch(
  post: MatchCandidatePost,
  candidate: MatchCandidatePost,
  match: MatchRunResult,
  options: { autoMarkMatchedEnabled: boolean }
) {
  if (match.isNotified) {
    return;
  }

  const claimedNotification = await postRepository.markMatchNotified(match.id);
  if (!claimedNotification) {
    match.isNotified = true;
    return;
  }

  if (options.autoMarkMatchedEnabled) {
    await postRepository.markPairMatched(match.lostPostId, match.foundPostId);
  }

  const lostPost = post.type === "LOST" ? post : candidate;
  const foundPost = post.type === "FOUND" ? post : candidate;
  const scoreText = percent(match.totalScore);

  await notificationRepository.createMany([
    {
      userId: lostPost.userId,
      type: "MATCH_FOUND",
      title: "Có vật nhặt được giống bài mất đồ của bạn",
      body: `"${foundPost.title}" giống ${scoreText} với bài "${lostPost.title}". Hãy kiểm tra thông tin trước khi gửi yêu cầu nhận đồ.`,
      entityType: "POST",
      entityId: foundPost.id
    },
    {
      userId: foundPost.userId,
      type: "MATCH_FOUND",
      title: "Có bài mất đồ mới giống vật bạn đã đăng",
      body: `"${lostPost.title}" giống ${scoreText} với bài "${foundPost.title}". Kết quả chỉ là gợi ý để đối chiếu.`,
      entityType: "POST",
      entityId: lostPost.id
    }
  ]);

  match.isNotified = true;
}

async function buildMatchSuggestions(postId: string, matches: MatchRunResult[], minimumScore: number) {
  const sourcePost = await postRepository.findById(postId);
  if (!sourcePost) {
    return [];
  }

  const relevantMatches = matches
    .filter((match) => match.totalScore >= minimumScore)
    .sort((left, right) => right.totalScore - left.totalScore);
  const counterpartIds = relevantMatches.map((match) =>
    sourcePost.type === "LOST" ? match.foundPostId : match.lostPostId
  );
  const posts = await postRepository.findByIds(counterpartIds);
  const postById = new Map(posts.map((post) => [post.id, post]));

  return relevantMatches
    .map((match) => {
      const counterpartId = sourcePost.type === "LOST" ? match.foundPostId : match.lostPostId;
      const post = postById.get(counterpartId);
      return post ? { match, post } : null;
    })
    .filter((suggestion): suggestion is { match: MatchRunResult; post: NonNullable<typeof posts[number]> } =>
      Boolean(suggestion)
    );
}

export const matchingService = {
  async runForPost(postId: string) {
    const post = await postRepository.findMatchPostById(postId);
    if (!post) {
      return [];
    }

    const candidates = await postRepository.listOppositeOpenPosts(post.type, post.id);
    if (candidates.length === 0) {
      return [];
    }

    const weights = await loadWeights();
    const documents = [post, ...candidates].map((candidate) =>
      `${candidate.text} ${candidate.imageText} ${candidate.ocrText}`.trim()
    );
    const vectors = buildTfidfVectors(documents);
    const postVector = vectors[0];
    const results: MatchRunResult[] = [];

    for (const [index, candidate] of candidates.entries()) {
      const ids = pairIds(post, candidate);
      const detail = buildScoreDetail(post, candidate, postVector, vectors[index + 1], weights);

      if (detail.totalScore < weights.threshold) {
        await postRepository.deleteMatchPair(ids.lostPostId, ids.foundPostId);
        continue;
      }

      const match = await postRepository.upsertMatchResult({
        ...ids,
        totalScore: detail.totalScore,
        textScore: detail.textScore,
        categoryScore: detail.categoryScore,
        locationScore: detail.locationScore,
        timeScore: detail.timeScore,
        imageScore: detail.imageScore,
        ocrScore: detail.ocrScore,
        scoreTier: detail.explanation.tier,
        matcherVersion: "rule-v1",
        explanation: detail.explanation
      });
      const enrichedMatch: MatchRunResult = {
        ...match,
        imageScore: detail.imageScore,
        ocrScore: detail.ocrScore,
        tier: detail.explanation.tier,
        explanation: detail.explanation
      };
      results.push(enrichedMatch);

      if (detail.totalScore >= weights.notificationThreshold) {
        await notifyHighConfidenceMatch(post, candidate, enrichedMatch, {
          autoMarkMatchedEnabled: weights.autoMarkMatchedEnabled
        });
      }
    }

    return results;
  },

  async buildSuggestions(postId: string, matches: MatchRunResult[], minimumScore?: number) {
    const score = minimumScore ?? (await postRepository.getConfigNumber("matching.suggestion_threshold", 0.6));
    return buildMatchSuggestions(postId, matches, score);
  },

  async listMatches(postId: string) {
    return postRepository.listMatchesForPost(postId);
  },

  async explainMatches(postId: string) {
    const [matches, weights] = await Promise.all([postRepository.listMatchesForPost(postId), loadWeights()]);
    const counterpartIds = matches.map((match) => (match.lostPostId === postId ? match.foundPostId : match.lostPostId));
    const matchPosts = await postRepository.findMatchPostsByIds([postId, ...counterpartIds]);
    const postById = new Map(matchPosts.map((post) => [post.id, post]));
    const sourcePost = postById.get(postId);
    return matches.map((match) => {
        const counterpartId = match.lostPostId === postId ? match.foundPostId : match.lostPostId;
        const counterpart = postById.get(counterpartId);
        let explanation: ScoreExplanation = {
          tier: tierForScore(match.totalScore, weights),
          summary: `Hai bài có độ tương đồng ${percent(match.totalScore)}.`,
          reasons: [
            `nội dung ${percent(match.textScore)}`,
            `danh mục ${percent(match.categoryScore)}`,
            `vị trí ${percent(match.locationScore)}`,
            `thời gian ${percent(match.timeScore)}`
          ],
          matchedTokens: [],
          matchedImageTags: [],
          matchedOcrTokens: [],
          locationReason: "Cần đối chiếu vị trí trong chi tiết bài đăng",
          categoryReason: "Cần đối chiếu danh mục trong chi tiết bài đăng",
          daysDiff: null,
          penalties: []
        };
        let imageScore = 0;
        let ocrScore = 0;

        if (sourcePost && counterpart) {
          const vectors = buildTfidfVectors([
            `${sourcePost.text} ${sourcePost.imageText} ${sourcePost.ocrText}`,
            `${counterpart.text} ${counterpart.imageText} ${counterpart.ocrText}`
          ]);
          const detail = buildScoreDetail(sourcePost, counterpart, vectors[0], vectors[1], weights);
          explanation = detail.explanation;
          imageScore = detail.imageScore;
          ocrScore = detail.ocrScore;
        }

        return {
          matchId: match.id,
          lostPostId: match.lostPostId,
          foundPostId: match.foundPostId,
          totalScore: match.totalScore,
          textScore: match.textScore,
          categoryScore: match.categoryScore,
          locationScore: match.locationScore,
          timeScore: match.timeScore,
          imageScore,
          ocrScore,
          ...explanation
        };
      });
  }
};
