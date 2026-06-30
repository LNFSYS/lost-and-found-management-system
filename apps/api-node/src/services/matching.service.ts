import { postRepository, type MatchCandidatePost } from "../repositories/post.repository.js";
import { notificationRepository } from "../repositories/notification.repository.js";
import { normalizeText } from "../utils/normalize-text.js";

interface WeightedScores {
  textScore: number;
  categoryScore: number;
  locationScore: number;
  timeScore: number;
  totalScore: number;
}

export interface MatchRunResult extends WeightedScores {
  id: string;
  lostPostId: string;
  foundPostId: string;
  isNotified: boolean;
  createdAt: string;
}

function tokenize(text: string) {
  return text
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
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
  const tokenized = documents.map(tokenize);
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
    return 0;
  }
  if (left.categoryId === right.categoryId) {
    return 1;
  }
  if (
    (left.parentCategoryId && left.parentCategoryId === right.parentCategoryId) ||
    left.parentCategoryId === right.categoryId ||
    right.parentCategoryId === left.categoryId
  ) {
    return 0.5;
  }

  return 0;
}

function locationScore(left: MatchCandidatePost, right: MatchCandidatePost) {
  if (left.roomText && right.roomText && normalizeText(left.roomText) === normalizeText(right.roomText)) {
    return 1;
  }
  if (left.buildingId && left.buildingId === right.buildingId) {
    return 0.7;
  }
  if (left.areaId && left.areaId === right.areaId) {
    return 0.4;
  }

  return 0;
}

function timeScore(left: MatchCandidatePost, right: MatchCandidatePost) {
  if (!left.lostFoundAt || !right.lostFoundAt) {
    return 0;
  }

  const leftTime = new Date(`${left.lostFoundAt.replace(" ", "T")}Z`).getTime();
  const rightTime = new Date(`${right.lostFoundAt.replace(" ", "T")}Z`).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
    return 0;
  }

  const daysDiff = Math.abs(leftTime - rightTime) / (24 * 60 * 60 * 1000);
  if (daysDiff <= 1) {
    return 1;
  }

  return 1 / (1 + daysDiff / 7);
}

function normalizeScore(value: number) {
  return Number(value.toFixed(4));
}

async function loadWeights() {
  const [threshold, notificationThreshold, weightText, weightCategory, weightLocation, weightTime] = await Promise.all([
    postRepository.getConfigNumber("matching.threshold", 0.4),
    postRepository.getConfigNumber("matching.notification_threshold", 0.8),
    postRepository.getConfigNumber("matching.weight_text", 0.4),
    postRepository.getConfigNumber("matching.weight_category", 0.3),
    postRepository.getConfigNumber("matching.weight_location", 0.2),
    postRepository.getConfigNumber("matching.weight_time", 0.1)
  ]);

  return {
    threshold,
    notificationThreshold,
    weightText,
    weightCategory,
    weightLocation,
    weightTime
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

function explainScore(match: MatchRunResult) {
  const reasons = [
    `text ${percent(match.textScore)}`,
    `category ${percent(match.categoryScore)}`,
    `location ${percent(match.locationScore)}`,
    `time ${percent(match.timeScore)}`
  ];
  const strongest = [
    { label: "mô tả", score: match.textScore },
    { label: "danh mục", score: match.categoryScore },
    { label: "vị trí", score: match.locationScore },
    { label: "thời gian", score: match.timeScore }
  ]
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .filter((item) => item.score > 0)
    .map((item) => item.label);

  return {
    summary:
      strongest.length > 0
        ? `Hai bai co do tuong dong ${percent(match.totalScore)}, noi bat o ${strongest.join(" va ")}.`
        : `Hai bai co do tuong dong ${percent(match.totalScore)}.`,
    reasons
  };
}

async function notifyHighConfidenceMatch(
  post: MatchCandidatePost,
  candidate: MatchCandidatePost,
  match: MatchRunResult
) {
  if (match.isNotified) {
    return;
  }

  await postRepository.markPairMatched(match.lostPostId, match.foundPostId);

  const lostPost = post.type === "LOST" ? post : candidate;
  const foundPost = post.type === "FOUND" ? post : candidate;
  const scoreText = percent(match.totalScore);

  await notificationRepository.createMany([
    {
      userId: lostPost.userId,
      type: "MATCH_FOUND",
      title: "Có vật nhặt được giống bài mất đồ của bạn",
      body: `"${foundPost.title}" giống ${scoreText} với bài "${lostPost.title}".`,
      entityType: "POST",
      entityId: foundPost.id
    },
    {
      userId: foundPost.userId,
      type: "MATCH_FOUND",
      title: "Có bài mất đồ mới giống vật bạn đã đăng",
      body: `"${lostPost.title}" giống ${scoreText} với bài "${foundPost.title}".`,
      entityType: "POST",
      entityId: lostPost.id
    }
  ]);

  await postRepository.markMatchNotified(match.id);
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
    const vectors = buildTfidfVectors([post.text, ...candidates.map((candidate) => candidate.text)]);
    const postVector = vectors[0];
    const results: MatchRunResult[] = [];

    for (const [index, candidate] of candidates.entries()) {
      const textScore = normalizeScore(cosineSimilarity(postVector, vectors[index + 1]));
      const catScore = normalizeScore(categoryScore(post, candidate));
      const locScore = normalizeScore(locationScore(post, candidate));
      const temporalScore = normalizeScore(timeScore(post, candidate));
      const totalScore = normalizeScore(
        weights.weightText * textScore +
          weights.weightCategory * catScore +
          weights.weightLocation * locScore +
          weights.weightTime * temporalScore
      );

      if (totalScore < weights.threshold) {
        continue;
      }

      const ids = pairIds(post, candidate);
      const match = await postRepository.upsertMatchResult({
        ...ids,
        totalScore,
        textScore,
        categoryScore: catScore,
        locationScore: locScore,
        timeScore: temporalScore
      });
      results.push(match);

      if (totalScore >= weights.notificationThreshold) {
        await notifyHighConfidenceMatch(post, candidate, match);
      }
    }

    return results;
  },

  async buildSuggestions(postId: string, matches: MatchRunResult[], minimumScore?: number) {
    const score = minimumScore ?? (await postRepository.getConfigNumber("matching.threshold", 0.4));
    return buildMatchSuggestions(postId, matches, score);
  },

  async listMatches(postId: string) {
    return postRepository.listMatchesForPost(postId);
  },

  async explainMatches(postId: string) {
    const matches = await postRepository.listMatchesForPost(postId);
    return matches.map((match) => ({
      matchId: match.id,
      lostPostId: match.lostPostId,
      foundPostId: match.foundPostId,
      totalScore: match.totalScore,
      ...explainScore(match)
    }));
  }
};
