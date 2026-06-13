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
  Brain,
  AlertTriangle,
  Check,
  X,
  History,
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
    learningMode,
    failureAlert,
    periodStats,
    personalizedCurve,
    hasSavedActualTime,
    setCurrentFloor,
    setTotalFloors,
    setTimePeriod,
    predict,
    startTimer,
    stopTimer,
    saveActualTime,
    clearHistory,
    loadFromStorage,
    toggleLearningMode,
    setManualInputSeconds,
    saveManualTime,
    updateFailureAlert,
  } = usePredictionStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer.isRunning) {
      interval = setInterval(() => {
        updateFailureAlert();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer.isRunning, updateFailureAlert]);

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-ember" />
              <h2 className="text-xl font-display font-semibold text-slate-100">
                学习模式
              </h2>
            </div>
            <button
              onClick={toggleLearningMode}
              className={clsx(
                'relative w-14 h-7 rounded-full transition-colors duration-300',
                learningMode.isEnabled
                  ? 'bg-gradient-to-r from-ember-light to-ember'
                  : 'bg-slate-700'
              )}
            >
              <div
                className={clsx(
                  'absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300',
                  learningMode.isEnabled ? 'translate-x-8' : 'translate-x-1'
                )}
              />
            </button>
          </div>
          <p className="mt-3 text-slate-400 text-sm">
            {learningMode.isEnabled
              ? '开启后，系统将根据您记录的实际等待时间，生成个性化预测曲线，提高预测准确性。'
              : '学习模式已关闭，系统使用默认算法进行预测。'}
          </p>
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

              {failureAlert.isActive && (
                <div className="mb-5 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="text-red-400 font-semibold">{failureAlert.message}</p>
                    <p className="text-sm text-red-300/70">
                      已等待 {formatTime(failureAlert.actualTime)}，预估 {formatTime(failureAlert.predictedTime)}
                    </p>
                  </div>
                </div>
              )}

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
                      disabled={hasSavedActualTime}
                    >
                      <Play className="w-5 h-5" />
                      {hasSavedActualTime ? '已保存' : '开始计时'}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleStopTimer}
                        className="btn-danger flex items-center gap-2"
                        disabled={hasSavedActualTime}
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

                {timer.elapsedSeconds > 0 && !timer.isRunning && !hasSavedActualTime && (
                  <button
                    onClick={saveActualTime}
                    className="btn-secondary flex items-center gap-2 mt-3"
                  >
                    <Save className="w-4 h-4" />
                    保存记录
                  </button>
                )}

                {hasSavedActualTime && (
                  <div className="mt-3 flex items-center gap-2 text-mint">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">已保存实际等待时间</span>
                  </div>
                )}

                {learningMode.isEnabled && currentPrediction && !timer.isRunning && !hasSavedActualTime && (
                  <div className="mt-5 w-full">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-slate-400">手动输入实际等待时间</span>
                      <button
                        onClick={() => setManualInputSeconds(0)}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        重置
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setManualInputSeconds(learningMode.manualInputSeconds - 5)}
                        className="stepper-btn"
                        disabled={learningMode.manualInputSeconds < 5}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        className="number-input flex-1 text-center"
                        value={learningMode.manualInputSeconds}
                        onChange={(e) => setManualInputSeconds(parseInt(e.target.value) || 0)}
                        min="0"
                        placeholder="秒"
                      />
                      <button
                        onClick={() => setManualInputSeconds(learningMode.manualInputSeconds + 5)}
                        className="stepper-btn"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={saveManualTime}
                      disabled={learningMode.manualInputSeconds === 0}
                      className="btn-primary w-full mt-3 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      保存手动输入
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {learningMode.isEnabled && personalizedCurve.dataPoints.length >= 3 && (
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-3 mb-5">
              <TrendingUp className="w-6 h-6 text-ember" />
              <h2 className="text-xl font-display font-semibold text-slate-100">
                个性化预测曲线
              </h2>
            </div>
            <div className="text-sm text-slate-400 mb-4">
              当前时段: {TIME_PERIOD_LABELS[personalizedCurve.timePeriod]} · 基于 {records.filter(r => r.timePeriod === timePeriod).length} 条记录
            </div>
            <div className="relative h-48 bg-slate-800/50 rounded-lg p-4">
              <svg className="w-full h-full">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff6b35" />
                    <stop offset="100%" stopColor="#f7c59f" />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ff6b35" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {personalizedCurve.dataPoints.length > 0 && (
                  <>
                    <path
                      d={`M ${personalizedCurve.dataPoints.map((p, i) => {
                        const x = (i / (personalizedCurve.dataPoints.length - 1)) * 100;
                        const maxWait = Math.max(...personalizedCurve.dataPoints.map(d => d.avgWaitTime));
                        const y = 100 - (p.avgWaitTime / maxWait) * 80;
                        return `${x}% ${y}%`;
                      }).join(' L ')}`}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d={`M 0% 100% L ${personalizedCurve.dataPoints.map((p, i) => {
                        const x = (i / (personalizedCurve.dataPoints.length - 1)) * 100;
                        const maxWait = Math.max(...personalizedCurve.dataPoints.map(d => d.avgWaitTime));
                        const y = 100 - (p.avgWaitTime / maxWait) * 80;
                        return `${x}% ${y}%`;
                      }).join(' L ')} L 100% 100% Z`}
                      fill="url(#areaGradient)"
                    />
                    {personalizedCurve.dataPoints.map((p, i) => {
                      const x = (i / (personalizedCurve.dataPoints.length - 1)) * 100;
                      const maxWait = Math.max(...personalizedCurve.dataPoints.map(d => d.avgWaitTime));
                      const y = 100 - (p.avgWaitTime / maxWait) * 80;
                      return (
                        <g key={i}>
                          <circle
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r="6"
                            fill="#1e293b"
                            stroke="#ff6b35"
                            strokeWidth="2"
                          />
                          <text
                            x={`${x}%`}
                            y={`${y - 12}%`}
                            textAnchor="middle"
                            fill="#f7c59f"
                            fontSize="12"
                            fontWeight="bold"
                          >
                            {p.avgWaitTime}s
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
                <line x1="0%" y1="90%" x2="100%" y2="90%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <text x="50%" y="98%" textAnchor="middle" fill="#64748b" fontSize="11">
                  楼层距离 (层)
                </text>
                {personalizedCurve.dataPoints.map((p, i) => {
                  const x = (i / (personalizedCurve.dataPoints.length - 1)) * 100;
                  return (
                    <text
                      key={i}
                      x={`${x}%`}
                      y="95%"
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="10"
                    >
                      {p.floorDiff}
                    </text>
                  );
                })}
              </svg>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-ember-light">
                  {periodStats.find(s => s.timePeriod === timePeriod)?.avgWaitTime || 0}s
                </div>
                <div className="text-xs text-slate-400">平均等待</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-mint">
                  {periodStats.find(s => s.timePeriod === timePeriod)?.minWaitTime || 0}s
                </div>
                <div className="text-xs text-slate-400">最短等待</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-coral">
                  {periodStats.find(s => s.timePeriod === timePeriod)?.maxWaitTime || 0}s
                </div>
                <div className="text-xs text-slate-400">最长等待</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-ember">
                  {periodStats.find(s => s.timePeriod === timePeriod)?.count || 0}
                </div>
                <div className="text-xs text-slate-400">记录数</div>
              </div>
            </div>
          </div>
        )}

        {recentRecords.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <History className="w-6 h-6 text-ember" />
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
