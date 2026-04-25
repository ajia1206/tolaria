import { type ChangeEvent, type FormEvent, useCallback, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isTauri, mockInvoke } from '../mock-tauri'
import { translate, type I18nContextValue } from '../lib/i18nShared'
import { useI18n } from '../lib/useI18n'

type CloneStatus = 'idle' | 'cloning' | 'error'
type CloneAttemptResult =
  | { ok: true }
  | { ok: false; errorMessage: string }
type CloneRequest = Record<string, unknown> & {
  url: string
  localPath: string
}

interface CloneVaultModalProps {
  open: boolean
  onClose: () => void
  onVaultCloned: (path: string, label: string) => void
}

interface CloneVaultFormState {
  repoUrl: string
  localPath: string
  cloneStatus: CloneStatus
  cloneError: string | null
  isCloning: boolean
  isCloneDisabled: boolean
  handleClose: () => void
  handleRepoUrlChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleLocalPathChange: (event: ChangeEvent<HTMLInputElement>) => void
  handleClone: () => Promise<void>
}

function tauriCall<T>(cmd: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(cmd, args) : mockInvoke<T>(cmd, args)
}

function repoNameFromUrl(request: Pick<CloneRequest, 'url'>): string {
  const trimmed = request.url.trim().replace(/\/+$/g, '')
  if (!trimmed) return ''
  const segment = trimmed.split(/[/:]/).pop() ?? ''
  return segment.replace(/\.git$/i, '')
}

function suggestedPathFromUrl(request: Pick<CloneRequest, 'url'>): string {
  const repoName = repoNameFromUrl(request)
  return repoName ? `~/Vaults/${repoName}` : ''
}

function labelFromPath(request: Pick<CloneRequest, 'localPath'>): string {
  const trimmed = request.localPath.trim().replace(/\/+$/g, '')
  return trimmed.split('/').pop() || 'Vault'
}

function shouldSyncSuggestedPath(localPath: string, pathDirty: boolean, previousSuggestedPath: string): boolean {
  return !pathDirty || !localPath.trim() || localPath === previousSuggestedPath
}

async function attemptClone(request: CloneRequest, t: I18nContextValue['t']): Promise<CloneAttemptResult> {
  try {
    await tauriCall<string>('clone_git_repo', request)
    return { ok: true }
  } catch (error) {
    return { ok: false, errorMessage: t('cloneVault.failed', { error: String(error) }) }
  }
}

function useCloneVaultForm(
  onClose: () => void,
  onVaultCloned: (path: string, label: string) => void,
  t: I18nContextValue['t'] = (key, params) => translate('en', key, params),
): CloneVaultFormState {
  const [repoUrl, setRepoUrl] = useState('')
  const [localPath, setLocalPath] = useState('')
  const [pathDirty, setPathDirty] = useState(false)
  const [cloneStatus, setCloneStatus] = useState<CloneStatus>('idle')
  const [cloneError, setCloneError] = useState<string | null>(null)
  const cloneInFlightRef = useRef(false)
  const previousSuggestedPathRef = useRef('')

  const resetState = useCallback(() => {
    setRepoUrl('')
    setLocalPath('')
    setPathDirty(false)
    setCloneStatus('idle')
    setCloneError(null)
    previousSuggestedPathRef.current = ''
  }, [])

  const handleClose = useCallback(() => {
    if (cloneInFlightRef.current) return
    resetState()
    onClose()
  }, [onClose, resetState])

  const handleRepoUrlChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setRepoUrl(value)
    setCloneError(null)

    const nextSuggestedPath = suggestedPathFromUrl({ url: value })
    const previousSuggestedPath = previousSuggestedPathRef.current

    if (shouldSyncSuggestedPath(localPath, pathDirty, previousSuggestedPath)) {
      setLocalPath(nextSuggestedPath)
    }

    previousSuggestedPathRef.current = nextSuggestedPath
  }, [localPath, pathDirty])

  const handleLocalPathChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setPathDirty(true)
    setLocalPath(value)
    setCloneError(null)
  }, [])

  const handleClone = useCallback(async () => {
    const trimmedUrl = repoUrl.trim()
    const trimmedPath = localPath.trim()
    const request = { url: trimmedUrl, localPath: trimmedPath }
    if (!request.url || !request.localPath || cloneInFlightRef.current) return

    cloneInFlightRef.current = true
    setCloneStatus('cloning')
    setCloneError(null)
    const result = await attemptClone(request, t)
    cloneInFlightRef.current = false

    if (result.ok) {
      onVaultCloned(request.localPath, labelFromPath({ localPath: request.localPath }))
      handleClose()
      return
    }

    setCloneStatus('error')
    setCloneError(result.errorMessage)
  }, [handleClose, localPath, onVaultCloned, repoUrl, t])

  const isCloning = cloneStatus === 'cloning'

  return {
    repoUrl,
    localPath,
    cloneStatus,
    cloneError,
    isCloning,
    isCloneDisabled: !repoUrl.trim() || !localPath.trim() || isCloning,
    handleClose,
    handleRepoUrlChange,
    handleLocalPathChange,
    handleClone,
  }
}

export function CloneVaultModal({ open, onClose, onVaultCloned }: CloneVaultModalProps) {
  const { t } = useI18n()
  const {
    repoUrl,
    localPath,
    cloneStatus,
    cloneError,
    isCloning,
    isCloneDisabled,
    handleClose,
    handleRepoUrlChange,
    handleLocalPathChange,
    handleClone,
  } = useCloneVaultForm(onClose, onVaultCloned, t)
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen && !isCloning) handleClose()
  }, [handleClose, isCloning])
  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleClone()
  }, [handleClone])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]" data-testid="clone-vault-modal">
        <DialogHeader>
          <DialogTitle>{t('cloneVault.title')}</DialogTitle>
          <DialogDescription>
            {t('cloneVault.description')}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4 py-2" onSubmit={handleSubmit} data-testid="clone-vault-form" aria-busy={isCloning}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="clone-repo-url">{t('cloneVault.repoUrl')}</label>
            <Input
              id="clone-repo-url"
              placeholder={t('cloneVault.repoUrlPlaceholder')}
              value={repoUrl}
              disabled={isCloning}
              onChange={handleRepoUrlChange}
              data-testid="clone-repo-url"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="clone-vault-path">{t('cloneVault.cloneTo')}</label>
            <Input
              id="clone-vault-path"
              placeholder={t('cloneVault.cloneToPlaceholder')}
              value={localPath}
              disabled={isCloning}
              onChange={handleLocalPathChange}
              data-testid="clone-vault-path"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {isCloning
              ? t('cloneVault.progressHelp')
              : t('cloneVault.help')}
          </p>

          {cloneError && (
            <p className="text-xs text-destructive" data-testid="clone-vault-error">{cloneError}</p>
          )}

          <DialogFooter className="flex-row items-center justify-end sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCloning}
              data-testid="clone-vault-cancel"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isCloneDisabled}
              data-testid="clone-vault-submit"
            >
              {cloneStatus === 'cloning' ? t('cloneVault.submitting') : t('cloneVault.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
