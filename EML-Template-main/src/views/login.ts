import { setUser, setView } from '../state'
import { auth } from '../ipc'
import { Dialog } from './dialog'
import logger from 'electron-log/renderer'

export function initLogin() {
  const btnMs = document.getElementById('btn-login-ms') as HTMLButtonElement | null
  const btnCrack = document.getElementById('btn-login-crack') as HTMLButtonElement | null
  const crackInput = document.getElementById('crack-username') as HTMLInputElement | null

  btnMs?.addEventListener('click', async () => {
    const originalText = btnMs.innerHTML
    btnMs.disabled = true
    btnMs.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Connecting...'
    try {
      const session = await auth.login()
      if (session.success) {
        setUser(session.account)
        setView('home')
      } else {
        logger.error(session.error)
        await Dialog.show('Login failed', [{ text: 'OK', type: 'ok' }])
      }
    } catch (err) {
      logger.error(err)
      await Dialog.show('An error occurred during login.', [{ text: 'OK', type: 'ok' }])
    } finally {
      btnMs.disabled = false
      btnMs.innerHTML = originalText
    }
  })

  btnCrack?.addEventListener('click', async () => {
    const username = crackInput?.value.trim()
    if (!username || username.length < 3) {
      await Dialog.show('Enter a valid username (min 3 characters).', [{ text: 'OK', type: 'ok' }])
      return
    }
    const originalText = btnCrack.innerHTML
    btnCrack.disabled = true
    btnCrack.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Connecting...'
    try {
      const session = await (auth as any).loginCrack(username)
      if (session.success) {
        setUser(session.account)
        setView('home')
      } else {
        await Dialog.show('Offline login failed.', [{ text: 'OK', type: 'ok' }])
      }
    } catch (err) {
      logger.error(err)
      await Dialog.show('An error occurred.', [{ text: 'OK', type: 'ok' }])
    } finally {
      btnCrack.disabled = false
      btnCrack.innerHTML = originalText
    }
  })
}
