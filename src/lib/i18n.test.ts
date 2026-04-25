import { describe, expect, it } from 'vitest'
import { normalizeAppLocale, normalizeStoredAppLocale, translate } from './i18nShared'
import { translateVaultDisplayText, translateVaultSnippet } from './vaultDisplay'

describe('normalizeAppLocale', () => {
  it('maps Chinese locales to zh-Hans', () => {
    expect(normalizeAppLocale('zh-Hans-CN')).toBe('zh-Hans')
    expect(normalizeAppLocale('zh-CN')).toBe('zh-Hans')
  })

  it('falls back to english for non-Chinese locales', () => {
    expect(normalizeAppLocale('en-US')).toBe('en')
    expect(normalizeAppLocale('ja-JP')).toBe('en')
    expect(normalizeAppLocale(null)).toBe('en')
  })
})

describe('normalizeStoredAppLocale', () => {
  it('accepts saved English and Chinese app locales', () => {
    expect(normalizeStoredAppLocale('en')).toBe('en')
    expect(normalizeStoredAppLocale('zh-Hans')).toBe('zh-Hans')
  })

  it('rejects unsupported saved locales', () => {
    expect(normalizeStoredAppLocale('fr')).toBeNull()
    expect(normalizeStoredAppLocale(null)).toBeNull()
  })
})

describe('translate', () => {
  it('interpolates English messages', () => {
    expect(
      translate('en', 'app.toast.folderCreated', { name: 'Inbox' }),
    ).toBe('Created folder "Inbox"')
  })

  it('returns Chinese copy for zh-Hans locale', () => {
    expect(
      translate('zh-Hans', 'cloneVault.submit'),
    ).toBe('克隆并打开')
  })
})

describe('vault display translations', () => {
  it('localizes starter-vault labels only in Chinese mode', () => {
    expect(translateVaultDisplayText('zh-Hans', 'Projects')).toBe('项目')
    expect(translateVaultDisplayText('zh-Hans', 'Getting Started')).toBe('入门示例')
    expect(translateVaultDisplayText('en', 'Projects')).toBe('Projects')
  })

  it('localizes known starter-vault snippets without changing unknown content', () => {
    expect(
      translateVaultSnippet('zh-Hans', 'The first usable release for daily browsing, quick open, and note-property editing.'),
    ).toContain('首个可用于日常浏览')
    expect(translateVaultSnippet('zh-Hans', 'Custom user note')).toBe('Custom user note')
  })
})
