export type TimePeriod = "morning" | "noon" | "evening" | "other";

export type Suggestion = "elevator" | "stairs";

export interface PredictionInput {
  currentFloor: number;
  totalFloors: number;
  timePeriod: TimePeriod;
  predictedSeconds?: number;
  confidence?: number;
  suggestion?: Suggestion;
  suggestionReason?: string;
  floorDiff?: number;
}

export interface PredictionResult {
  predictedSeconds: number;
  confidence: number;
  suggestion: Suggestion;
  suggestionReason: string;
  floorDiff: number;
  breakdown?: {
    baseTime: number;
    floorTime: number;
    periodMultiplier: number;
    historicalMultiplier: number;
  };
}

export interface PredictionRecord {
  id: string;
  currentFloor: number;
  totalFloors: number;
  timePeriod: TimePeriod;
  predictedSeconds: number;
  actualSeconds: number | null;
  suggestion: Suggestion;
  timestamp: number;
  isManualInput?: boolean;
}

export interface PeriodStats {
  timePeriod: TimePeriod;
  avgWaitTime: number;
  maxWaitTime: number;
  minWaitTime: number;
  count: number;
  variance: number;
}

export interface FailureAlert {
  isActive: boolean;
  message: string;
  thresholdExceeded: number;
  predictedTime: number;
  actualTime: number;
}

export interface LearningModeState {
  isEnabled: boolean;
  manualInputSeconds: number;
  showManualInput: boolean;
}

export interface PersonalizedCurveData {
  timePeriod: TimePeriod;
  dataPoints: { floorDiff: number; avgWaitTime: number }[];
  trendLine: { slope: number; intercept: number };
}

export interface AlgorithmWeights {
  baseWaitTime: number;
  secondsPerFloor: number;
  periodMultipliers: Record<TimePeriod, number>;
  stairsThreshold: number;
  stairsFloorThreshold: number;
  updatedAt: number;
}

export const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  morning: "早高峰",
  noon: "午间",
  evening: "晚高峰",
  other: "其他时段",
};

export const TIME_PERIOD_HOURS: Record<TimePeriod, string> = {
  morning: "07:00-10:00",
  noon: "11:00-14:00",
  evening: "17:00-20:00",
  other: "其余时间",
};

export const DEFAULT_WEIGHTS: AlgorithmWeights = {
  baseWaitTime: 8,
  secondsPerFloor: 2.5,
  periodMultipliers: {
    morning: 1.8,
    noon: 1.3,
    evening: 1.9,
    other: 1.0,
  },
  stairsThreshold: 45,
  stairsFloorThreshold: 3,
  updatedAt: Date.now(),
};

export interface FloorWaitStats {
  floor: number;
  avgWaitTime: number;
  minWaitTime: number;
  maxWaitTime: number;
  count: number;
}

export interface AccuracyStats {
  overallAccuracy: number;
  overallLevel: "high" | "medium" | "low";
  totalRecords: number;
  periodAccuracies: {
    timePeriod: TimePeriod;
    accuracy: number;
    level: "high" | "medium" | "low";
    count: number;
  }[];
  accuracyTrend: "improving" | "stable" | "declining";
  highAccuracyCount: number;
  mediumAccuracyCount: number;
  lowAccuracyCount: number;
}

export type DayType = "all" | "weekday" | "weekend" | "holiday";

export interface StatsFilter {
  dateRange: {
    start: string | null;
    end: string | null;
  };
  floorRange: {
    min: number | null;
    max: number | null;
  };
  dayType: DayType;
  timePeriod: TimePeriod | "all";
}

export const DEFAULT_STATS_FILTER: StatsFilter = {
  dateRange: {
    start: null,
    end: null,
  },
  floorRange: {
    min: null,
    max: null,
  },
  dayType: "all",
  timePeriod: "all",
};

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  all: "全部",
  weekday: "工作日",
  weekend: "周末",
  holiday: "节假日",
};

export const TIME_PERIOD_FILTER_LABELS: Record<TimePeriod | "all", string> = {
  morning: "早高峰",
  noon: "午间",
  evening: "晚高峰",
  other: "其他时段",
  all: "全部时段",
};

export const STORAGE_KEYS = {
  RECORDS: "elevator_prediction_records",
  WEIGHTS: "elevator_algorithm_weights",
};
