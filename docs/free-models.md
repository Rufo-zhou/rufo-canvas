# 模型与额度说明

Rufo 采用“公共模型优先、可替换供应商”的媒体生成架构。第三方 API 不等于永久免费算力，服务可能存在余额、速率限制、每日额度、排队和模型变更。

## 可直接使用

Sana Public 当前不要求用户配置 API Key。它通过 Pollinations 公共图片接口调用，适合原型和个人创作，但不提供生产 SLA，繁忙时可能返回限流错误。

## 免费账户额度

配置 `POLLINATIONS_API_KEY` 后可启用：

- Flux Schnell
- Z-Image Turbo
- FLUX Kontext
- GPT Image Mini
- GPT Image 2
- Nano Banana / Nano Banana 2 / Nano Banana Pro 图片生成与编辑
- Seedream 图片生成与编辑
- Ideogram 文字设计模型
- Wan Fast 视频生成
- Seedance Pro Fast 视频生成
- Seedance 2.0 视频生成
- Veo Fast 视频生成
- LTX、Wan Pro、Pruna Video 等视频模型

Pollinations 使用 Pollen 额度。API Key 只代表已接入，不代表账户有余额；当余额为 `0` 时供应商会返回 HTTP 402。部分账户可能获得有限赠送额度，视频模型通常按生成秒数消耗额度。模型、价格和政策可能变化，应以 [Pollinations 官方模型接口](https://gen.pollinations.ai/image/models) 为准。

## 参数能力

Rufo 会从后端模型目录返回每个模型支持的比例、画质、时长和音频能力。图片模型支持 `1:1`、`4:3`、`3:4`、`3:2`、`2:3`、`16:9`、`9:16`、`21:9`；视频模型默认支持 `16:9` 与 `9:16`。画质选项为标准、高清、超清，实际分辨率会按模型能力映射到约 1K/1.5K/2K 图片或 480p/720p/1080p 视频。

非方图生成后，后端会读取返回文件的真实宽高并写入数据库，画布按真实比例等比缩放展示，避免 1:1 以外的图片被拉伸或裁切。

Pollinations 当前视频接口只支持 `16:9` 与 `9:16`。支持尾帧的模型会显示“首尾帧”，其他模型只显示“首帧”。Seedance 2.0、Veo、Wan Fast 与 Wan Pro 可传两张图片；Seedance Pro、LTX 和 Pruna Video 只传首帧。

配置 `HUGGINGFACE_API_KEY` 后可使用 Hugging Face Inference Providers 的月度免费额度。额度规则见 [Hugging Face 官方定价文档](https://huggingface.co/docs/inference-providers/pricing)。

配置 `AGNES_API_KEY`，或由用户在“自助接入 API”中填写自己的 Agnes Key 后，可使用：

- Agnes Image 2.0 Flash
- Agnes Image 2.1 Flash
- Agnes Video 2.0

Agnes 官方 API Base URL 为 `https://apihub.agnes-ai.com/v1`。图片调用 `/v1/images/generations`，视频调用 `/v1/videos` 并使用返回的 `video_id` 轮询结果。免费额度、RPM 与订阅配额可能变化，以 [Agnes AI 平台](https://platform.agnes-ai.com/) 为准。

Agnes Video 2.0 支持 `16:9`、`9:16`、`1:1`、`4:3`、`3:4`。480p 可选约 3、5、10、18 秒，720p 可选约 3、5、10 秒，1080p 可选约 3、5 秒。它支持首帧、多图参考和关键帧模式。当前 Agnes 与 Pollinations 的公开生成接口只声明图片参考输入；音频属于部分视频模型的输出能力，不把音频或视频文件伪装成可用参考输入。

参考图跨比例生成默认采用“扩图适配”：Rufo 先把原图按目标比例放入扩展画布，保持主体比例，再要求模型补全周围构图。用户也可以选择“智能裁切”或“完整保留”，三种模式都不会直接拉伸原图。

## 本地完全免费

需要不依赖第三方额度时，应自行部署 ComfyUI，并使用开源权重：

- 图片：FLUX.1 Schnell、Stable Diffusion XL、Z-Image
- 视频：Wan、HunyuanVideo、LTX-Video

本地运行没有单次 API 费用，但需要足够的显存、磁盘和电力。Rufo 后续可通过供应商适配器连接自建 ComfyUI API。

## 安全规则

- 管理员共享 Key 只允许出现在服务器环境变量中。
- 用户自带 Key 默认只保存在当前浏览器会话，不能写入 Supabase 或生成任务记录。
- 每次请求只发送当前模型对应供应商的 Key，不能把全部 Key 一起发送。
- 禁止将 `.env.local` 上传到 GitHub。
- 公共部署应设置请求限流，避免匿名用户耗尽免费额度。
