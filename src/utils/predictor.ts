import type {
  AlgorithmWeights,
  PredictionInput,
  PredictionRecord,
  PredictionResult,
  Suggestion,
} from "@/types";
import { DEFAULT_WEIGHTS } from "@/types";

export function detectTimePeriod(): PredictionInput["timePeriod"] {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 10) return "morning";
  if (hour >= 11 && hour < 14) return "noon";
  if (hour >= 17 && hour < 20) return "evening";
  return "other";
}

export function calculateHistoricalMultiplier(records: PredictionRecord[]): number {
  const recentRecords = records
    .filter((r) => r.actualSeconds !== null)
    .slice(-20);

  if (recentRecords.length < 3) return 1.0;

  const ratios = recentRecords.map((r) => {
    const actual = r.actualSeconds!;
    if (r.predictedSeconds <= 0) return 1;
    return actual / r.predictedSeconds;
  });

  const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const clamped = Math.max(0.6, Math.min(1.6, avgRatio));
  return Number(clamped.toFixed(2));
}

export function calculateConfidence(records: PredictionRecord[]): number {
  const validRecords = records.filter((r) => r.actualSeconds !== null);
  if (validRecords.length === 0) return 65;
  if (validRecords.length < 5) return 70;
  if (validRecords.length < 15) return 80;
  if (validRecords.length < 30) return 88;
  return 95;
}

export function predictWaitTime(
  input: PredictionInput,
  weights: AlgorithmWeights = DEFAULT_WEIGHTS,
  historicalMultiplier: number = 1.0
): PredictionResult {
  const { currentFloor, totalFloors, timePeriod } = input;

  const safeCurrent = Math.max(1, Math.min(currentFloor, totalFloors));
  const safeTotal = Math.max(2, totalFloors);

  const floorDiff = Math.max(1, Math.min(safeCurrent - 1, safeTotal - safeCurrent));
  const periodMultiplier = weights.periodMultipliers[timePeriod] ?? 1.0;

  const baseTime = weights.baseWaitTime;
  const floorTime = floorDiff * weights.secondsPerFloor;
  const travelTime = (baseTime + floorTime) * periodMultiplier * historicalMultiplier;

  const predictedSeconds = Math.max(5, Math.round(travelTime));

  let suggestion: Suggestion;
  let suggestionReason: string;
  if (predictedSeconds <= weights.stairsThreshold || floorDiff <= weights.stairsFloorThreshold) {
    suggestion = "elevator";
    suggestionReason = "等待时间可接受，等电梯更省力";
  } else {
    suggestion = "stairs";
    suggestionReason = "等待时间较长，走楼梯更快";
  }

  return {
    predictedSeconds,
    suggestion,
    suggestionReason,
    confidence: 0,
    floorDiff,
    breakdown: {
      baseTime,
      floorTime,
      periodMultiplier,
      historicalMultiplier,
    },
  };
}

export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} 秒`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${mins} 分钟`;
  }
  return `${mins} 分 ${secs} 秒`;
}

export function calculateAccuracy(predicted: number, actual: number): number {
  if (predicted <= 0) return 0;
  const diff = Math.abs(predicted - actual);
  const accuracy = Math.max(0, 100 - (diff / predicted) * 100);
  return Math.round(accuracy);
}

export function getAccuracyLevel(accuracy: number): "high" | "medium" | "low" {
  if (accuracy >= 80) return "high";
  if (accuracy >= 50) return "medium";
  return "low";
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
