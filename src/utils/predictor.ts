import type {
  AlgorithmWeights,
  PredictionInput,
  PredictionRecord,
  PredictionResult,
  Suggestion,
  PeriodStats,
  FailureAlert,
  PersonalizedCurveData,
  TimePeriod,
  FloorWaitStats,
  AccuracyStats,
  StatsFilter,
  DayType,
  ElevatorAnomalyReport,
  AnomalyRecord,
  AnomalySeverity,
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

export function calculatePeriodStats(
  records: PredictionRecord[],
  targetTimePeriod?: TimePeriod
): PeriodStats[] {
  const periods: TimePeriod[] = ["morning", "noon", "evening", "other"];
  const filteredRecords = records.filter((r) => r.actualSeconds !== null);

  return periods
    .filter((p) => !targetTimePeriod || p === targetTimePeriod)
    .map((period) => {
      const periodRecords = filteredRecords.filter((r) => r.timePeriod === period);

      if (periodRecords.length === 0) {
        return {
          timePeriod: period,
          avgWaitTime: 0,
          maxWaitTime: 0,
          minWaitTime: 0,
          count: 0,
          variance: 0,
        };
      }

      const actualTimes = periodRecords.map((r) => r.actualSeconds!);
      const avgWaitTime =
        actualTimes.reduce((sum, time) => sum + time, 0) / actualTimes.length;
      const maxWaitTime = Math.max(...actualTimes);
      const minWaitTime = Math.min(...actualTimes);
      const variance =
        actualTimes.reduce((sum, time) => sum + Math.pow(time - avgWaitTime, 2), 0) /
        actualTimes.length;

      return {
        timePeriod: period,
        avgWaitTime: Math.round(avgWaitTime),
        maxWaitTime,
        minWaitTime,
        count: periodRecords.length,
        variance: Math.round(variance),
      };
    });
}

export function detectFailure(
  actualSeconds: number,
  predictedSeconds: number,
  periodStats: PeriodStats[],
  timePeriod: TimePeriod
): FailureAlert {
  const FAILURE_THRESHOLD_MULTIPLIER = 2.5;
  const ABSOLUTE_FAILURE_THRESHOLD = 180;

  const periodStat = periodStats.find((s) => s.timePeriod === timePeriod);
  const periodMaxWait = periodStat?.maxWaitTime || predictedSeconds;

  const exceedsPrediction = actualSeconds >= predictedSeconds * FAILURE_THRESHOLD_MULTIPLIER;
  const exceedsPeriodMax = periodStat && actualSeconds >= periodMaxWait * 1.8;
  const exceedsAbsolute = actualSeconds >= ABSOLUTE_FAILURE_THRESHOLD;

  const isFailure = exceedsPrediction || exceedsPeriodMax || exceedsAbsolute;

  if (isFailure) {
    const thresholdExceeded = Math.max(
      actualSeconds - predictedSeconds * FAILURE_THRESHOLD_MULTIPLIER,
      0
    );
    return {
      isActive: true,
      message: "可能出了故障，建议走楼梯",
      thresholdExceeded: Math.round(thresholdExceeded),
      predictedTime: predictedSeconds,
      actualTime: actualSeconds,
    };
  }

  return {
    isActive: false,
    message: "",
    thresholdExceeded: 0,
    predictedTime: predictedSeconds,
    actualTime: actualSeconds,
  };
}

export function generatePersonalizedCurve(
  records: PredictionRecord[],
  timePeriod: TimePeriod
): PersonalizedCurveData {
  const validRecords = records.filter(
    (r) => r.actualSeconds !== null && r.timePeriod === timePeriod
  );

  if (validRecords.length < 3) {
    return {
      timePeriod,
      dataPoints: [],
      trendLine: { slope: DEFAULT_WEIGHTS.secondsPerFloor, intercept: DEFAULT_WEIGHTS.baseWaitTime },
    };
  }

  const floorDiffs = validRecords.map((r) => {
    const floorDiff = Math.max(1, Math.min(r.currentFloor - 1, r.totalFloors - r.currentFloor));
    return floorDiff;
  });
  const waitTimes = validRecords.map((r) => r.actualSeconds!);

  const n = floorDiffs.length;
  const sumX = floorDiffs.reduce((a, b) => a + b, 0);
  const sumY = waitTimes.reduce((a, b) => a + b, 0);
  const sumXY = floorDiffs.reduce((sum, x, i) => sum + x * waitTimes[i], 0);
  const sumX2 = floorDiffs.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const dataPoints = Array.from(new Set(floorDiffs)).map((floorDiff) => {
    const matchingRecords = validRecords.filter((r) => {
      const rDiff = Math.max(1, Math.min(r.currentFloor - 1, r.totalFloors - r.currentFloor));
      return rDiff === floorDiff;
    });
    const avgWaitTime =
      matchingRecords.reduce((sum, r) => sum + (r.actualSeconds || 0), 0) / matchingRecords.length;
    return { floorDiff, avgWaitTime: Math.round(avgWaitTime) };
  });

  return {
    timePeriod,
    dataPoints: dataPoints.sort((a, b) => a.floorDiff - b.floorDiff),
    trendLine: { slope: Math.max(0.5, Math.min(5, slope)), intercept: Math.max(2, intercept) },
  };
}

export function predictWithPersonalizedCurve(
  input: PredictionInput,
  personalizedCurve: PersonalizedCurveData,
  periodStats: PeriodStats[],
  weights: AlgorithmWeights = DEFAULT_WEIGHTS
): PredictionResult {
  const { currentFloor, totalFloors, timePeriod } = input;
  const safeCurrent = Math.max(1, Math.min(currentFloor, totalFloors));
  const safeTotal = Math.max(2, totalFloors);
  const floorDiff = Math.max(1, Math.min(safeCurrent - 1, safeTotal - safeCurrent));

  let predictedSeconds: number;

  if (personalizedCurve.dataPoints.length > 0) {
    const { slope, intercept } = personalizedCurve.trendLine;
    predictedSeconds = Math.max(5, Math.round(slope * floorDiff + intercept));
  } else {
    const periodStat = periodStats.find((s) => s.timePeriod === timePeriod);
    if (periodStat && periodStat.count > 0) {
      const baseTime = periodStat.avgWaitTime;
      predictedSeconds = Math.max(5, Math.round(baseTime * (floorDiff / 3)));
    } else {
      const periodMultiplier = weights.periodMultipliers[timePeriod] ?? 1.0;
      const baseTime = weights.baseWaitTime;
      const floorTime = floorDiff * weights.secondsPerFloor;
      predictedSeconds = Math.max(5, Math.round((baseTime + floorTime) * periodMultiplier));
    }
  }

  let suggestion: Suggestion;
  let suggestionReason: string;
  if (predictedSeconds <= weights.stairsThreshold || floorDiff <= weights.stairsFloorThreshold) {
    suggestion = "elevator";
    suggestionReason = "等待时间可接受，等电梯更省力";
  } else {
    suggestion = "stairs";
    suggestionReason = "等待时间较长，走楼梯更快";
  }

  const periodStat = periodStats.find((s) => s.timePeriod === timePeriod);
  let confidence = 65;
  if (periodStat) {
    if (periodStat.count >= 30) confidence = 95;
    else if (periodStat.count >= 15) confidence = 88;
    else if (periodStat.count >= 5) confidence = 80;
    else if (periodStat.count >= 3) confidence = 70;
  }

  return {
    predictedSeconds,
    suggestion,
    suggestionReason,
    confidence,
    floorDiff,
    breakdown: {
      baseTime: weights.baseWaitTime,
      floorTime: floorDiff * weights.secondsPerFloor,
      periodMultiplier: weights.periodMultipliers[timePeriod] ?? 1.0,
      historicalMultiplier: 1.0,
    },
  };
}

export function calculateFloorWaitStats(
  records: PredictionRecord[],
  filter?: StatsFilter
): FloorWaitStats[] {
  const filteredRecords = filter ? filterRecords(records, filter) : records;
  const validRecords = filteredRecords.filter((r) => r.actualSeconds !== null);

  const floorMap = new Map<number, number[]>();
  validRecords.forEach((r) => {
    const floor = r.currentFloor;
    if (!floorMap.has(floor)) {
      floorMap.set(floor, []);
    }
    floorMap.get(floor)!.push(r.actualSeconds!);
  });

  const stats: FloorWaitStats[] = [];
  floorMap.forEach((times, floor) => {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    stats.push({
      floor,
      avgWaitTime: Math.round(avg),
      minWaitTime: Math.min(...times),
      maxWaitTime: Math.max(...times),
      count: times.length,
    });
  });

  return stats.sort((a, b) => a.floor - b.floor);
}

export function calculateAccuracyStats(
  records: PredictionRecord[]
): AccuracyStats {
  const validRecords = records.filter(
    (r) => r.actualSeconds !== null && r.predictedSeconds > 0
  );

  if (validRecords.length === 0) {
    return {
      overallAccuracy: 0,
      overallLevel: "low",
      totalRecords: 0,
      periodAccuracies: [],
      accuracyTrend: "stable",
      highAccuracyCount: 0,
      mediumAccuracyCount: 0,
      lowAccuracyCount: 0,
    };
  }

  const accuracies = validRecords.map((r) =>
    calculateAccuracy(r.predictedSeconds, r.actualSeconds!)
  );

  const overallAccuracy = Math.round(
    accuracies.reduce((a, b) => a + b, 0) / accuracies.length
  );

  const highAccuracyCount = accuracies.filter((a) => a >= 80).length;
  const mediumAccuracyCount = accuracies.filter((a) => a >= 50 && a < 80).length;
  const lowAccuracyCount = accuracies.filter((a) => a < 50).length;

  const periods: TimePeriod[] = ["morning", "noon", "evening", "other"];
  const periodAccuracies = periods
    .map((period) => {
      const periodRecords = validRecords.filter((r) => r.timePeriod === period);
      if (periodRecords.length === 0) return null;
      const periodAccList = periodRecords.map((r) =>
        calculateAccuracy(r.predictedSeconds, r.actualSeconds!)
      );
      const avg = Math.round(
        periodAccList.reduce((a, b) => a + b, 0) / periodAccList.length
      );
      return {
        timePeriod: period,
        accuracy: avg,
        level: getAccuracyLevel(avg) as "high" | "medium" | "low",
        count: periodRecords.length,
      };
    })
    .filter(Boolean) as AccuracyStats["periodAccuracies"];

  let accuracyTrend: "improving" | "stable" | "declining" = "stable";
  if (validRecords.length >= 6) {
    const half = Math.floor(validRecords.length / 2);
    const olderRecords = validRecords.slice(half);
    const newerRecords = validRecords.slice(0, half);
    const olderAvg =
      olderRecords.reduce(
        (sum, r) => sum + calculateAccuracy(r.predictedSeconds, r.actualSeconds!),
        0
      ) / olderRecords.length;
    const newerAvg =
      newerRecords.reduce(
        (sum, r) => sum + calculateAccuracy(r.predictedSeconds, r.actualSeconds!),
        0
      ) / newerRecords.length;
    if (newerAvg - olderAvg > 5) accuracyTrend = "improving";
    else if (olderAvg - newerAvg > 5) accuracyTrend = "declining";
  }

  return {
    overallAccuracy,
    overallLevel: getAccuracyLevel(overallAccuracy) as "high" | "medium" | "low",
    totalRecords: validRecords.length,
    periodAccuracies,
    accuracyTrend,
    highAccuracyCount,
    mediumAccuracyCount,
    lowAccuracyCount,
  };
}

const CHINA_HOLIDAYS_2025_2026: Set<string> = new Set([
  "2025-01-01", "2025-01-28", "2025-01-29", "2025-01-30", "2025-01-31", "2025-02-01", "2025-02-02", "2025-02-03", "2025-02-04",
  "2025-04-04", "2025-04-05", "2025-04-06",
  "2025-05-01", "2025-05-02", "2025-05-03", "2025-05-04", "2025-05-05",
  "2025-05-31", "2025-06-01", "2025-06-02",
  "2025-10-01", "2025-10-02", "2025-10-03", "2025-10-04", "2025-10-05", "2025-10-06", "2025-10-07", "2025-10-08",
  "2026-01-01", "2026-01-29", "2026-01-30", "2026-01-31", "2026-02-01", "2026-02-02", "2026-02-03", "2026-02-04", "2026-02-05",
  "2026-04-04", "2026-04-05", "2026-04-06",
  "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
  "2026-06-19", "2026-06-20", "2026-06-21",
  "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08",
]);

export function formatDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isWeekend(timestamp: number): boolean {
  const day = new Date(timestamp).getDay();
  return day === 0 || day === 6;
}

export function isHoliday(timestamp: number): boolean {
  return CHINA_HOLIDAYS_2025_2026.has(formatDateKey(timestamp));
}

export function getDayType(timestamp: number): DayType {
  if (isHoliday(timestamp)) return "holiday";
  if (isWeekend(timestamp)) return "weekend";
  return "weekday";
}

export function filterRecords(
  records: PredictionRecord[],
  filter: StatsFilter
): PredictionRecord[] {
  return records.filter((record) => {
    if (filter.timePeriod !== "all" && record.timePeriod !== filter.timePeriod) {
      return false;
    }

    if (filter.dayType !== "all") {
      const recordDayType = getDayType(record.timestamp);
      if (recordDayType !== filter.dayType) {
        return false;
      }
    }

    if (filter.dateRange.start) {
      const startDate = new Date(filter.dateRange.start).getTime();
      if (record.timestamp < startDate) {
        return false;
      }
    }

    if (filter.dateRange.end) {
      const endDate = new Date(filter.dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      if (record.timestamp > endDate.getTime()) {
        return false;
      }
    }

    if (filter.floorRange.min !== null && record.currentFloor < filter.floorRange.min) {
      return false;
    }

    if (filter.floorRange.max !== null && record.currentFloor > filter.floorRange.max) {
      return false;
    }

    return true;
  });
}

export function calculateFilteredFloorWaitStats(
  records: PredictionRecord[],
  filter: StatsFilter
): FloorWaitStats[] {
  const filtered = filterRecords(records, filter);
  return calculateFloorWaitStats(filtered);
}

export function calculateFilteredAccuracyStats(
  records: PredictionRecord[],
  filter: StatsFilter
): AccuracyStats {
  const filtered = filterRecords(records, filter);
  return calculateAccuracyStats(filtered);
}

export function detectElevatorAnomaly(
  records: PredictionRecord[],
  deviationThreshold: number = 50
): ElevatorAnomalyReport {
  const validRecords = records.filter(
    (r) => r.actualSeconds !== null && r.predictedSeconds > 0
  );

  const emptyReport: ElevatorAnomalyReport = {
    isElevatorAnomalous: false,
    severity: "low",
    anomalyCount: 0,
    totalRecords: validRecords.length,
    anomalyRate: 0,
    avgDeviationPercent: 0,
    maxDeviationPercent: 0,
    recentAnomalies: [],
    message: "数据不足，无法判断电梯是否异常",
    recommendation: "请继续记录等待时间以获取更准确的分析",
    lastChecked: Date.now(),
  };

  if (validRecords.length < 3) {
    return emptyReport;
  }

  const anomalyRecords: AnomalyRecord[] = validRecords
    .map((r) => {
      const deviation = Math.abs(r.actualSeconds! - r.predictedSeconds);
      const deviationPercent = Math.round((deviation / r.predictedSeconds) * 100);
      return {
        id: r.id,
        predictedSeconds: r.predictedSeconds,
        actualSeconds: r.actualSeconds!,
        deviationPercent,
        timestamp: r.timestamp,
        timePeriod: r.timePeriod,
        currentFloor: r.currentFloor,
      };
    })
    .filter((a) => a.deviationPercent >= deviationThreshold);

  const recentAnomalies = anomalyRecords.slice(0, 10);

  const anomalyRate = validRecords.length > 0
    ? anomalyRecords.length / validRecords.length
    : 0;

  const avgDeviationPercent =
    anomalyRecords.length > 0
      ? Math.round(
          anomalyRecords.reduce((sum, a) => sum + a.deviationPercent, 0) /
            anomalyRecords.length
        )
      : 0;

  const maxDeviationPercent =
    anomalyRecords.length > 0
      ? Math.max(...anomalyRecords.map((a) => a.deviationPercent))
      : 0;

  const recentValid = validRecords.slice(0, 5);
  const recentAnomalyCount = recentValid.filter((r) => {
    const dev = Math.abs(r.actualSeconds! - r.predictedSeconds);
    const devPct = (dev / r.predictedSeconds) * 100;
    return devPct >= deviationThreshold;
  }).length;
  const recentAnomalyRate = recentValid.length > 0 ? recentAnomalyCount / recentValid.length : 0;

  let severity: AnomalySeverity = "low";
  let isElevatorAnomalous = false;
  let message = "电梯运行正常，预测与实际等待时间基本吻合";
  let recommendation = "继续记录等待时间以持续监控电梯状态";

  if (anomalyRate >= 0.6 || recentAnomalyRate >= 0.8) {
    severity = "critical";
    isElevatorAnomalous = true;
    message = "电梯存在严重异常！实际等待时间频繁严重偏离预测值";
    recommendation = "建议立即向物业报修，电梯可能存在调度故障或机械问题";
  } else if (anomalyRate >= 0.4 || recentAnomalyRate >= 0.6) {
    severity = "high";
    isElevatorAnomalous = true;
    message = "电梯可能存在异常，多次出现预测时间与实际等待时间严重不符";
    recommendation = "建议向物业反映情况，关注电梯运行状态";
  } else if (anomalyRate >= 0.2 || recentAnomalyRate >= 0.4) {
    severity = "medium";
    isElevatorAnomalous = false;
    message = "电梯偶尔出现等待时间异常，需持续关注";
    recommendation = "建议多观察并记录，如持续异常请向物业反映";
  }

  return {
    isElevatorAnomalous,
    severity,
    anomalyCount: anomalyRecords.length,
    totalRecords: validRecords.length,
    anomalyRate: Math.round(anomalyRate * 100),
    avgDeviationPercent,
    maxDeviationPercent,
    recentAnomalies,
    message,
    recommendation,
    lastChecked: Date.now(),
  };
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
