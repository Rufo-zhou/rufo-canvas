# 画布数据规范

## 1. 技术选型

画布统一使用 React Flow。

React Flow 只负责交互层，项目持久化数据需要保持可版本化结构，避免直接依赖不可控的 UI 临时状态。

## 2. 节点类型

### 2.1 `prompt`

保存提示词输入。

```ts
type PromptNodeData = {
  kind: "prompt";
  label: string;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
};
```

### 2.2 `generation`

保存一次生图任务。

```ts
type GenerationNodeData = {
  kind: "generation";
  label: string;
  provider: MediaGenerationProvider;
  mediaType: "image" | "video";
  status: "draft" | "pending" | "processing" | "completed" | "failed";
  taskId?: string;
  clientTaskId?: string;
  progress?: number;
  aspectRatio?: MediaAspectRatio;
  quality?: MediaQuality;
  statusLabel?: string;
  errorCode?: string;
  errorMessage?: string;
  errorSolution?: string;
};
```

生成请求提交后必须立即创建 `generation` 节点，不等待供应商返回。节点按目标比例显示占位形状、模型、画质、实时进度和状态；失败时显示中文原因、解决办法和重试入口。生成完成后保留任务节点，并自动创建 `generation -> asset` 边。

### 2.3 `asset`

保存生成图片资产。

```ts
type AssetNodeData = {
  kind: "asset";
  label: string;
  assetId?: string;
  assetUrl?: string;
  storagePath?: string;
  mediaType: "image" | "video";
  width?: number;
  height?: number;
};
```

## 3. 边类型

首期使用默认边。

推荐语义：

- `prompt -> generation`
- `generation -> asset`

后续如需支持多输入或图像参考，可扩展：

- `asset -> generation`
- `prompt -> prompt`

当前交互约定：

- 所有节点左侧、右侧都提供连接点，采用 React Flow `Loose` 连接模式，可从任一连接点发起连线。
- 连接到另一个节点时创建持久化边，边支持重新连接和删除。
- 从媒体任一连接点拖到画布空白处时，自动创建生成草稿节点、创建 `asset -> generation` 边、打开 Agent，并把该媒体作为下一次生成的参考素材。
- 视频节点选中后通过顶部拖动把手移动，播放控件继续保留原生交互。
- 视频拖动把手始终存在，未选中时仅在悬停时显示。
- 媒体名称不常驻显示，只在选中工具条、全屏属性面板、图层或资产面板中显示。

## 4. 快照结构

```ts
type CanvasSnapshot = {
  schemaVersion: 1;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport?: Viewport;
  updatedAt: string;
};
```

## 5. 持久化规则

- 每次保存创建一条 `canvas_snapshots` 记录。
- `version` 从 1 开始递增。
- 不直接覆盖历史快照。
- 加载项目时默认读取最新版本。

## 6. 编辑能力

- 支持撤销与重做，最多保留最近 60 个本地编辑状态。
- 支持选中媒体后改名、全屏预览、复制、下载、删除和作为参考继续生成。
- 支持缩小、放大、适配全部内容、缩略图、图层和资产面板。
- 支持画框、文字、标记、自由绘制和本地媒体上传。
- 生成历史从 `generation_tasks` 与 `generated_assets` 读取，显示进行中、已完成、失败、进度、中文失败原因和解决办法。
- 历史结果可重新添加到画布，历史参数可一键带回创作表单再次生成。
- 分组节点、模板库和自动布局仍属于后续扩展。
