import type { AppLocale } from './i18nMessages'

const ZH_DISPLAY_TEXT: Record<string, string> = {
  'Getting Started': '入门示例',
  'Active Projects': '活跃项目',
  Area: '领域',
  Areas: '领域',
  Event: '事件',
  Events: '事件',
  Measure: '指标',
  Measures: '指标',
  Note: '笔记',
  Notes: '笔记',
  Person: '人物',
  People: '人物',
  Procedure: '流程',
  Procedures: '流程',
  Project: '项目',
  Projects: '项目',
  Quarter: '季度',
  Quarters: '季度',
  Responsibility: '职责',
  Responsibilities: '职责',
  Topic: '主题',
  Topics: '主题',
  Type: '类型',
  Types: '类型',
  attachments: '附件',
  views: '视图',
  'Laputa App V1': 'Laputa 应用 V1',
  'Start Laputa App Project': '启动 Laputa 应用项目',
  'Team sync — 2025-01-13': '团队同步 — 2025-01-13',
  'Sponsor Onboarding': '赞助商入驻',
  'Quarterly Sponsor Outreach': '季度赞助商拓展',
}

const ZH_SNIPPET_PREFIXES: Array<[string, string]> = [
  ['The first usable release for daily browsing, quick open, and note-property editing', '首个可用于日常浏览、快速打开和笔记属性编辑的版本。'],
  ['The original spike that proved Tolaria could read a markdown vault, render note metadata', '最初的技术验证，证明 Tolaria 可以读取 Markdown 知识库并渲染笔记元数据。'],
  ['Short checkpoint on V1 priorities: stabilize quick open, tighten keyboard navigation', 'V1 优先级的简短检查点：稳定快速打开，强化键盘导航。'],
  ['The first period where Laputa was usable for daily navigation, quick open, and inspector', 'Laputa 首次可用于日常导航、快速打开和检查器工作流的阶段。'],
  ['The polish cycle focused on richer editing, faster linking, and better keyboard QA', '这一轮打磨聚焦更丰富的编辑、更快的链接和更好的键盘 QA。'],
  ['Turn a signed sponsor into a smooth first placement with minimal back-and-forth', '把已签约赞助商顺畅落到首个投放位，尽量减少来回沟通。'],
  ['Review the pipeline, choose the next target companies, and send a fresh outreach batch', '复盘渠道漏斗，选择下一批目标公司，并发送新的拓展消息。'],
]

export function translateVaultDisplayText(locale: AppLocale, value: string): string {
  if (locale !== 'zh-Hans') return value
  return ZH_DISPLAY_TEXT[value] ?? value
}

export function translateVaultSnippet(locale: AppLocale, value?: string | null): string | null | undefined {
  if (locale !== 'zh-Hans' || !value) return value
  const match = ZH_SNIPPET_PREFIXES.find(([prefix]) => value.startsWith(prefix))
  return match ? match[1] : value
}
