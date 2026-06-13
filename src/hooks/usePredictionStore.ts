import { create } from 'zustand';
import type {
  PredictionInput,
  PredictionRecord,
  AlgorithmWeights,
  Suggestion,
} from '@/types';
import {
  STORAGE_KEYS,
  DEFAULT_WEIGHTS,
  TimePeriod,
} from '@/types';
import {
  predictWaitTime,
  calculateHistoricalMultiplier,
  calculateConfidence,
  generateId,
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
  },

  predict: () => {
    const state = get();
    const input: PredictionInput = {
      currentFloor: state.currentFloor,
      totalFloors: state.totalFloors,
      timePeriod: state.timePeriod,
    };

    const historicalMultiplier = calculateHistoricalMultiplier(state.records);
    const result = predictWaitTime(input, state.weights, historicalMultiplier);
    const confidence = calculateConfidence(state.records);

    set({
      currentPrediction: {
        ...input,
        predictedSeconds: result.predictedSeconds,
        confidence,
        suggestion: result.suggestion as Suggestion,
        suggestionReason: '',
        floorDiff: result.floorDiff,
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
    if (!state.currentPrediction) return;

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
    set({ records: updatedRecords });
    get()._saveToStorage();
  },

  clearHistory: () => {
    set({ records: [] });
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
  },

  loadFromStorage: () => {
    try {
      const recordsJson = localStorage.getItem(STORAGE_KEYS.RECORDS);
      const weightsJson = localStorage.getItem(STORAGE_KEYS.WEIGHTS);

      if (recordsJson) {
        const records = JSON.parse(recordsJson) as PredictionRecord[];
        set({ records });
      }

      if (weightsJson) {
        const weights = JSON.parse(weightsJson) as AlgorithmWeights;
        set({ weights });
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
}));
