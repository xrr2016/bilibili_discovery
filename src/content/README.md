# `src/content`

本目录存放注入 Bilibili 页面运行的 content script 代码。

主要职责：
- 从页面 DOM 或页面上下文提取数据
- 监听用户行为，例如观看进度、关注状态变化、UID 检测
- 将采集结果发送给后台模块处理

设计边界：
- 这里负责“页面采集与监听”
- 不直接做复杂业务判断或数据库持久化

主要文件：
- `tracker.ts` / `tracker-core.ts`：观看行为跟踪
- `uid.ts` / `uid-core.ts`：用户 UID 识别
- `follow-tracker.ts`：关注/取关状态监听
- `up-page-collector.ts`：UP 页面数据采集
