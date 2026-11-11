# 秦安婚车 AI · QIN'AN WEDDING AI

让每一场婚礼，都有属于秦安的仪式感。

这是一个面向新人和婚车车队的前端演示网站。新人可以浏览婚车影像和搭配方案，车队经营者可以在 AI 超市挑选一把汽车钥匙，进入对应的智能体工作台，体验销售跟进、婚车报价或内容策划。

## 本地运行

安装 Node.js（推荐 22 或 24）和 npm，在项目根目录运行：

```sh
npm ci
npm run dev
```

保持终端运行，打开终端显示的地址。默认首页为 <http://127.0.0.1:5173/>，钥匙展厅为 <http://127.0.0.1:5173/agents>。项目使用 Vue 3、TypeScript、Vite、Vue Router 和 Lucide，无需配置环境变量或 API 密钥。

## 页面与体验

- **首页 `/`** 展示三幕品牌影片、秦安文化、婚车车队、搭配方案和车队合作入口。影片支持暂停与选幕，加载失败时显示封面。合作咨询可下载为本地文本草稿。
- **AI 超市 `/agents`** 以八把汽车钥匙展示智能体，可按业务分类筛选。点击钥匙即可进入独立页面。
- **智能体详情页** 提供能力介绍、使用场景和对话体验。选择推荐任务会填入输入框，也可以自行输入。按 Enter 发送，Shift + Enter 换行。回复由浏览器内的示例数据和规则生成，刷新详情页会清空对话。

| 分类 | 智能体 | 独立地址 |
| --- | --- | --- |
| 销售转化 | AI 客户销售诊断师 | `/agents/sales-advisor` |
| 婚车设计 | AI 婚车方案设计师 | `/agents/car-designer` |
| 婚车设计 | AI 智能报价助手 | `/agents/smart-quote` |
| 营销推广 | AI 短视频导演 | `/agents/video-director` |
| 营销推广 | AI 婚车海报设计师 | `/agents/poster-designer` |
| 营销推广 | AI 微信文案助手 | `/agents/copywriter` |
| 经营管理 | AI 订单管理助手 | `/agents/order-assistant` |
| 经营管理 | AI 经营分析师 | `/agents/business-analyst` |

报价、档期和经营分析均用于演示。网站不接收真实订单，也不会把对话或咨询草稿发送给车队。

## 构建与部署

```sh
npm run build
npm run preview
```

构建命令先检查 TypeScript 类型，再生成 `dist/`。预览时打开终端显示的本地地址。发布时，将 `dist/` 的内容部署到域名根目录，配置静态托管服务优先返回已有文件，其余页面路径回退到 `/index.html`。部署后直接打开并刷新 `/agents/smart-quote`，即可检验详情页能否通过分享链接访问。

## 维护入口

| 需要修改的内容 | 文件或目录 |
| --- | --- |
| 首页与首屏视频播放 | `src/views/Home.vue`、`src/components/HeroFilm.vue` |
| 展厅布局与汽车钥匙 | `src/views/Market.vue`、`src/components/AgentKey.vue`、`public/assets/keys/` |
| 智能体名称、分类与推荐任务 | `src/data/agents.ts` |
| 模拟回复与对话界面 | `src/data/reply.ts`、`src/views/Studio.vue` |
| 页面路由 | `src/main.ts` |

首屏使用本地影片 `public/assets/videos/wedding-film.mp4`。第一幕为品牌创意片头，第二、三幕分别来自项目提供的 `IMG_1937.MP4` 和 `IMG_1842.MOV`。更换视频时，请同步更新章节时间和封面。影像出处见[车队素材说明](public/assets/fleet-media-sources.md)和[秦安文化影像说明](public/assets/culture/credits.html)。
