import {
  AI_AGENT_DEFINITIONS,
  createMissingAiAgentsStatus,
  getAiAgentDefinition,
  resolveDefaultAiAgent,
  type AiAgentId,
  type AiAgentsStatus,
} from '../lib/aiAgents'
import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { Moon, Sun, X } from '@phosphor-icons/react'
import type { Settings } from '../types'
import {
  DEFAULT_THEME_MODE,
  readStoredThemeMode,
  type ThemeMode,
} from '../lib/themeMode'
import type { AppLocale } from '../lib/i18nMessages'
import { readStoredAppLocale } from '../lib/i18nShared'
import { useI18n } from '../lib/useI18n'
import { normalizeReleaseChannel, serializeReleaseChannel, type ReleaseChannel } from '../lib/releaseChannel'
import { trackEvent } from '../lib/telemetry'
import { Button } from './ui/button'
import { Checkbox, type CheckedState } from './ui/checkbox'
import { Input } from './ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Switch } from './ui/switch'

interface SettingsPanelProps {
  open: boolean
  settings: Settings
  aiAgentsStatus?: AiAgentsStatus
  onSave: (settings: Settings) => void
  isGitVault?: boolean
  explicitOrganizationEnabled?: boolean
  onSaveExplicitOrganization?: (enabled: boolean) => void
  onClose: () => void
}

interface SettingsDraft {
  pullInterval: number
  autoGitEnabled: boolean
  autoGitIdleThresholdSeconds: number
  autoGitInactiveThresholdSeconds: number
  autoAdvanceInboxAfterOrganize: boolean
  defaultAiAgent: AiAgentId
  releaseChannel: ReleaseChannel
  language: AppLocale
  themeMode: ThemeMode
  initialH1AutoRename: boolean
  crashReporting: boolean
  analytics: boolean
  explicitOrganization: boolean
}

interface SettingsBodyProps {
  pullInterval: number
  setPullInterval: (value: number) => void
  isGitVault: boolean
  autoGitEnabled: boolean
  setAutoGitEnabled: (value: boolean) => void
  autoGitIdleThresholdSeconds: number
  setAutoGitIdleThresholdSeconds: (value: number) => void
  autoGitInactiveThresholdSeconds: number
  setAutoGitInactiveThresholdSeconds: (value: number) => void
  autoAdvanceInboxAfterOrganize: boolean
  setAutoAdvanceInboxAfterOrganize: (value: boolean) => void
  aiAgentsStatus: AiAgentsStatus
  defaultAiAgent: AiAgentId
  setDefaultAiAgent: (value: AiAgentId) => void
  releaseChannel: ReleaseChannel
  setReleaseChannel: (value: ReleaseChannel) => void
  language: AppLocale
  setLanguage: (value: AppLocale) => void
  themeMode: ThemeMode
  setThemeMode: (value: ThemeMode) => void
  initialH1AutoRename: boolean
  setInitialH1AutoRename: (value: boolean) => void
  explicitOrganization: boolean
  setExplicitOrganization: (value: boolean) => void
  crashReporting: boolean
  setCrashReporting: (value: boolean) => void
  analytics: boolean
  setAnalytics: (value: boolean) => void
}

const PULL_INTERVAL_OPTIONS = [1, 2, 5, 10, 15, 30] as const
const DEFAULT_AUTOGIT_IDLE_THRESHOLD_SECONDS = 90
const DEFAULT_AUTOGIT_INACTIVE_THRESHOLD_SECONDS = 30

function isSaveShortcut(event: ReactKeyboardEvent): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey)
}

function createSettingsDraft(
  settings: Settings,
  explicitOrganizationEnabled: boolean,
): SettingsDraft {
  return {
    pullInterval: settings.auto_pull_interval_minutes ?? 5,
    autoGitEnabled: settings.autogit_enabled ?? false,
    autoGitIdleThresholdSeconds: sanitizePositiveInteger(
      settings.autogit_idle_threshold_seconds,
      DEFAULT_AUTOGIT_IDLE_THRESHOLD_SECONDS,
    ),
    autoGitInactiveThresholdSeconds: sanitizePositiveInteger(
      settings.autogit_inactive_threshold_seconds,
      DEFAULT_AUTOGIT_INACTIVE_THRESHOLD_SECONDS,
    ),
    autoAdvanceInboxAfterOrganize: settings.auto_advance_inbox_after_organize ?? false,
    defaultAiAgent: resolveDefaultAiAgent(settings.default_ai_agent),
    releaseChannel: normalizeReleaseChannel(settings.release_channel),
    language: resolveSettingsDraftLanguage(settings.ui_language),
    themeMode: resolveSettingsDraftThemeMode(settings.theme_mode),
    initialH1AutoRename: settings.initial_h1_auto_rename_enabled ?? true,
    crashReporting: settings.crash_reporting_enabled ?? false,
    analytics: settings.analytics_enabled ?? false,
    explicitOrganization: explicitOrganizationEnabled,
  }
}

function resolveSettingsDraftLanguage(language: Settings['ui_language']): AppLocale {
  if (language) return language
  if (typeof window === 'undefined') return 'en'
  return readStoredAppLocale(window.localStorage) ?? 'en'
}

function resolveSettingsDraftThemeMode(themeMode: Settings['theme_mode']): ThemeMode {
  if (themeMode) return themeMode
  if (typeof window === 'undefined') return DEFAULT_THEME_MODE
  return readStoredThemeMode(window.localStorage) ?? DEFAULT_THEME_MODE
}

function resolveTelemetryConsent(settings: Settings, draft: SettingsDraft): boolean | null {
  if (draft.crashReporting || draft.analytics) return true
  return settings.telemetry_consent === null ? null : false
}

function resolveAnonymousId(settings: Settings, draft: SettingsDraft): string | null {
  if (draft.crashReporting || draft.analytics) {
    return settings.anonymous_id ?? crypto.randomUUID()
  }

  return settings.anonymous_id
}

function buildSettingsFromDraft(settings: Settings, draft: SettingsDraft): Settings {
  return {
    auto_pull_interval_minutes: draft.pullInterval,
    autogit_enabled: draft.autoGitEnabled,
    autogit_idle_threshold_seconds: draft.autoGitIdleThresholdSeconds,
    autogit_inactive_threshold_seconds: draft.autoGitInactiveThresholdSeconds,
    auto_advance_inbox_after_organize: draft.autoAdvanceInboxAfterOrganize,
    telemetry_consent: resolveTelemetryConsent(settings, draft),
    crash_reporting_enabled: draft.crashReporting,
    analytics_enabled: draft.analytics,
    anonymous_id: resolveAnonymousId(settings, draft),
    release_channel: serializeReleaseChannel(draft.releaseChannel),
    ui_language: draft.language,
    theme_mode: draft.themeMode,
    initial_h1_auto_rename_enabled: draft.initialH1AutoRename,
    default_ai_agent: draft.defaultAiAgent,
  }
}

function trackTelemetryConsentChange(previousAnalytics: boolean, nextAnalytics: boolean): void {
  if (!previousAnalytics && nextAnalytics) trackEvent('telemetry_opted_in')
  if (previousAnalytics && !nextAnalytics) trackEvent('telemetry_opted_out')
}

function isChecked(checked: CheckedState): boolean {
  return checked === true
}

function sanitizePositiveInteger(value: number | null | undefined, fallback: number): number {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 1) return fallback
  return Math.round(value)
}

export function SettingsPanel({
  open,
  settings,
  aiAgentsStatus = createMissingAiAgentsStatus(),
  onSave,
  isGitVault = true,
  explicitOrganizationEnabled = true,
  onSaveExplicitOrganization,
  onClose,
}: SettingsPanelProps) {
  if (!open) return null

  return (
    <SettingsPanelInner
      settings={settings}
      aiAgentsStatus={aiAgentsStatus}
      onSave={onSave}
      isGitVault={isGitVault}
      explicitOrganizationEnabled={explicitOrganizationEnabled}
      onSaveExplicitOrganization={onSaveExplicitOrganization}
      onClose={onClose}
    />
  )
}

type SettingsPanelInnerProps = Omit<SettingsPanelProps, 'open' | 'explicitOrganizationEnabled' | 'aiAgentsStatus' | 'isGitVault'> & {
  aiAgentsStatus: AiAgentsStatus
  isGitVault: boolean
  explicitOrganizationEnabled: boolean
}

function SettingsPanelInner({
  settings,
  aiAgentsStatus,
  onSave,
  isGitVault,
  explicitOrganizationEnabled,
  onSaveExplicitOrganization,
  onClose,
}: SettingsPanelInnerProps) {
  const [draft, setDraft] = useState(() => createSettingsDraft(settings, explicitOrganizationEnabled))
  const { setLocale } = useI18n()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      const focusTarget = panelRef.current?.querySelector<HTMLElement>('[data-settings-autofocus="true"]')
      focusTarget?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const updateDraft = useCallback(
    <Key extends keyof SettingsDraft>(key: Key, value: SettingsDraft[Key]) => {
      setDraft((current) => ({ ...current, [key]: value }))
    },
    [],
  )

  const handleSave = useCallback(() => {
    trackTelemetryConsentChange(settings.analytics_enabled === true, draft.analytics)
    setLocale(draft.language)
    onSave(buildSettingsFromDraft(settings, draft))
    onSaveExplicitOrganization?.(draft.explicitOrganization)
    onClose()
  }, [draft, onClose, onSave, onSaveExplicitOrganization, setLocale, settings])

  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose()
    },
    [onClose],
  )

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (isSaveShortcut(event)) {
        event.preventDefault()
        handleSave()
      }
    },
    [handleSave, onClose],
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'var(--shadow-overlay)' }}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      data-testid="settings-panel"
    >
      <div
        ref={panelRef}
        className="rounded-lg border border-border bg-background shadow-[0_18px_55px_var(--shadow-dialog)]"
        style={{ width: 520, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        <SettingsHeader onClose={onClose} />
        <SettingsBody
          pullInterval={draft.pullInterval}
          setPullInterval={(value) => updateDraft('pullInterval', value)}
          isGitVault={isGitVault}
          autoGitEnabled={draft.autoGitEnabled}
          setAutoGitEnabled={(value) => updateDraft('autoGitEnabled', value)}
          autoGitIdleThresholdSeconds={draft.autoGitIdleThresholdSeconds}
          setAutoGitIdleThresholdSeconds={(value) => updateDraft('autoGitIdleThresholdSeconds', value)}
          autoGitInactiveThresholdSeconds={draft.autoGitInactiveThresholdSeconds}
          setAutoGitInactiveThresholdSeconds={(value) => updateDraft('autoGitInactiveThresholdSeconds', value)}
          autoAdvanceInboxAfterOrganize={draft.autoAdvanceInboxAfterOrganize}
          setAutoAdvanceInboxAfterOrganize={(value) => updateDraft('autoAdvanceInboxAfterOrganize', value)}
          aiAgentsStatus={aiAgentsStatus}
          defaultAiAgent={draft.defaultAiAgent}
          setDefaultAiAgent={(value) => updateDraft('defaultAiAgent', value)}
          releaseChannel={draft.releaseChannel}
          setReleaseChannel={(value) => updateDraft('releaseChannel', value)}
          language={draft.language}
          setLanguage={(value) => updateDraft('language', value)}
          themeMode={draft.themeMode}
          setThemeMode={(value) => updateDraft('themeMode', value)}
          initialH1AutoRename={draft.initialH1AutoRename}
          setInitialH1AutoRename={(value) => updateDraft('initialH1AutoRename', value)}
          explicitOrganization={draft.explicitOrganization}
          setExplicitOrganization={(value) => updateDraft('explicitOrganization', value)}
          crashReporting={draft.crashReporting}
          setCrashReporting={(value) => updateDraft('crashReporting', value)}
          analytics={draft.analytics}
          setAnalytics={(value) => updateDraft('analytics', value)}
        />
        <SettingsFooter onClose={onClose} onSave={handleSave} />
      </div>
    </div>
  )
}

function SettingsHeader({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{ height: 56, padding: '0 24px', borderBottom: '1px solid var(--border)' }}
    >
      <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)' }}>{t('settings.title')}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        title={t('settings.close')}
        aria-label={t('settings.close')}
      >
        <X size={16} />
      </Button>
    </div>
  )
}

function SettingsBody({
  pullInterval,
  setPullInterval,
  isGitVault,
  autoGitEnabled,
  setAutoGitEnabled,
  autoGitIdleThresholdSeconds,
  setAutoGitIdleThresholdSeconds,
  autoGitInactiveThresholdSeconds,
  setAutoGitInactiveThresholdSeconds,
  autoAdvanceInboxAfterOrganize,
  setAutoAdvanceInboxAfterOrganize,
  aiAgentsStatus,
  defaultAiAgent,
  setDefaultAiAgent,
  releaseChannel,
  setReleaseChannel,
  language,
  setLanguage,
  themeMode,
  setThemeMode,
  initialH1AutoRename,
  setInitialH1AutoRename,
  explicitOrganization,
  setExplicitOrganization,
  crashReporting,
  setCrashReporting,
  analytics,
  setAnalytics,
}: SettingsBodyProps) {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 0, overflow: 'auto' }}>
      <SettingsSection showDivider={false}>
        <SyncAndUpdatesSection
          pullInterval={pullInterval}
          setPullInterval={setPullInterval}
          releaseChannel={releaseChannel}
          setReleaseChannel={setReleaseChannel}
        />
      </SettingsSection>

      <SettingsSection>
        <AutoGitSettingsSection
          isGitVault={isGitVault}
          autoGitEnabled={autoGitEnabled}
          setAutoGitEnabled={setAutoGitEnabled}
          autoGitIdleThresholdSeconds={autoGitIdleThresholdSeconds}
          setAutoGitIdleThresholdSeconds={setAutoGitIdleThresholdSeconds}
          autoGitInactiveThresholdSeconds={autoGitInactiveThresholdSeconds}
          setAutoGitInactiveThresholdSeconds={setAutoGitInactiveThresholdSeconds}
        />
      </SettingsSection>

      <SettingsSection>
        <AppearanceSettingsSection
          language={language}
          setLanguage={setLanguage}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
        />
      </SettingsSection>

      <SettingsSection>
        <TitleSettingsSection
          initialH1AutoRename={initialH1AutoRename}
          setInitialH1AutoRename={setInitialH1AutoRename}
        />
      </SettingsSection>

      <SettingsSection>
        <AiAgentSettingsSection
          aiAgentsStatus={aiAgentsStatus}
          defaultAiAgent={defaultAiAgent}
          setDefaultAiAgent={setDefaultAiAgent}
        />
      </SettingsSection>

      <SettingsSection>
        <OrganizationWorkflowSection
          checked={explicitOrganization}
          onChange={setExplicitOrganization}
          autoAdvanceInboxAfterOrganize={autoAdvanceInboxAfterOrganize}
          onChangeAutoAdvanceInboxAfterOrganize={setAutoAdvanceInboxAfterOrganize}
        />
      </SettingsSection>

      <SettingsSection>
        <PrivacySettingsSection
          crashReporting={crashReporting}
          setCrashReporting={setCrashReporting}
          analytics={analytics}
          setAnalytics={setAnalytics}
        />
      </SettingsSection>
    </div>
  )
}

function SyncAndUpdatesSection({
  pullInterval,
  setPullInterval,
  releaseChannel,
  setReleaseChannel,
}: Pick<SettingsBodyProps, 'pullInterval' | 'setPullInterval' | 'releaseChannel' | 'setReleaseChannel'>) {
  const { t } = useI18n()
  return (
    <>
      <SectionHeading
        title={t('settings.syncUpdates.title')}
        description={t('settings.syncUpdates.description')}
      />

      <LabeledSelect
        label={t('settings.pullInterval')}
        value={`${pullInterval}`}
        onValueChange={(value) => setPullInterval(Number(value))}
        options={PULL_INTERVAL_OPTIONS.map((value) => ({
          value: `${value}`,
          label: `${value}`,
        }))}
        testId="settings-pull-interval"
        autoFocus={true}
      />

      <LabeledSelect
        label={t('settings.releaseChannel')}
        value={releaseChannel}
        onValueChange={(value) => setReleaseChannel(value as ReleaseChannel)}
        options={[
          { value: 'stable', label: t('settings.releaseChannel.stable') },
          { value: 'alpha', label: t('settings.releaseChannel.alpha') },
        ]}
        testId="settings-release-channel"
      />
    </>
  )
}

function AppearanceSettingsSection({
  language,
  setLanguage,
  themeMode,
  setThemeMode,
}: Pick<SettingsBodyProps, 'language' | 'setLanguage' | 'themeMode' | 'setThemeMode'>) {
  const { t } = useI18n()
  return (
    <>
      <SectionHeading
        title={t('settings.appearance.title')}
        description={t('settings.appearance.description')}
      />

      <LabeledSelect
        label={t('settings.language')}
        value={language}
        onValueChange={(value) => setLanguage(value as AppLocale)}
        options={[
          { value: 'en', label: t('common.english') },
          { value: 'zh-Hans', label: t('common.chinese') },
        ]}
        testId="settings-language"
      />

      <ThemeModeControl value={themeMode} onChange={setThemeMode} />
    </>
  )
}

function ThemeModeControl({
  value,
  onChange,
}: {
  value: ThemeMode
  onChange: (value: ThemeMode) => void
}) {
  const { t } = useI18n()
  return (
    <div
      className="inline-flex w-full rounded-md border border-border bg-muted p-1"
      role="radiogroup"
      aria-label={t('settings.theme')}
      data-testid="settings-theme-mode"
    >
      <ThemeModeButton label={t('settings.theme.light')} selected={value === 'light'} value="light" onSelect={onChange}>
        <Sun size={14} />
      </ThemeModeButton>
      <ThemeModeButton label={t('settings.theme.dark')} selected={value === 'dark'} value="dark" onSelect={onChange}>
        <Moon size={14} />
      </ThemeModeButton>
    </div>
  )
}

function ThemeModeButton({
  children,
  label,
  selected,
  value,
  onSelect,
}: {
  children: ReactNode
  label: string
  selected: boolean
  value: ThemeMode
  onSelect: (value: ThemeMode) => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      data-testid={`settings-theme-${value}`}
      className={
        selected
          ? 'h-7 flex-1 border border-border bg-background text-foreground shadow-xs hover:bg-background'
          : 'h-7 flex-1 text-muted-foreground hover:text-foreground'
      }
      onClick={() => onSelect(value)}
    >
      {children}
      {label}
    </Button>
  )
}

function AutoGitSettingsSection({
  isGitVault,
  autoGitEnabled,
  setAutoGitEnabled,
  autoGitIdleThresholdSeconds,
  setAutoGitIdleThresholdSeconds,
  autoGitInactiveThresholdSeconds,
  setAutoGitInactiveThresholdSeconds,
}: Pick<
  SettingsBodyProps,
  | 'isGitVault'
  | 'autoGitEnabled'
  | 'setAutoGitEnabled'
  | 'autoGitIdleThresholdSeconds'
  | 'setAutoGitIdleThresholdSeconds'
  | 'autoGitInactiveThresholdSeconds'
  | 'setAutoGitInactiveThresholdSeconds'
>) {
  const { t } = useI18n()
  return (
    <>
      <SectionHeading
        title="AutoGit"
        description={isGitVault
          ? t('settings.autogit.descriptionEnabled')
          : t('settings.autogit.descriptionDisabled')}
      />

      <SettingsSwitchRow
        label={t('settings.autogit.enable')}
        description={t('settings.autogit.enableDescription')}
        checked={autoGitEnabled}
        onChange={setAutoGitEnabled}
        disabled={!isGitVault}
        testId="settings-autogit-enabled"
      />

      <LabeledNumberInput
        label={t('settings.autogit.idleThreshold')}
        value={autoGitIdleThresholdSeconds}
        onValueChange={setAutoGitIdleThresholdSeconds}
        testId="settings-autogit-idle-threshold"
        disabled={!isGitVault}
      />

      <LabeledNumberInput
        label={t('settings.autogit.inactiveThreshold')}
        value={autoGitInactiveThresholdSeconds}
        onValueChange={setAutoGitInactiveThresholdSeconds}
        testId="settings-autogit-inactive-threshold"
        disabled={!isGitVault}
      />
    </>
  )
}

function TitleSettingsSection({
  initialH1AutoRename,
  setInitialH1AutoRename,
}: Pick<SettingsBodyProps, 'initialH1AutoRename' | 'setInitialH1AutoRename'>) {
  const { t } = useI18n()
  return (
    <>
      <SectionHeading
        title={t('settings.titleFiles.title')}
        description={t('settings.titleFiles.description')}
      />

      <SettingsSwitchRow
        label={t('settings.titleFiles.autoRename')}
        description={t('settings.titleFiles.autoRenameDescription')}
        checked={initialH1AutoRename}
        onChange={setInitialH1AutoRename}
        testId="settings-initial-h1-auto-rename"
      />
    </>
  )
}

function buildDefaultAiAgentOptions(
  aiAgentsStatus: AiAgentsStatus,
  t: ReturnType<typeof useI18n>['t'],
): Array<{ value: string; label: string }> {
  return AI_AGENT_DEFINITIONS.map((definition) => {
    const status = aiAgentsStatus[definition.id]
    const suffix = status.status === 'installed'
      ? t('settings.ai.installedSuffix', { version: status.version ? ` ${status.version}` : '' })
      : t('settings.ai.missingSuffix')
    return {
      value: definition.id,
      label: `${definition.label}${suffix}`,
    }
  })
}

function AiAgentSettingsSection({
  aiAgentsStatus,
  defaultAiAgent,
  setDefaultAiAgent,
}: Pick<SettingsBodyProps, 'aiAgentsStatus' | 'defaultAiAgent' | 'setDefaultAiAgent'>) {
  const { t } = useI18n()
  return (
    <>
      <SectionHeading
        title={t('settings.ai.title')}
        description={t('settings.ai.description')}
      />

      <LabeledSelect
        label={t('settings.ai.default')}
        value={defaultAiAgent}
        onValueChange={(value) => setDefaultAiAgent(value as AiAgentId)}
        options={buildDefaultAiAgentOptions(aiAgentsStatus, t)}
        testId="settings-default-ai-agent"
      />

      <div style={{ fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.5 }}>
        {renderDefaultAiAgentSummary(defaultAiAgent, aiAgentsStatus, t)}
      </div>
    </>
  )
}

function PrivacySettingsSection({
  crashReporting,
  setCrashReporting,
  analytics,
  setAnalytics,
}: Pick<SettingsBodyProps, 'crashReporting' | 'setCrashReporting' | 'analytics' | 'setAnalytics'>) {
  const { t } = useI18n()
  return (
    <>
      <SectionHeading
        title={t('settings.privacy.title')}
        description={t('settings.privacy.description')}
      />

      <TelemetryToggle
        label={t('settings.privacy.crashReporting')}
        description={t('settings.privacy.crashReportingDescription')}
        checked={crashReporting}
        onChange={setCrashReporting}
        testId="settings-crash-reporting"
      />
      <TelemetryToggle
        label={t('settings.privacy.analytics')}
        description={t('settings.privacy.analyticsDescription')}
        checked={analytics}
        onChange={setAnalytics}
        testId="settings-analytics"
      />
    </>
  )
}

function SettingsSection({
  children,
  showDivider = true,
}: {
  children: ReactNode
  showDivider?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 0' }}>
      {showDivider ? <Divider /> : null}
      {children}
    </div>
  )
}

function SectionHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--muted-foreground)',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.55, maxWidth: 420 }}>
        {description}
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'color-mix(in srgb, var(--border) 82%, transparent)' }} />
}

function renderDefaultAiAgentSummary(
  defaultAiAgent: AiAgentId,
  aiAgentsStatus: AiAgentsStatus,
  t: ReturnType<typeof useI18n>['t'],
): string {
  const definition = getAiAgentDefinition(defaultAiAgent)
  const status = aiAgentsStatus[defaultAiAgent]
  if (status.status === 'installed') {
    return t('settings.ai.readySummary', {
      label: definition.label,
      version: status.version ? ` ${status.version}` : '',
    })
  }
  return t('settings.ai.missingSummary', { label: definition.label })
}

function LabeledSelect({
  label,
  value,
  onValueChange,
  options,
  testId,
  autoFocus = false,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  testId: string
  autoFocus?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }}>{label}</label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className="w-full bg-transparent"
          data-testid={testId}
          data-value={value}
          data-settings-autofocus={autoFocus ? 'true' : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="popper" data-anchor-strategy="popper">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function LabeledNumberInput({
  label,
  value,
  onValueChange,
  testId,
  disabled = false,
}: {
  label: string
  value: number
  onValueChange: (value: number) => void
  testId: string
  disabled?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--foreground)' }} htmlFor={testId}>{label}</label>
      <Input
        id={testId}
        type="number"
        min={1}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onValueChange(sanitizePositiveInteger(Number(event.target.value), value))}
        data-testid={testId}
        className="w-full bg-transparent"
      />
    </div>
  )
}

function OrganizationWorkflowSection({
  checked,
  onChange,
  autoAdvanceInboxAfterOrganize,
  onChangeAutoAdvanceInboxAfterOrganize,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  autoAdvanceInboxAfterOrganize: boolean
  onChangeAutoAdvanceInboxAfterOrganize: (value: boolean) => void
}) {
  const { t } = useI18n()
  return (
    <>
      <SectionHeading
        title={t('settings.workflow.title')}
        description={t('settings.workflow.descriptionUpdated')}
      />

      <SettingsSwitchRow
        label={t('settings.workflow.explicit')}
        description={t('settings.workflow.explicitDescription')}
        checked={checked}
        onChange={onChange}
        testId="settings-explicit-organization"
      />

      <SettingsSwitchRow
        label={t('settings.workflow.autoAdvance')}
        description={t('settings.workflow.autoAdvanceDescription')}
        checked={autoAdvanceInboxAfterOrganize}
        onChange={onChangeAutoAdvanceInboxAfterOrganize}
        testId="settings-auto-advance-inbox-after-organize"
      />
    </>
  )
}

function SettingsSwitchRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  testId,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  testId?: string
}) {
  return (
    <label
      className="flex items-start justify-between gap-3"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
      data-testid={testId}
    >
      <div className="space-y-1">
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} disabled={disabled} />
    </label>
  )
}

function TelemetryToggle({
  label,
  description,
  checked,
  onChange,
  testId,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (value: boolean) => void
  testId: string
}) {
  return (
    <label className="flex items-center gap-3" style={{ cursor: 'pointer' }} data-testid={testId}>
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(isChecked(value))} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{description}</div>
      </div>
    </label>
  )
}

function SettingsFooter({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { t } = useI18n()
  return (
    <div
      className="flex items-center justify-between shrink-0"
      style={{ height: 56, padding: '0 24px', borderTop: '1px solid var(--border)' }}
    >
      <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{t('settings.openShortcutHint')}</span>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onSave} data-testid="settings-save">
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}
