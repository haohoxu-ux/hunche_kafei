# 秦安婚车 AI · QIN'AN WEDDING AI

让每一场婚礼，都有属于秦安的仪式感。

新人可以自己选配头车与跟车，或通过婚车搭配顾问获得第一版方案，再填写行程、查看报价并联系车队。Vue 前端和 Node 服务共用同一站点，原有的 AI 超市仍提供八个演示工作台。

## 在线试配

[打开喜元素婚车网站](https://qinan-wedding-ai.lovable.app) · [自己选车算价](https://qinan-wedding-ai.lovable.app/fleet) · [聊聊我想要的婚礼](https://qinan-wedding-ai.lovable.app/advisor)

Lovable 公网版使用试配价格，具体车辆、档期及费用由车队核实。提交咨询后，联系方式和当次报价保存在云端。当前公网版的 QQ 邮件自动投递尚未启用。下文的 SQLite 存储和 SMTP 重试说明适用于本仓库的 Node 服务。

## 本地运行

使用 Node.js 22.13 以上或 24 和 npm，在项目根目录运行：

```sh
npm ci
npm run dev
```

保持终端运行，打开终端显示的地址。默认首页为 <http://127.0.0.1:5173/>。开发及预览服务内置同源 API。无外部账号时也能试配、计算报价并在本机保存咨询。

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

## 新人选车与咨询

- `/fleet` 提供车型照片、头车替换、混搭跟车、6/8/12 台快捷搭配和可编辑的购物车；`/advisor` 从新人想要的迎亲效果开始问答。两条路径共享当前标签页的车队和行程草稿。
- `/quote` 按服务端价格版本计算。提交手机或微信后，服务端保存报价快照和咨询，邮件队列通知指定收件人。合作咨询窗口仍只生成本机草稿。
- 车型展台的参考图展示车队场景。新车上架时替换成核实过的车型照片并修改图片说明。当前口述行标为「试配」，正式模式仅加载「已核准」行。

### 车队怎样更新价格

在 Excel 中打开 `pricing/` 内四张 UTF-8 CSV 表，保留列名并保存为 CSV UTF-8。每次提交一套完整文件。运行 `npm run pricing:check` 校验，核对正式货架数量后重启服务发布。价格版本由内容计算，旧咨询保留当时的快照。

| 表 | 填写方式 |
| --- | --- |
| vehicles.csv | 按车型和用途分别设唯一编号。填对客价、用途、地区、图片路径及说明。空价表示需人工核价；状态支持试配、已核准、下架。 |
| packages.csv | 精确指定头车和跟车；多种跟车用竖线分隔，例如 `a6-tail*3\|hs5-tail*2`。填地区、里程上限、总价及状态。核准套餐仅匹配已核准的普通婚期和平路；换车或超范围重新匹配。 |
| dates.csv | 每个已核实日期一行。普通婚期填「普通」、金额 0、状态「已核准」；热门婚期填「热门」和核准加价，金额不明填「待核」。未登记日期显示待核。 |
| routes.csv | 维护基础公里数、超公里计费单位及单价、乡镇与山路费、高速过路费。支持整队与按台计费；高速单列。待核项目不会进入已知费用小计。 |

司机结算、利润和司机资源不进入这四张发布表。资料中的普通车尚无具体型号，暂不上架。

### 邮件及诊断配置

首次部署将 `.env.example` 复制为 `.env`。设置 `MAIL_TO` 为收件 QQ 邮箱，`SMTP_USER` 为发件邮箱，`SMTP_PASS` 为该邮箱的 SMTP 授权码。默认使用 QQ SMTP 的 465 端口。修改后重启。顾问默认在服务器上解析常见中文表达；配置 `ADVISOR_API_URL`、`ADVISOR_MODEL`、`ADVISOR_API_KEY` 后，使用模型提取偏好，车型和金额仍由程序校验。模型超时会回到本地问答。

咨询保存在 `LEAD_DATA_DIR`（默认项目内的 `.private/`）的 SQLite 文件中。上线使用持久目录并备份，放在静态站点目录之外。无邮件配置、进程重启或 SMTP 临时失败时，待发送任务保留；配置就绪后自动继续。用户重复提交同一次咨询只保存一条。邮件服务接收后队列标记为已投递，真实收件箱仍需人工确认。

## 构建与部署

```sh
npm run build
npm run preview
```

构建命令检查 TypeScript 后生成 `dist/`。开发和预览默认载入试配行；生产运行 `npm start`，由同一 Node 进程提供静态文件、路由回退、API 和投递队列，默认仅上架已核准车型。部署项目时带上 `dist/`、`public/assets/images/`、`server/`、`pricing/` 和 npm 生产依赖。默认监听 127.0.0.1:3000，可通过 HOST、PORT 配置，并由 HTTPS 反向代理保留 Host。部署联调可临时指定 `PRICING_MODE=preview`。运行 `npm test` 可复核价格边界、诊断修改和咨询投递队列。

## 维护入口

| 需要修改的内容 | 文件或目录 |
| --- | --- |
| 首页与首屏视频播放 | `src/views/Home.vue`、`src/components/HeroFilm.vue` |
| 展厅布局与汽车钥匙 | `src/views/Market.vue`、`src/components/AgentKey.vue`、`public/assets/keys/` |
| 智能体名称、分类与推荐任务 | `src/data/agents.ts` |
| 模拟回复与对话界面 | `src/data/reply.ts`、`src/views/Studio.vue` |
| 页面路由 | `src/main.ts` |

首屏使用本地影片 `public/assets/videos/wedding-film.mp4`。第一幕为品牌创意片头，第二、三幕分别来自项目提供的 `IMG_1937.MP4` 和 `IMG_1842.MOV`。更换视频时，请同步更新章节时间和封面。影像出处见[车队素材说明](public/assets/fleet-media-sources.md)和[秦安文化影像说明](public/assets/culture/credits.html)。
