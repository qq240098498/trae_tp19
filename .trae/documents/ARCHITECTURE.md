## 1. 架构设计

```mermaid
graph TD
    A["用户界面 (React)"] --> B["状态管理 (Zustand)"]
    B --> C["预测算法模块"]
    B --> D["计时器模块"]
    B --> E["本地数据持久化 (localStorage)"]
    C --> F["楼层距离计算"]
    C --> G["时间段权重计算"]
    C --> H["历史数据回归分析"]
    D --> I["秒级精度计时"]
    E --> J["预测记录存储"]
    E --> K["算法权重存储"]
```

## 2. 技术说明

- **前端**: React@18 + TypeScript + Vite
- **样式**: TailwindCSS@3
- **状态管理**: Zustand
- **图标**: lucide-react
- **数据持久化**: localStorage（无需后端）
- **初始化工具**: vite-init

## 3. 路由定义

| 路由 | 用途 |
|-------|---------|
| / | 主页 - 预测面板、计时器、历史记录 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    PREDICTION_RECORD {
        string id
        number currentFloor
        number totalFloors
        string timePeriod
        number predictedSeconds
        number actualSeconds
        string suggestion
        number timestamp
    }
    ALGORITHM_WEIGHTS {
        string id
        number baseWaitTime
        number secondsPerFloor
        object periodMultipliers
        number stairsThreshold
        number updatedAt
    }
```

### 4.2 预测算法说明

**核心公式**:
```
预计等待时间 = 基础等待时间 + (楼层差 × 每层耗时) × 时间段系数 × 历史修正系数
```

- 基础等待时间：默认 8 秒（电梯门开关+人员进出）
- 每层耗时：默认 2.5 秒
- 时间段系数：
  - 早高峰：1.8x
  - 午间：1.3x
  - 晚高峰：1.9x
  - 其他时段：1.0x
- 历史修正系数：基于最近 20 条记录的预测误差平均值动态调整

**决策逻辑**:
- 预计等待时间 ≤ 阈值（默认 45 秒）或 楼层差 ≤ 3 层 → 建议"等电梯"
- 预计等待时间 > 阈值 且 楼层差 > 3 层 → 建议"走楼梯"
