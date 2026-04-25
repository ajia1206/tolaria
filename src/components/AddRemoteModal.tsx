import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
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
import type { GitAddRemoteResult } from '../types'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { I18nContextValue } from '../lib/i18nShared'
import { useI18n } from '../lib/useI18n'

type ConnectState = 'idle' | 'connecting'

interface AddRemoteModalProps {
  open: boolean
  vaultPath: string
  onClose: () => void
  onRemoteConnected: (message: string) => void | Promise<void>
}

function tauriCall<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

function shouldCloseAfterResult(result: GitAddRemoteResult): boolean {
  return result.status === 'connected' || result.status === 'already_configured'
}

async function submitRemoteConnection(
  vaultPath: string,
  remoteUrl: string,
): Promise<GitAddRemoteResult> {
  return tauriCall<GitAddRemoteResult>('git_add_remote', {
    request: {
      vaultPath,
      remoteUrl,
    },
  })
}

async function getConnectErrorMessage({
  vaultPath,
  remoteUrl,
  onRemoteConnected,
  onClose,
  t,
}: {
  vaultPath: string
  remoteUrl: string
  onRemoteConnected: (message: string) => void | Promise<void>
  onClose: () => void
  t: I18nContextValue['t']
}): Promise<string | null> {
  try {
    const result = await submitRemoteConnection(vaultPath, remoteUrl)

    if (shouldCloseAfterResult(result)) {
      await onRemoteConnected(result.message)
      onClose()
      return null
    }

    return result.message
  } catch (error) {
    return t('addRemote.failed', { error: String(error) })
  }
}

export function AddRemoteModal({
  open,
  vaultPath,
  onClose,
  onRemoteConnected,
}: AddRemoteModalProps) {
  const { t } = useI18n()
  const [remoteUrl, setRemoteUrl] = useState('')
  const [connectState, setConnectState] = useState<ConnectState>('idle')
  const [connectError, setConnectError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const resetState = useCallback(() => {
    setRemoteUrl('')
    setConnectState('idle')
    setConnectError(null)
  }, [])

  const handleClose = useCallback(() => {
    resetState()
    onClose()
  }, [onClose, resetState])

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      handleClose()
    }
  }, [handleClose])
  const handleRemoteUrlChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setRemoteUrl(event.target.value)
    setConnectError(null)
  }, [])

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedUrl = remoteUrl.trim()
    if (!trimmedUrl) return

    setConnectState('connecting')
    setConnectError(null)

    const errorMessage = await getConnectErrorMessage({
      vaultPath,
      remoteUrl: trimmedUrl,
      onRemoteConnected,
      onClose: handleClose,
      t,
    })

    if (errorMessage) {
      setConnectError(errorMessage)
    }

    setConnectState('idle')
  }, [handleClose, onRemoteConnected, remoteUrl, t, vaultPath])

  const connectDisabled = connectState === 'connecting' || !remoteUrl.trim()

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]" data-testid="add-remote-modal">
        <DialogHeader>
          <DialogTitle>{t('addRemote.title')}</DialogTitle>
          <DialogDescription>
            {t('addRemote.description')}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4 py-2" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="add-remote-url">{t('addRemote.repoUrl')}</label>
            <Input
              id="add-remote-url"
              ref={inputRef}
              autoFocus
              placeholder={t('addRemote.repoUrlPlaceholder')}
              value={remoteUrl}
              onChange={handleRemoteUrlChange}
              data-testid="add-remote-url"
            />
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('addRemote.help')}
          </p>

          {connectError && (
            <p className="text-xs text-destructive" data-testid="add-remote-error">{connectError}</p>
          )}

          <DialogFooter className="flex-row items-center justify-end sm:justify-end">
            <Button type="submit" disabled={connectDisabled} data-testid="add-remote-submit">
              {connectState === 'connecting' ? t('addRemote.connecting') : t('addRemote.connect')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
