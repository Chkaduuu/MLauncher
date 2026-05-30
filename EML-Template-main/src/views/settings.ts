import { setView, closeOverlay } from '../state'
import { auth, settings, system } from '../ipc'
import { Dialog } from './dialog'
import type { IGameSettings } from '../../electron/handlers/settings'

const resolutionList = [
  { label: 'Auto (default)', value: '854x480', width: 854, height: 480 },
  { label: 'Fullscreen', value: 'fullscreen', width: 854, height: 480 },
  { label: '2560x1440 (1440p)', value: '2560x1440', width: 2560, height: 1440 },
  { label: '1920x1080 (1080p)', value: '1920x1080', width: 1920, height: 1080 },
  { label: '1600x900', value: '1600x900', width: 1600, height: 900 },
  { label: '1366x768', value: '1366x768', width: 1366, height: 768 },
  { label: '1280x1024', value: '1280x1024', width: 1280, height: 1024 },
  { label: '1280x720 (720p)', value: '1280x720', width: 1280, height: 720 },
  { label: '1024x768', value: '1024x768', width: 1024, height: 768 },
  { label: '800x600', value: '800x600', width: 800, height: 600 }
]

let currentSettings: IGameSettings

export async function initSettings() {
  const sysInfo = await system.getInfo()
  currentSettings = await settings.get()

  initUIListeners()
  initRamInput(sysInfo.totalMem)
  initFormValues(sysInfo.resolution)

  const versionElem = document.getElementById('version')
  if (versionElem) versionElem.innerText = `MLauncher v${sysInfo.version}`
}

function initUIListeners() {
  const closeBtn = document.getElementById('btn-close-settings')
  const tabContents = document.querySelectorAll('.tab-content')
  const tabButtons = document.querySelectorAll('.nav-btn')
  const logoutBtn = document.getElementById('btn-logout')

  closeBtn?.addEventListener('click', async () => {
    await saveSettings()
    closeOverlay('settings')
  })

  logoutBtn?.addEventListener('click', async () => {
    if (await Dialog.show('Log out?', [
      { text: 'Cancel', type: 'cancel' },
      { text: 'Logout', type: 'danger' }
    ])) {
      await auth.logout()
      closeOverlay('settings')
      setView('login')
    }
  })

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabButtons.forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')
      const targetTab = btn.getAttribute('data-tab')
      tabContents.forEach((c) => (c.id === `tab-${targetTab}` ? c.classList.add('active') : c.classList.remove('active')))
    })
  })
}

function initRamInput(maxRamSystem: number) {
  const ramInput = document.getElementById('ram-amount') as HTMLInputElement
  if (!ramInput) return
  ramInput.max = Math.min(maxRamSystem, 32).toString()
}

function initFormValues(resolution: { width: number; height: number }) {
  if (!currentSettings) return

  const ramInput = document.getElementById('ram-amount') as HTMLInputElement
  const resolutionSelect = document.getElementById('resolution-select') as HTMLSelectElement
  const launcherActionSelect = document.getElementById('launcher-action-select') as HTMLSelectElement
  const javaSelect = document.getElementById('java-select') as HTMLSelectElement

  if (ramInput) ramInput.value = currentSettings.memory.max.replace('G', '')

  if (resolutionSelect) {
    const availableResolutions = getAvailableResolutions(resolution)
    resolutionSelect.innerHTML = ''
    availableResolutions.forEach((res) => {
      const option = document.createElement('option')
      option.value = res.value
      option.innerText = res.label
      resolutionSelect.appendChild(option)
    })
    resolutionSelect.value = currentSettings.resolution.fullscreen
      ? 'fullscreen'
      : `${currentSettings.resolution.width}x${currentSettings.resolution.height}`
  }

  if (launcherActionSelect) launcherActionSelect.value = currentSettings.launcherAction
  if (javaSelect) javaSelect.value = currentSettings.java === 'bundled' ? 'bundled' : 'custom'
}

async function saveSettings() {
  const ramInput = document.getElementById('ram-amount') as HTMLInputElement
  const launcherActionSelect = document.getElementById('launcher-action-select') as HTMLSelectElement
  const resolutionSelect = document.getElementById('resolution-select') as HTMLSelectElement
  const javaSelect = document.getElementById('java-select') as HTMLSelectElement

  const newSettings: IGameSettings = {
    ...currentSettings,
    memory: {
      min: `${ramInput.value}G`,
      max: `${ramInput.value}G`
    },
    resolution: {
      height: resolutionList.find((r) => r.value === resolutionSelect.value)?.height ?? 720,
      width: resolutionList.find((r) => r.value === resolutionSelect.value)?.width ?? 1280,
      fullscreen: resolutionSelect.value === 'fullscreen'
    },
    java: javaSelect.value === 'bundled' ? 'bundled' : 'path',
    launcherAction: launcherActionSelect.value as 'close' | 'keep' | 'hide'
  }

  await settings.set(newSettings)
  currentSettings = newSettings
}

function getAvailableResolutions(systemResolution: { width: number; height: number }) {
  return resolutionList.filter((res) => res.width <= systemResolution.width && res.height <= systemResolution.height)
}
