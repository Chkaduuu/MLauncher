import { ipcMain, BrowserWindow, app } from 'electron'
import { Launcher } from 'eml-lib'
import type { Account } from 'eml-lib'
import type { IGameSettings } from './settings'
import logger from 'electron-log/main'
import { ADMINTOOL_URL } from '../const'
import * as fs from 'node:fs'
import * as path from 'node:path'

function safeSend(mainWindow: BrowserWindow, channel: string, ...args: any[]) {
  if (!mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args)
  }
}

function writeServersDat(gameDir: string) {
  try {
    if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true })
    const ip = 'mythos.mcsrv.ge:5078'
    const name = 'Mythos Core'
    const ipBuf = Buffer.from(ip)
    const nameBuf = Buffer.from(name)
    const buf = Buffer.concat([
      Buffer.from([0x0a, 0x00, 0x00]),
      Buffer.from([0x09, 0x00, 0x07]),
      Buffer.from('servers'),
      Buffer.from([0x0a, 0x00, 0x00, 0x00, 0x01]),
      Buffer.from([0x08, 0x00, 0x04]),
      Buffer.from('name'),
      Buffer.from([nameBuf.length >> 8, nameBuf.length & 0xff]),
      nameBuf,
      Buffer.from([0x08, 0x00, 0x02]),
      Buffer.from('ip'),
      Buffer.from([ipBuf.length >> 8, ipBuf.length & 0xff]),
      ipBuf,
      Buffer.from([0x00, 0x00])
    ])
    fs.writeFileSync(path.join(gameDir, 'servers.dat'), buf)
    logger.log('servers.dat written successfully')
  } catch (err) {
    logger.error('Failed to write servers.dat:', err)
  }
}

export function registerLauncherHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('game:launch', (_event, payload: { account: Account; settings: IGameSettings }) => {
    const { account, settings } = payload
    const java = settings.java === 'system' ? { install: 'manual' as const, absolutePath: 'java' } : { install: 'auto' as const }
    logger.log('Launching')

    const gameDir = path.join(app.getPath('appData'), '.mythos_core')
    writeServersDat(gameDir)

    const launcher = new Launcher({
      url: ADMINTOOL_URL,
      serverId: 'mythos-core',
      account: account,
      cleaning: { clean: false },
      java: java,
      memory: {
        min: 512,
        max: Math.max(+settings.memory.max.toString().replace('G', '') * 1024, 1024)
      },
      window: {
        width: settings.resolution.width,
        height: settings.resolution.height,
        fullscreen: settings.resolution.fullscreen
      }
    })

    launcher.on('launch_compute_download', () => {
      logger.log('Computing download...')
      safeSend(mainWindow, 'game:launch_compute_download')
    })
    launcher.on('launch_download', (download) => {
      logger.log(`Downloading ${download.total.amount} files (${download.total.size} B).`)
      safeSend(mainWindow, 'game:launch_download', download)
    })
    launcher.on('download_progress', (progress) => {
      safeSend(mainWindow, 'game:download_progress', progress)
    })
    launcher.on('download_error', (error) => {
      logger.error(`Error downloading ${error.filename}: ${error.message}`)
      safeSend(mainWindow, 'game:download_error', error)
    })
    launcher.on('download_end', (info) => {
      logger.log(`Downloaded ${info.downloaded.amount} files.`)
      safeSend(mainWindow, 'game:download_end', info)
    })
    launcher.on('launch_install_loader', (loader) => {
      logger.log(`Installing loader ${loader.type} ${loader.loaderVersion}...`)
      safeSend(mainWindow, 'game:launch_install_loader', loader)
    })
    launcher.on('launch_extract_natives', () => {
      logger.log('Extracting natives...')
      safeSend(mainWindow, 'game:launch_extract_natives')
    })
    launcher.on('extract_progress', (progress) => {
      logger.log(`Extracted ${progress.filename}.`)
      safeSend(mainWindow, 'game:extract_progress', progress)
    })
    launcher.on('extract_end', (info) => {
      logger.log(`Extracted ${info.amount} files.`)
      safeSend(mainWindow, 'game:extract_end', info)
    })
    launcher.on('launch_copy_assets', () => {
      logger.log('Copying assets...')
      safeSend(mainWindow, 'game:launch_copy_assets')
    })
    launcher.on('copy_progress', (progress) => {
      logger.log(`Copied ${progress.filename} to ${progress.dest}.`)
      safeSend(mainWindow, 'game:copy_progress', progress)
    })
    launcher.on('copy_end', (info) => {
      logger.log(`Copied ${info.amount} files.`)
      safeSend(mainWindow, 'game:copy_end', info)
    })
    launcher.on('launch_patch_loader', () => {
      logger.log('Patching loader...')
      safeSend(mainWindow, 'game:launch_patch_loader')
    })
    launcher.on('patch_progress', (progress) => {
      safeSend(mainWindow, 'game:patch_progress', progress)
    })
    launcher.on('patch_error', (error) => {
      logger.error(`Error patching ${error.filename}: ${error.message}`)
      safeSend(mainWindow, 'game:patch_error', error)
    })
    launcher.on('patch_end', (info) => {
      logger.log(`Patched ${info.amount} files.`)
      safeSend(mainWindow, 'game:patch_end', info)
    })
    launcher.on('launch_check_java', () => {
      logger.log('Checking Java...')
      safeSend(mainWindow, 'game:launch_check_java')
    })
    launcher.on('java_info', (info) => {
      logger.log(`Using Java ${info.version} ${info.arch}`)
      safeSend(mainWindow, 'game:java_info', info)
    })
    launcher.on('launch_clean', () => {
      logger.log('Cleaning game directory...')
      safeSend(mainWindow, 'game:launch_clean')
    })
    launcher.on('clean_progress', (progress) => {
      safeSend(mainWindow, 'game:clean_progress', progress)
    })
    launcher.on('clean_end', (info) => {
      logger.log(`Cleaned ${info.amount} files.`)
      safeSend(mainWindow, 'game:clean_end', info)
    })
    launcher.on('launch_launch', (info) => {
      logger.log(`Launching Minecraft ${info.version} (${info.type}${info.loaderVersion ? ` ${info.loaderVersion}` : ''})...`)
      safeSend(mainWindow, 'game:launch_launch', info)
      safeSend(mainWindow, 'game:launched')
      if (settings.launcherAction === 'close') {
        setTimeout(() => { if (!mainWindow.isDestroyed()) app.quit() }, 5000)
      } else if (settings.launcherAction === 'hide') {
        setTimeout(() => { if (!mainWindow.isDestroyed()) mainWindow.minimize() }, 5000)
      }
    })
    launcher.on('launch_data', (message) => {
      logger.log(message)
      safeSend(mainWindow, 'game:launch_data', message)
    })
    launcher.on('launch_close', (code) => {
      logger.log(`Closed with code ${code}.`)
      safeSend(mainWindow, 'game:launch_close', code)
    })
    launcher.on('launch_debug', (message) => {
      safeSend(mainWindow, 'game:launch_debug', message)
    })
    launcher.on('patch_debug', (message) => {
      safeSend(mainWindow, 'game:patch_debug', message)
    })

    try {
      launcher.launch()
    } catch (err) {
      logger.error('Launcher error:', err)
    }
  })
}
