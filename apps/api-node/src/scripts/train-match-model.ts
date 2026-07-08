import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type Label = "TRUE_MATCH" | "FALSE_MATCH" | "UNCERTAIN" | "DUPLICATE" | "INSUFFICIENT_EVIDENCE";

interface TrainingRow {
  schemaVersion: number;
  matchId: string;
  lostPostId: string;
  foundPostId: string;
  scores: {
    total: number;
    text: number;
    category: number;
    location: number;
    time: number;
    image: number;
    ocr: number;
    tier: string;
    matcherVersion: string;
  };
  lost: {
    title: string;
    description: string;
    categoryId: string | null;
    areaId: string | null;
    buildingId: string | null;
    roomText: string;
    lostFoundAt: string | null;
    tags: string;
  };
  found: {
    title: string;
    description: string;
    categoryId: string | null;
    areaId: string | null;
    buildingId: string | null;
    roomText: string;
    lostFoundAt: string | null;
    tags: string;
  };
  labels: string[];
  behavior: {
    impressions: number;
    clicks: number;
    claimStarts: number;
  };
}

interface Example {
  row: TrainingRow;
  label: 0 | 1;
  features: number[];
}

const featureNames = [
  "score.total",
  "score.text",
  "score.category",
  "score.location",
  "score.time",
  "score.image",
  "score.ocr",
  "tier.suggestion",
  "tier.notify",
  "tier.high_confidence",
  "same.category",
  "same.area",
  "same.building",
  "same.room",
  "days.proximity",
  "text.jaccard",
  "tag.jaccard",
  "behavior.log_impressions",
  "behavior.log_clicks",
  "behavior.log_claim_starts"
] as const;

function numberFromEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number`);
  }
  return parsed;
}

function parseLabel(labels: string[]): 0 | 1 | null {
  const parsed = labels.map((label) => {
    const [value, source = "USER"] = label.split(":");
    return { value: value as Label, source };
  });
  const trusted = parsed.filter((label) => label.source === "STAFF" || label.source === "ADMIN");
  const usable = trusted.length > 0 ? trusted : parsed;
  const values = usable.map((label) => label.value);
  const hasPositive = values.includes("TRUE_MATCH");
  const hasNegative = values.some((label) => label === "FALSE_MATCH" || label === "DUPLICATE" || label === "INSUFFICIENT_EVIDENCE");

  if (hasPositive && hasNegative) {
    return null;
  }
  if (hasPositive) {
    return 1;
  }
  if (hasNegative) {
    return 0;
  }
  return null;
}

function tokenize(text: string) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\u00c0-\u1ef9]+/gi, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2 && !token.startsWith("["))
  );
}

function jaccard(leftText: string, rightText: string) {
  const left = tokenize(leftText);
  const right = tokenize(rightText);
  if (left.size === 0 || right.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) {
      intersection += 1;
    }
  }
  return intersection / (left.size + right.size - intersection);
}

function daysProximity(left: string | null, right: string | null) {
  if (!left || !right) {
    return 0;
  }
  const leftMs = new Date(left).getTime();
  const rightMs = new Date(right).getTime();
  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) {
    return 0;
  }

  const days = Math.abs(leftMs - rightMs) / (24 * 60 * 60 * 1000);
  return 1 / (1 + days / 7);
}

function same(left: string | null, right: string | null) {
  return left && right && left === right ? 1 : 0;
}

function buildFeatures(row: TrainingRow) {
  return [
    row.scores.total,
    row.scores.text,
    row.scores.category,
    row.scores.location,
    row.scores.time,
    row.scores.image,
    row.scores.ocr,
    row.scores.tier === "SUGGESTION" ? 1 : 0,
    row.scores.tier === "NOTIFY" ? 1 : 0,
    row.scores.tier === "HIGH_CONFIDENCE" ? 1 : 0,
    same(row.lost.categoryId, row.found.categoryId),
    same(row.lost.areaId, row.found.areaId),
    same(row.lost.buildingId, row.found.buildingId),
    row.lost.roomText && row.found.roomText && row.lost.roomText === row.found.roomText ? 1 : 0,
    daysProximity(row.lost.lostFoundAt, row.found.lostFoundAt),
    jaccard(`${row.lost.title} ${row.lost.description}`, `${row.found.title} ${row.found.description}`),
    jaccard(row.lost.tags, row.found.tags),
    Math.log1p(row.behavior.impressions),
    Math.log1p(row.behavior.clicks),
    Math.log1p(row.behavior.claimStarts)
  ];
}

function sigmoid(value: number) {
  if (value < -35) {
    return 0;
  }
  if (value > 35) {
    return 1;
  }
  return 1 / (1 + Math.exp(-value));
}

function dot(left: number[], right: number[]) {
  return left.reduce((sum, value, index) => sum + value * (right[index] ?? 0), 0);
}

function stableHash(value: string) {
  return createHash("sha256").update(value).digest().readUInt32BE(0);
}

async function findDefaultTrainingFile() {
  const directory = path.resolve(process.cwd(), "training-exports");
  const files = (await readdir(directory).catch(() => []))
    .filter((file) => file.startsWith("match-training-") && file.endsWith(".jsonl"))
    .sort();
  const latest = files.at(-1);
  return latest ? path.join(directory, latest) : null;
}

async function loadExamples(filePath: string) {
  const content = await readFile(filePath, "utf8");
  const examples: Example[] = [];

  for (const [index, rawLine] of content.split(/\r?\n/).entries()) {
    const line = rawLine.replace(/^\uFEFF/, "");
    if (!line.trim()) {
      continue;
    }

    const row = JSON.parse(line) as TrainingRow;
    const label = parseLabel(row.labels ?? []);
    if (label === null) {
      continue;
    }

    const features = buildFeatures(row);
    if (features.some((value) => !Number.isFinite(value))) {
      throw new Error(`Invalid numeric feature at line ${index + 1}`);
    }
    examples.push({ row, label, features });
  }

  return examples;
}

function splitExamples(examples: Example[]) {
  const validationRatio = numberFromEnv("MATCH_MODEL_VALIDATION_RATIO", 0.2);
  const validationModulo = Math.max(1, Math.round(1 / validationRatio));
  const train: Example[] = [];
  const validation: Example[] = [];

  for (const example of examples) {
    if (stableHash(example.row.matchId) % validationModulo === 0) {
      validation.push(example);
    } else {
      train.push(example);
    }
  }

  if (train.length === 0 || validation.length === 0) {
    return { train: examples, validation: examples };
  }

  return { train, validation };
}

function normalization(examples: Example[]) {
  const means = Array(featureNames.length).fill(0) as number[];
  const stds = Array(featureNames.length).fill(1) as number[];

  for (const example of examples) {
    example.features.forEach((value, index) => {
      means[index] += value;
    });
  }
  for (const index of means.keys()) {
    means[index] /= Math.max(examples.length, 1);
  }
  for (const example of examples) {
    example.features.forEach((value, index) => {
      stds[index] += (value - means[index]) ** 2;
    });
  }
  for (const index of stds.keys()) {
    stds[index] = Math.sqrt(stds[index] / Math.max(examples.length, 1)) || 1;
  }

  return { means, stds };
}

function normalizeFeatures(features: number[], means: number[], stds: number[]) {
  return features.map((value, index) => (value - means[index]) / stds[index]);
}

function trainLogisticRegression(examples: Example[], means: number[], stds: number[]) {
  const learningRate = numberFromEnv("MATCH_MODEL_LEARNING_RATE", 0.08);
  const epochs = numberFromEnv("MATCH_MODEL_EPOCHS", 1200);
  const l2 = numberFromEnv("MATCH_MODEL_L2", 0.002);
  const positiveCount = examples.filter((example) => example.label === 1).length;
  const negativeCount = examples.length - positiveCount;
  const positiveWeight = examples.length / Math.max(1, 2 * positiveCount);
  const negativeWeight = examples.length / Math.max(1, 2 * negativeCount);
  const weights = Array(featureNames.length + 1).fill(0) as number[];

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    const gradients = Array(weights.length).fill(0) as number[];
    for (const example of examples) {
      const normalized = normalizeFeatures(example.features, means, stds);
      const x = [1, ...normalized];
      const probability = sigmoid(dot(weights, x));
      const error = probability - example.label;
      const sampleWeight = example.label === 1 ? positiveWeight : negativeWeight;
      for (const index of gradients.keys()) {
        gradients[index] += sampleWeight * error * x[index];
      }
    }

    for (const index of weights.keys()) {
      const regularization = index === 0 ? 0 : l2 * weights[index];
      weights[index] -= learningRate * (gradients[index] / examples.length + regularization);
    }
  }

  return weights;
}

function predict(example: Example, weights: number[], means: number[], stds: number[]) {
  return sigmoid(dot(weights, [1, ...normalizeFeatures(example.features, means, stds)]));
}

function metrics(examples: Example[], weights: number[], means: number[], stds: number[], threshold = 0.5) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const example of examples) {
    const predicted = predict(example, weights, means, stds) >= threshold ? 1 : 0;
    if (predicted === 1 && example.label === 1) tp += 1;
    if (predicted === 1 && example.label === 0) fp += 1;
    if (predicted === 0 && example.label === 0) tn += 1;
    if (predicted === 0 && example.label === 1) fn += 1;
  }

  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const accuracy = (tp + tn) / Math.max(1, examples.length);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { threshold, accuracy, precision, recall, f1, confusion: { tp, fp, tn, fn } };
}

function findBestThreshold(examples: Example[], weights: number[], means: number[], stds: number[]) {
  let best = metrics(examples, weights, means, stds, 0.5);
  for (let threshold = 0.1; threshold <= 0.9; threshold += 0.01) {
    const current = metrics(examples, weights, means, stds, Number(threshold.toFixed(2)));
    if (current.f1 > best.f1) {
      best = current;
    }
  }
  return best;
}

function ruleMetrics(examples: Example[], threshold: number) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (const example of examples) {
    const predicted = example.row.scores.total >= threshold ? 1 : 0;
    if (predicted === 1 && example.label === 1) tp += 1;
    if (predicted === 1 && example.label === 0) fp += 1;
    if (predicted === 0 && example.label === 0) tn += 1;
    if (predicted === 0 && example.label === 1) fn += 1;
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const accuracy = (tp + tn) / Math.max(1, examples.length);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return { threshold, accuracy, precision, recall, f1, confusion: { tp, fp, tn, fn } };
}

function precisionAtK(examples: Example[], score: (example: Example) => number, k: number) {
  const grouped = new Map<string, Example[]>();
  for (const example of examples) {
    const key = example.row.lostPostId;
    grouped.set(key, [...(grouped.get(key) ?? []), example]);
  }

  let groupsWithPositive = 0;
  let hits = 0;
  for (const group of grouped.values()) {
    if (!group.some((example) => example.label === 1)) {
      continue;
    }
    groupsWithPositive += 1;
    const top = group.slice().sort((left, right) => score(right) - score(left)).slice(0, k);
    if (top.some((example) => example.label === 1)) {
      hits += 1;
    }
  }

  return groupsWithPositive === 0 ? 0 : hits / groupsWithPositive;
}

async function main() {
  const inputPath = process.env.TRAINING_DATA_PATH ?? (await findDefaultTrainingFile());
  if (!inputPath) {
    throw new Error("No training file found. Run npm run export:training-data first, or set TRAINING_DATA_PATH.");
  }

  const examples = await loadExamples(inputPath);
  const minimumRows = numberFromEnv("MATCH_MODEL_MIN_ROWS", 20);
  const positives = examples.filter((example) => example.label === 1).length;
  const negatives = examples.length - positives;
  if (examples.length < minimumRows || positives === 0 || negatives === 0) {
    throw new Error(
      `Not enough labeled data to train. Need at least ${minimumRows} labeled rows with both classes; got ${examples.length} rows, ${positives} positives, ${negatives} negatives.`
    );
  }

  const { train, validation } = splitExamples(examples);
  const { means, stds } = normalization(train);
  const weights = trainLogisticRegression(train, means, stds);
  const validationBest = findBestThreshold(validation, weights, means, stds);
  const artifact = {
    modelType: "logistic_regression_match_reranker",
    modelVersion: `match-logreg-${new Date().toISOString()}`,
    createdAt: new Date().toISOString(),
    inputPath,
    labelPolicy: {
      positive: ["TRUE_MATCH"],
      negative: ["FALSE_MATCH", "DUPLICATE", "INSUFFICIENT_EVIDENCE"],
      ignored: ["UNCERTAIN", "unlabeled", "conflicting labels"],
      priority: "STAFF/ADMIN labels override user labels when present"
    },
    featureNames,
    normalization: { means, stds },
    weights,
    recommendedThreshold: validationBest.threshold,
    dataset: {
      totalLabeledRows: examples.length,
      trainRows: train.length,
      validationRows: validation.length,
      positives,
      negatives
    },
    metrics: {
      train: findBestThreshold(train, weights, means, stds),
      validation: validationBest,
      topK: {
        modelPrecisionAt1: precisionAtK(validation, (example) => predict(example, weights, means, stds), 1),
        modelPrecisionAt3: precisionAtK(validation, (example) => predict(example, weights, means, stds), 3),
        modelPrecisionAt5: precisionAtK(validation, (example) => predict(example, weights, means, stds), 5),
        rulePrecisionAt1: precisionAtK(validation, (example) => example.row.scores.total, 1),
        rulePrecisionAt3: precisionAtK(validation, (example) => example.row.scores.total, 3),
        rulePrecisionAt5: precisionAtK(validation, (example) => example.row.scores.total, 5)
      },
      ruleBaseline: {
        suggestion60: ruleMetrics(validation, 0.6),
        notify75: ruleMetrics(validation, 0.75),
        highConfidence85: ruleMetrics(validation, 0.85)
      }
    }
  };

  const outputDirectory = path.resolve(process.cwd(), "model-artifacts");
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, "match-ranker-logreg.json");
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");

  console.log(`Trained match logistic regression model with ${examples.length} labeled rows.`);
  console.log(`Validation F1=${validationBest.f1.toFixed(3)}, precision=${validationBest.precision.toFixed(3)}, recall=${validationBest.recall.toFixed(3)}, threshold=${validationBest.threshold}.`);
  console.log(`Saved model artifact to ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
