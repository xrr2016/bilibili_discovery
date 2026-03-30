
# Content Script 重构说明

## 目录结构

```
src/content/
├── types.ts              # 类型定义
├── index.ts              # 主入口，整合所有追踪器
├── triggers/             # 触发器层 - 决定何时收集数据
│   ├── video-trigger.ts  # 视频相关触发器
│   ├── follow-trigger.ts # 关注状态触发器
│   └── favorite-trigger.ts # 收藏状态触发器
├── collectors/           # 收集器层 - 决定从页面收集什么数据
│   ├── video-collector.ts # 视频数据收集器
│   └── up-collector.ts   # UP主数据收集器
└── forwarder/            # 转发层 - 统一的数据转发接口
    └── data-forwarder.ts # 数据转发器实现
```

## 三层架构说明

### 1. 触发器层 (triggers)

**职责**: 决定何时触发数据收集

触发器负责监听页面事件和状态变化，在合适的时机触发数据收集。每个触发器都实现了统一的接口：

- `start()`: 开始监听
- `stop()`: 停止监听
- `onCollect(callback)`: 设置数据收集回调

**主要触发器**:
- `VideoPlaybackTrigger`: 监听视频播放事件（播放进度、暂停、结束等）
- `VideoMetadataTrigger`: 在视频页面加载时触发一次，收集视频元数据
- `FollowButtonTrigger`: 监听关注按钮状态变化
- `FavoriteButtonTrigger`: 监听收藏按钮状态变化

### 2. 收集器层 (collectors)

**职责**: 决定从页面收集什么数据

收集器负责从DOM或页面上下文中提取所需的数据。收集器提供纯函数式的数据提取方法，不包含业务逻辑。

**主要收集器**:
- `VideoDataCollector`: 提取视频标题、UP主信息、标签等
- `UpDataCollector`: 提取UP主信息、视频列表等

**主要方法**:
- `extractVideoMeta()`: 提取视频元数据
- `enrichWatchProgress(data)`: 填充观看进度数据的元数据部分
- `extractUpInfo()`: 提取UP主信息
- `extractUPPageData()`: 提取UP主页完整数据

### 3. 转发层 (forwarder)

**职责**: 统一的数据转发接口

转发层负责将收集到的数据发送到后台处理。目前实现了Chrome消息API的转发器，未来可以轻松扩展其他转发方式（如HTTP请求等）。

**主要类**:
- `DataForwarder`: 数据转发接口
- `ChromeMessageForwarder`: Chrome消息API实现

## 使用示例

### 1. 视频追踪

```typescript
// 创建触发器
const playbackTrigger = new VideoPlaybackTrigger(videoElement, bvid);
const metadataTrigger = new VideoMetadataTrigger(videoElement, bvid);

// 创建收集器
const collector = new VideoDataCollector();

// 创建转发器
const forwarder = createDataForwarder();

// 设置触发器回调
playbackTrigger.onCollect((data) => {
  const enrichedData = collector.enrichWatchProgress(data);
  forwarder.send("watch_progress", enrichedData);
});

// 开始监听
playbackTrigger.start();
metadataTrigger.start();
```

### 2. 关注追踪

```typescript
// 创建触发器
const followTrigger = new FollowButtonTrigger();

// 创建收集器
const collector = new UpDataCollector();

// 创建转发器
const forwarder = createDataForwarder();

// 设置触发器回调
followTrigger.onCollect((data) => {
  const enrichedData = collector.enrichFollowStatus(data);
  forwarder.send("follow_status_changed", enrichedData);
});

// 开始监听
followTrigger.start();
```

## 数据流向

```
页面事件/状态变化
    ↓
触发器 (Triggers)
    ↓
收集器 (Collectors)
    ↓
转发器 (Forwarder)
    ↓
后台处理
```

## 优势

1. **职责分离**: 每层有明确的职责，易于理解和维护
2. **可测试性**: 触发器和收集器可以独立测试
3. **可扩展性**: 新增数据收集点只需添加新的触发器和收集器
4. **灵活性**: 转发层可以轻松扩展不同的数据发送方式
5. **复用性**: 收集器可以在多个触发器中复用

## 迁移说明

旧的文件结构保持不变，新的结构在 `src/content/` 下并行存在。新的入口文件是 `index.ts`，可以逐步替换旧的实现。

主要变化：
- `tracker.ts` → `triggers/video-trigger.ts` + `collectors/video-collector.ts`
- `follow-tracker.ts` → `triggers/follow-trigger.ts` + `collectors/up-collector.ts`
- `favorite-tracker.ts` → `triggers/favorite-trigger.ts`
- `up-page-collector.ts` → `collectors/up-collector.ts`
- `tracker-core.ts` → 部分功能整合到新的触发器中
- `uid-core.ts` → 整合到 `collectors/up-collector.ts`
