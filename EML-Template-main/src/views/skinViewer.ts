import * as skinview3d from 'skinview3d'

let viewer: skinview3d.SkinViewer | null = null

export function initSkinViewer(username: string) {
  const container = document.getElementById('skin-viewer-container')
  const canvas = document.getElementById('skin-canvas') as HTMLCanvasElement
  if (!container || !canvas) return

  if (viewer) {
    viewer.dispose()
    viewer = null
  }


  viewer = new skinview3d.SkinViewer({
    canvas,
    width: container.clientWidth || 200,
    height: container.clientHeight || 400,
    skin: `https://minotar.net/skin/${username}`
  })

  viewer.controls.enableZoom = false
  viewer.controls.enablePan = false
  viewer.controls.autoRotate = false
  viewer.controls.enableRotate = true

  // Left click = rotate, Right click = also rotate (both buttons work)
  viewer.controls.mouseButtons = {
    LEFT: 0,   // ROTATE
    MIDDLE: 1, // DOLLY (zoom - disabled)
    RIGHT: 0   // ROTATE
  }

  // Idle animation
  const animation = new skinview3d.IdleAnimation()
  animation.speed = 0.5
  viewer.animation = animation

  // Resize observer
  const resizeObserver = new ResizeObserver(() => {
    if (viewer && container) {
      viewer.setSize(container.clientWidth, container.clientHeight)
    }
  })
  resizeObserver.observe(container)
}

export function disposeSkinViewer() {
  if (viewer) {
    viewer.dispose()
    viewer = null
  }
}
