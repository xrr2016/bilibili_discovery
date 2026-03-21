# `src/engine`

本目录负责业务计算、分类与推荐等“规则/算法层”逻辑。

主要职责：
- 进行 UP 内容分类
- 调用 LLM 完成标签推断
- 基于兴趣分数、标签权重和视频信息做推荐

设计边界：
- 这里负责“如何判断/如何计算”
- 外部请求走 `api`
- 数据读写走 `database/implementations`

主要文件：
- `classifier.ts`：分类逻辑
- `llm-client.ts`：LLM 调用封装
- `recommender.ts`：推荐与兴趣更新逻辑
