import { create } from 'zustand';
import type {
  PredictionInput,
  PredictionRecord,
  AlgorithmWeights,
  Suggestion,
  FailureAlert,
  PeriodStats,
  PersonalizedCurveData,
  LearningModeState,
  StatsFilter,
  ElevatorAnomalyReport,
  AnomalyHandling,
  AnomalyHandlingType,
} from '@/types';
import {
  STORAGE_KEYS,
  DEFAULT_WEIGHTS,
  TimePeriod,
  DEFAULT_STATS_FILTER,
} from '@/types';
import {
  predictWaitTime,
  calculateHistoricalMultiplier,
  calculateConfidence,
  generateId,
  calculatePeriodStats,
  detectFailure,
  generatePersonalizedCurve,
  predictWithPersonalizedCurve,
  detectElevatorAnomaly,
} from '@/utils/predictor';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsedSeconds: number;
  intervalId: NodeJS.Timeout | null;
}

interface PredictionState {
  currentFloor: number;
  totalFloors: number;
  timePeriod: TimePeriod;
  currentPrediction: PredictionInput | null;
  records: PredictionRecord[];
  weights: AlgorithmWeights;
  timer: TimerState;
  learningMode: LearningModeState;
  failureAlert: FailureAlert;
  periodStats: PeriodStats[];
  personalizedCurve: PersonalizedCurveData;
  hasSavedActualTime: boolean;
  statsFilter: StatsFilter;
  anomalyReport: ElevatorAnomalyReport;
  anomalyHandlings: AnomalyHandling[];
  
  setCurrentFloor: (floor: number) => void;
  setTotalFloors: (floors: number) => void;
  setTimePeriod: (period: TimePeriod) => void;
  predict: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  saveActualTime: () => void;
  clearHistory: () => void;
  loadFromStorage: () => void;
  _saveToStorage: () => void;
  
  toggleLearningMode: () => void;
  setManualInputSeconds: (seconds: number) => void;
  saveManualTime: () => void;
  updateFailureAlert: () => void;
  updatePeriodStats: () => void;
  
  setStatsFilter: (filter: Partial<StatsFilter>) => void;
  resetStatsFilter: () => void;
  updateAnomalyReport: () => void;
  handleAnomaly: (anomalyRecordId: string, handlingType: AnomalyHandlingType, note?: string) => void;
}

export const usePredictionStore = create<PredictionState>((set, get) => ({
  currentFloor: 5,
  totalFloors: 20,
  timePeriod: 'other',
  currentPrediction: null,
  records: [],
  weights: DEFAULT_WEIGHTS,
  timer: {
    isRunning: false,
    startTime: null,
    elapsedSeconds: 0,
    intervalId: null,
  },
  learningMode: {
    isEnabled: true,
    manualInputSeconds: 0,
    showManualInput: false,
  },
  failureAlert: {
    isActive: false,
    message: '',
    thresholdExceeded: 0,
    predictedTime: 0,
    actualTime: 0,
  },
  periodStats: [],
  personalizedCurve: {
    timePeriod: 'other',
    dataPoints: [],
    trendLine: { slope: DEFAULT_WEIGHTS.secondsPerFloor, intercept: DEFAULT_WEIGHTS.baseWaitTime },
  },
  hasSavedActualTime: false,
  statsFilter: { ...DEFAULT_STATS_FILTER },
  anomalyReport: {
    isElevatorAnomalous: false,
    severity: 'low',
    anomalyCount: 0,
    totalRecords: 0,
    anomalyRate: 0,
    avgDeviationPercent: 0,
    maxDeviationPercent: 0,
    recentAnomalies: [],
    handledAnomalies: [],
    unhandledAnomalyCount: 0,
    message: '数据不足，无法判断电梯是否异常',
    recommendation: '请继续记录等待时间以获取更准确的分析',
    lastChecked: 0,
  },
  anomalyHandlings: [],

  setCurrentFloor: (floor) => {
    set({ currentFloor: Math.max(1, Math.min(floor, get().totalFloors)) });
  },

  setTotalFloors: (floors) => {
    set({
      totalFloors: Math.max(2, Math.min(floors, 100)),
      currentFloor: Math.min(get().currentFloor, Math.max(2, Math.min(floors, 100))),
    });
  },

  setTimePeriod: (period) => {
    set({ timePeriod: period });
    get().updatePeriodStats();
  },

  predict: () => {
    const state = get();
    const input: PredictionInput = {
      currentFloor: state.currentFloor,
      totalFloors: state.totalFloors,
      timePeriod: state.timePeriod,
    };

    const periodStats = calculatePeriodStats(state.records);
    const personalizedCurve = generatePersonalizedCurve(state.records, state.timePeriod);
    
    let result;
    if (state.learningMode.isEnabled && personalizedCurve.dataPoints.length >= 3) {
      result = predictWithPersonalizedCurve(input, personalizedCurve, periodStats, state.weights);
    } else {
      const historicalMultiplier = calculateHistoricalMultiplier(state.records);
      result = predictWaitTime(input, state.weights, historicalMultiplier);
      result.confidence = calculateConfidence(state.records);
    }

    set({
      currentPrediction: {
        ...input,
        predictedSeconds: result.predictedSeconds,
        confidence: result.confidence,
        suggestion: result.suggestion as Suggestion,
        suggestionReason: result.suggestionReason,
        floorDiff: result.floorDiff,
      },
      periodStats,
      personalizedCurve,
      hasSavedActualTime: false,
      timer: {
        isRunning: false,
        startTime: null,
        elapsedSeconds: 0,
        intervalId: null,
      },
      learningMode: {
        ...state.learningMode,
        manualInputSeconds: 0,
      },
      failureAlert: {
        isActive: false,
        message: '',
        thresholdExceeded: 0,
        predictedTime: 0,
        actualTime: 0,
      },
    });
  },

  startTimer: () => {
    const intervalId = setInterval(() => {
      const state = get();
      if (state.timer.startTime) {
        const elapsed = Math.floor((Date.now() - state.timer.startTime) / 1000);
        set({
          timer: {
            ...state.timer,
            elapsedSeconds: elapsed,
          },
        });
      }
    }, 1000);

    set({
      timer: {
        isRunning: true,
        startTime: Date.now(),
        elapsedSeconds: 0,
        intervalId,
      },
    });
  },

  stopTimer: () => {
    const state = get();
    if (state.timer.intervalId) {
      clearInterval(state.timer.intervalId);
    }
    set({
      timer: {
        isRunning: false,
        startTime: null,
        elapsedSeconds: state.timer.elapsedSeconds,
        intervalId: null,
      },
    });
  },

  saveActualTime: () => {
    const state = get();
    if (!state.currentPrediction || state.hasSavedActualTime) return;

    const record: PredictionRecord = {
      id: generateId(),
      currentFloor: state.currentPrediction.currentFloor,
      totalFloors: state.currentPrediction.totalFloors,
      timePeriod: state.currentPrediction.timePeriod,
      predictedSeconds: state.currentPrediction.predictedSeconds ?? 0,
      actualSeconds: state.timer.elapsedSeconds,
      suggestion: state.currentPrediction.suggestion as Suggestion,
      timestamp: Date.now(),
    };

    const updatedRecords = [record, ...state.records].slice(0, 50);
    set({
      records: updatedRecords,
      hasSavedActualTime: true,
      timer: {
        isRunning: false,
        startTime: null,
        elapsedSeconds: 0,
        intervalId: null,
      },
      learningMode: {
        ...state.learningMode,
        manualInputSeconds: 0,
      },
    });
    get()._saveToStorage();
    get().updatePeriodStats();
    get().updateAnomalyReport();
  },

  clearHistory: () => {
    set({ records: [], anomalyHandlings: [] });
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
    localStorage.removeItem(STORAGE_KEYS.ANOMALY_HANDLINGS);
    get().updateAnomalyReport();
  },

  loadFromStorage: () => {
    try {
      const recordsJson = localStorage.getItem(STORAGE_KEYS.RECORDS);
      const weightsJson = localStorage.getItem(STORAGE_KEYS.WEIGHTS);
      const anomalyJson = localStorage.getItem(STORAGE_KEYS.ANOMALY_REPORT);
      const handlingsJson = localStorage.getItem(STORAGE_KEYS.ANOMALY_HANDLINGS);

      if (recordsJson) {
        const records = JSON.parse(recordsJson) as PredictionRecord[];
        set({ records });
      }

      if (weightsJson) {
        const weights = JSON.parse(weightsJson) as AlgorithmWeights;
        set({ weights });
      }

      if (handlingsJson) {
        const handlings = JSON.parse(handlingsJson) as AnomalyHandling[];
        set({ anomalyHandlings: handlings });
      }

      if (anomalyJson) {
        const report = JSON.parse(anomalyJson) as ElevatorAnomalyReport;
        set({ anomalyReport: report });
      } else {
        get().updateAnomalyReport();
      }
    } catch (error) {
      console.error('Failed to load from storage:', error);
    }
  },

  _saveToStorage: () => {
    try {
      const state = get();
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(state.records));
      localStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(state.weights));
    } catch (error) {
      console.error('Failed to save to storage:', error);
    }
  },

  toggleLearningMode: () => {
    set((state) => ({
      learningMode: {
        ...state.learningMode,
        isEnabled: !state.learningMode.isEnabled,
      },
    }));
  },

  setManualInputSeconds: (seconds) => {
    set((state) => ({
      learningMode: {
        ...state.learningMode,
        manualInputSeconds: Math.max(0, seconds),
      },
    }));
  },

  saveManualTime: () => {
    const state = get();
    if (!state.currentPrediction || state.hasSavedActualTime) return;

    const record: PredictionRecord = {
      id: generateId(),
      currentFloor: state.currentPrediction.currentFloor,
      totalFloors: state.currentPrediction.totalFloors,
      timePeriod: state.currentPrediction.timePeriod,
      predictedSeconds: state.currentPrediction.predictedSeconds ?? 0,
      actualSeconds: state.learningMode.manualInputSeconds,
      suggestion: state.currentPrediction.suggestion as Suggestion,
      timestamp: Date.now(),
      isManualInput: true,
    };

    const updatedRecords = [record, ...state.records].slice(0, 50);
    set({
      records: updatedRecords,
      hasSavedActualTime: true,
      timer: {
        isRunning: false,
        startTime: null,
        elapsedSeconds: 0,
        intervalId: null,
      },
      learningMode: {
        ...state.learningMode,
        manualInputSeconds: 0,
        showManualInput: false,
      },
    });
    get()._saveToStorage();
    get().updatePeriodStats();
    get().updateAnomalyReport();
  },

  updateFailureAlert: () => {
    const state = get();
    if (!state.currentPrediction || !state.timer.isRunning) return;

    const alert = detectFailure(
      state.timer.elapsedSeconds,
      state.currentPrediction.predictedSeconds ?? 0,
      state.periodStats,
      state.timePeriod
    );
    set({ failureAlert: alert });
  },

  updatePeriodStats: () => {
    const state = get();
    const stats = calculatePeriodStats(state.records);
    const curve = generatePersonalizedCurve(state.records, state.timePeriod);
    set({
      periodStats: stats,
      personalizedCurve: curve,
    });
  },

  setStatsFilter: (filter) => {
    const state = get();
    set({
      statsFilter: {
        ...state.statsFilter,
        ...filter,
        dateRange: {
          ...state.statsFilter.dateRange,
          ...filter.dateRange,
        },
        floorRange: {
          ...state.statsFilter.floorRange,
          ...filter.floorRange,
        },
      },
    });
  },

  resetStatsFilter: () => {
    set({ statsFilter: { ...DEFAULT_STATS_FILTER } });
  },

  updateAnomalyReport: () => {
    const state = get();
    const report = detectElevatorAnomaly(state.records, 50, state.anomalyHandlings);
    set({ anomalyReport: report });
    try {
      localStorage.setItem(STORAGE_KEYS.ANOMALY_REPORT, JSON.stringify(report));
    } catch (error) {
      console.error('Failed to save anomaly report:', error);
    }
  },

  handleAnomaly: (anomalyRecordId, handlingType, note = '') => {
    const state = get();
    const existing = state.anomalyHandlings.find(
      (h) => h.anomalyRecordId === anomalyRecordId
    );
    if (existing) {
      const updated = state.anomalyHandlings.map((h) =>
        h.anomalyRecordId === anomalyRecordId
          ? { ...h, handlingType, note, handledAt: Date.now() }
          : h
      );
      set({ anomalyHandlings: updated });
    } else {
      const handling: AnomalyHandling = {
        id: generateId(),
        anomalyRecordId,
        handlingType,
        note,
        handledAt: Date.now(),
      };
      set({ anomalyHandlings: [handling, ...state.anomalyHandlings] });
    }
    try {
      localStorage.setItem(
        STORAGE_KEYS.ANOMALY_HANDLINGS,
        JSON.stringify(get().anomalyHandlings)
      );
    } catch (error) {
      console.error('Failed to save anomaly handlings:', error);
    }
    get().updateAnomalyReport();
  },
}));
