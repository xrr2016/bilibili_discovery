# 贡献指南

感谢您对 Bilibili Discovery Engine 项目的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告问题

如果您发现了 bug 或有功能建议，请：

1. 先检查 [Issues](https://github.com/hakureireimuyo/bili-random-up/issues) 确认问题是否已被报告
2. 如果没有，请创建新的 Issue，提供：
   - 清晰的标题
   - 详细的描述
   - 复现步骤（如果是 bug）
   - 预期行为和实际行为
   - 环境信息（浏览器版本、操作系统等）
   - 相关截图（如果适用）

### 提交代码

1. **Fork 本仓库**
   ```bash
   git clone git@github.com:your-username/bili-random-up.git
   cd bili-random-up
   ```

2. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **进行开发**
   - 遵循现有的代码风格
   - 为新功能添加测试
   - 确保所有测试通过
   - 更新相关文档

4. **提交更改**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
   使用清晰的提交信息，建议使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

5. **推送到您的 Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **创建 Pull Request**
   - 在 GitHub 上创建 PR
   - 填写 PR 模板
   - 等待代码审查

### 开发规范

#### 代码风格

- 使用 TypeScript 进行开发
- 遵循 ESLint 配置
- 使用 Prettier 格式化代码
- 为公共 API 添加 JSDoc 注释

#### 测试

- 为新功能编写单元测试
- 确保测试覆盖率不低于 80%
- 运行测试：
  ```bash
  npm run test
  ```

#### 文档

- 更新 README.md 如果涉及用户可见的更改
- 更新相关代码注释
- 为复杂功能添加使用示例

## 开发环境设置

### 前置要求

- Node.js >= 16
- npm >= 8
- Git

### 安装依赖

```bash
npm install
```

### 构建项目

```bash
npm run build
```

### 运行测试

```bash
npm run test
```

### 在浏览器中加载扩展

1. 运行 `npm run build`
2. 打开浏览器扩展管理页面
3. 加载 `dist/extension` 目录

## 项目结构

```
bilibili_discovery/
├── extension/          # 扩展源码
│   ├── api/          # B站API接口
│   ├── background/    # 后台服务
│   ├── content/      # 内容脚本
│   ├── engine/       # 分类和推荐引擎
│   ├── storage/      # 存储管理
│   └── ui/          # 用户界面
├── dist/            # 构建输出
├── scripts/         # 构建脚本
└── package.json
```

## 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构（既不是新增功能，也不是修复 bug）
- `perf`: 性能优化
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat: add video statistics feature
fix: resolve cookie authentication issue
docs: update README with new features
```

## 代码审查

所有 PR 都需要经过代码审查才能合并。审查者会检查：

- 代码质量和风格
- 测试覆盖率
- 文档完整性
- 功能正确性
- 潜在的安全问题

请及时响应审查意见，并根据反馈进行修改。

## 行为准则

- 尊重所有贡献者
- 保持友好和专业的交流
- 接受建设性的批评
- 关注对社区最有利的事情

## 获取帮助

如果您有任何问题：

- 查看 [Issues](https://github.com/hakureireimuyo/bili-random-up/issues)
- 创建新的 Issue 提问
- 加入讨论区交流

再次感谢您的贡献！
