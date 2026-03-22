import { contextBridge, ipcRenderer } from 'electron'
import type { IpcApi, MoveSuggestion, HistoryEntry, Rule } from './shared/types'

const api: IpcApi = {
  getWatchFolders: () => ipcRenderer.invoke('get-watch-folders'),
  addWatchFolder: (path: string) => ipcRenderer.invoke('add-watch-folder', path),
  removeWatchFolder: (path: string) => ipcRenderer.invoke('remove-watch-folder', path),
  getHistory: () => ipcRenderer.invoke('get-history'),
  undoOperation: (id: number) => ipcRenderer.invoke('undo-operation', id),
  getRules: () => ipcRenderer.invoke('get-rules'),
  updateRule: (id: number, update: Partial<Omit<Rule, 'id'>>) =>
    ipcRenderer.invoke('update-rule', id, update),
  toggleRule: (id: number, isActive: boolean) =>
    ipcRenderer.invoke('toggle-rule', id, isActive),
  addRule: (rule: Omit<Rule, 'id'>) =>
    ipcRenderer.invoke('add-rule', rule),
  deleteRule: (id: number) =>
    ipcRenderer.invoke('delete-rule', id),
  checkConflicts: (ruleType: string, pattern: string, excludeId?: number) =>
    ipcRenderer.invoke('check-conflicts', ruleType, pattern, excludeId),
  onSuggestion: (callback: (suggestion: MoveSuggestion) => void) => {
    ipcRenderer.on('new-suggestion', (_event, suggestion) => callback(suggestion))
  },
  acceptSuggestion: (suggestion: MoveSuggestion) =>
    ipcRenderer.invoke('accept-suggestion', suggestion),
  skipSuggestion: (suggestion: MoveSuggestion) =>
    ipcRenderer.invoke('skip-suggestion', suggestion),
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('set-setting', key, value),
  setBaseDirectory: () => ipcRenderer.invoke('set-base-directory'),
}

contextBridge.exposeInMainWorld('ablage', api)
