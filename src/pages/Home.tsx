import { useEffect } from 'react';
import {
  Sunrise,
  Sun,
  Sunset,
  Clock,
  Minus,
  Plus,
  Timer,
  Play,
  Square,
  Save,
  Trash2,
  TrendingUp,
  Building2,
  ArrowUpDown,
  Footprints,
  ArrowUp,
} from 'lucide-react';
import { usePredictionStore } from '@/hooks/usePredictionStore';
import {
  TIME_PERIOD_LABELS,
  TIME_PERIOD_HOURS,
  TimePeriod,
} from '@/types';
import { formatTime, calculateAccuracy, getAccuracyLevel } from '@/utils/predictor';
import { clsx } from 'clsx';

export default function Home() {
  const {
    currentFloor,
    totalFloors,
    timePeriod,
    currentPrediction,
    records,
    timer,
    setCurrentFloor,
    setTotalFloors,
    setTimePeriod,
    predict,
    startTimer,
    stopTimer,
    saveActualTime,
    clearHistory,
    loadFromStorage,
  } = usePredictionStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  const handlePredict = () => {
    predict();
  };

  const handleStartTimer = () => {
    if (!currentPrediction) {
      predict();
    }
    startTimer();
  };

  const handleStopTimer = () => {
    stopTimer();
    saveActualTime();
  };

  const timePeriods: { key: TimePeriod; icon: typeof Sunrise }[] = [
    { key: 'morning', icon: Sunrise },
    { key: 'noon', icon: Sun },
    { key: 'evening', icon: Sunset },
    { key: 'other', icon: Clock },
  ];

  const recentRecords = records.slice(0, 5);

  return (
    <div className="min-h-screen relative z-10 pb-12">
      <div className="container mx-auto px-4 pt-8 max-w-5xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-display font-bold mb-3 bg-gradient-to-r from-ember-light to-ember bg-clip-text text-transparent">
            电梯等待时间预测
          </h1>
          <p className="text-ink-700 text-lg">
            智能分析 · 精准预测 · 科学决策
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <Building2 className="w-6 h-6 text-ember" />
              <h2 className="text-xl font-display font-semibold text-slate-100">
                楼层信息
              </h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  所在楼层
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentFloor(currentFloor - 1)}
                    className="stepper-btn"
                    disabled={currentFloor <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    className="number-input flex-1"
                    value={currentFloor}
                    onChange={(e) => setCurrentFloor(parseInt(e.target.value) || 1)}
                    min="1"
                    max={totalFloors}
                  />
                  <button
                    onClick={() => setCurrentFloor(currentFloor + 1)}
                    className="stepper-btn"
                    disabled={currentFloor >= totalFloors}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">
                  总楼层数
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTotalFloors(totalFloors - 1)}
                    className="stepper-btn"
                    disabled={totalFloors <= 2}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    className="number-input flex-1"
                    value={totalFloors}
                    onChange={(e) => setTotalFloors(parseInt(e.target.value) || 2)}
                    min="2"
                    max="100"
                  />
                  <button
                    onClick={() => setTotalFloors(totalFloors + 1)}
                    className="stepper-btn"
                    disabled={totalFloors >= 100}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-5">
              <Clock className="w-6 h-6 text-ember" />
              <h2 className="text-xl font-display font-semibold text-slate-100">
                当前时间段
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {timePeriods.map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTimePeriod(key)}
                  className={clsx(
                    'segment-btn',
                    timePeriod === key && 'active'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{TIME_PERIOD_LABELS[key]}</span>
                  <span className="text-xs opacity-60">
                    {TIME_PERIOD_HOURS[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card p-6 mb-6">
          <button
            onClick={handlePredict}
            className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-3"
          >
            <TrendingUp className="w-5 h-5" />
            预测等待时间
          </button>
        </div>

        {currentPrediction && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="glass-card p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Timer className="w-5 h-5 text-ember" />
                  <h3 className="text-lg font-display font-semibold text-slate-200">
                    预计等待时间
                  </h3>
                </div>
                <div className="text-5xl font-display font-bold text-ember-light mb-2 animate-pulse-slow">
                  {formatTime(currentPrediction.predictedSeconds ?? 0)}
                </div>
                <div className="text-sm text-slate-400">
                  置信度 {currentPrediction.confidence ?? 0}%
                </div>
              </div>

              <div className="glass-card p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <ArrowUpDown className="w-5 h-5 text-ember" />
                  <h3 className="text-lg font-display font-semibold text-slate-200">
                    楼层距离
                  </h3>
                </div>
                <div className="text-5xl font-display font-bold text-ember-light mb-2">
                  {currentPrediction.floorDiff ?? 0}
                  <span className="text-2xl ml-2 text-slate-400">层</span>
                </div>
                <div className="text-sm text-slate-400">
                  距离最近的电梯
                </div>
              </div>

              <div
                className={clsx(
                  'glass-card p-6 text-center',
                  currentPrediction.suggestion === 'stairs'
                    ? 'bg-gradient-to-br from-mint/10 to-mint/5 border-mint/30'
                    : 'bg-gradient-to-br from-coral/10 to-coral/5 border-coral/30'
                )}
              >
                <div className="flex items-center justify-center gap-2 mb-3">
                  {currentPrediction.suggestion === 'stairs' ? (
                    <>
                      <Footprints className="w-5 h-5 text-mint" />
                      <h3 className="text-lg font-display font-semibold text-mint">
                        建议走楼梯
                      </h3>
                    </>
                  ) : (
                    <>
                      <ArrowUp className="w-5 h-5 text-coral" />
                      <h3 className="text-lg font-display font-semibold text-coral">
                        建议等电梯
                      </h3>
                    </>
                  )}
                </div>
                <div className="text-lg font-semibold text-slate-200 mb-2">
                  {currentPrediction.suggestionReason}
                </div>
                <div className="text-sm text-slate-400">
                  基于 {currentPrediction.floorDiff ?? 0} 层距离分析
                </div>
              </div>
            </div>

            <div className="glass-card p-6 mb-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <Timer className="w-6 h-6 text-ember" />
                  <h2 className="text-xl font-display font-semibold text-slate-100">
                    实时计时器
                  </h2>
                </div>
                {timer.isRunning && (
                  <div className="flex items-center gap-2 text-mint">
                    <div className="w-2 h-2 bg-mint rounded-full animate-pulse" />
                    <span className="text-sm font-medium">计时中...</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="88"
                      fill="none"
                      stroke={timer.isRunning ? '#2ec4b6' : '#ff6b35'}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 88}
                      strokeDashoffset={
                        timer.isRunning
                          ? 2 * Math.PI * 88 * (1 - (timer.elapsedSeconds % 120) / 120)
                          : 0
                      }
                      className="progress-ring__circle"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-5xl font-display font-bold text-slate-100">
                      {formatTime(timer.elapsedSeconds)}
                    </div>
                    <div className="text-sm text-slate-400 mt-1">
                      {timer.isRunning ? '正在计时' : '等待开始'}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {!timer.isRunning ? (
                    <button
                      onClick={handleStartTimer}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Play className="w-5 h-5" />
                      开始计时
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleStopTimer}
                        className="btn-danger flex items-center gap-2"
                      >
                        <Square className="w-5 h-5" />
                        停止并保存
                      </button>
                      <button
                        onClick={stopTimer}
                        className="btn-secondary flex items-center gap-2"
                      >
                        放弃计时
                      </button>
                    </>
                  )}
                </div>

                {timer.elapsedSeconds > 0 && !timer.isRunning && (
                  <button
                    onClick={saveActualTime}
                    className="btn-secondary flex items-center gap-2 mt-3"
                  >
                    <Save className="w-4 h-4" />
                    保存记录
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {recentRecords.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-ember" />
                <h2 className="text-xl font-display font-semibold text-slate-100">
                  历史记录
                </h2>
              </div>
              <button
                onClick={clearHistory}
                className="text-sm text-slate-400 hover:text-coral flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </button>
            </div>

            <div className="space-y-3">
              {recentRecords.map((record) => {
                const accuracy = calculateAccuracy(
                  record.predictedSeconds,
                  record.actualSeconds ?? 0
                );
                const accuracyLevel = getAccuracyLevel(accuracy);

                return (
                  <div
                    key={record.id}
                    className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Building2 className="w-4 h-4" />
                        <span className="font-medium">
                          {record.currentFloor}层 / 共{record.totalFloors}层
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-sm text-slate-400">
                          {TIME_PERIOD_LABELS[record.timePeriod]}
                        </span>
                      </div>
                      <span
                        className={clsx(
                          'accuracy-tag',
                          accuracyLevel === 'high' && 'accuracy-high',
                          accuracyLevel === 'medium' && 'accuracy-medium',
                          accuracyLevel === 'low' && 'accuracy-low'
                        )}
                      >
                        {accuracy}% 准确
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">预测:</span>
                        <span className="text-ember-light font-semibold">
                          {formatTime(record.predictedSeconds)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400">实际:</span>
                        <span className="text-mint font-semibold">
                          {formatTime(record.actualSeconds ?? 0)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {record.suggestion === 'stairs' ? (
                          <Footprints className="w-4 h-4 text-mint" />
                        ) : (
                          <ArrowUp className="w-4 h-4 text-coral" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {records.length > 5 && (
              <div className="mt-4 text-center">
                <span className="text-sm text-slate-400">
                  共 {records.length} 条记录
                </span>
              </div>
            )}
          </div>
        )}

        {records.length === 0 && !currentPrediction && (
          <div className="glass-card p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800/50 flex items-center justify-center">
              <Timer className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-xl font-display font-semibold text-slate-300 mb-2">
              开始预测
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              选择楼层和时间段，点击预测按钮获取预计等待时间。
              记录实际等待时间，帮助优化预测算法。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
