export interface TouchDragTarget {
  id: string
  type: string
}

export interface UseTouchDragOptions {
  findTarget: (el: Element | null) => TouchDragTarget | null
  onOver: (target: TouchDragTarget | null) => void
  onDrop: (target: TouchDragTarget | null) => void
  onEnd: () => void
}

export function useTouchDrag(options: UseTouchDragOptions) {
  let ghost: HTMLElement | null = null
  let offsetX = 0
  let offsetY = 0

  function removeGhost() {
    ghost?.remove()
    ghost = null
  }

  function findUnder(clientX: number, clientY: number): Element | null {
    if (!ghost) return document.elementFromPoint(clientX, clientY)
    // Hide ghost so elementFromPoint sees through it
    ghost.style.visibility = 'hidden'
    const el = document.elementFromPoint(clientX, clientY)
    ghost.style.visibility = 'visible'
    return el
  }

  function handleMove(event: TouchEvent) {
    event.preventDefault()
    const touch = event.touches[0]
    if (!touch || !ghost) return
    ghost.style.left = `${touch.clientX - offsetX}px`
    ghost.style.top = `${touch.clientY - offsetY}px`
    options.onOver(options.findTarget(findUnder(touch.clientX, touch.clientY)))
  }

  function handleCancel() {
    removeGhost()
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
    options.onEnd()
  }

  function handleEnd(event: TouchEvent) {
    const touch = event.changedTouches[0]
    removeGhost()
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchcancel', handleCancel)
    const el = touch ? findUnder(touch.clientX, touch.clientY) : null
    options.onDrop(options.findTarget(el))
    options.onEnd()
  }

  function startTouchDrag(event: TouchEvent, sourceEl: HTMLElement) {
    event.preventDefault()
    // Clean up any in-flight drag before starting a new one
    removeGhost()
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
    document.removeEventListener('touchcancel', handleCancel)

    const touch = event.touches[0]
    if (!touch) return

    const rect = sourceEl.getBoundingClientRect()
    offsetX = touch.clientX - rect.left
    offsetY = touch.clientY - rect.top

    ghost = sourceEl.cloneNode(true) as HTMLElement

    // cloneNode copies attributes, not live input values — copy them manually
    sourceEl.querySelectorAll<HTMLInputElement>('input, textarea, select').forEach((src, i) => {
      const dst = ghost!.querySelectorAll<HTMLInputElement>('input, textarea, select')[i]
      if (dst) dst.value = src.value
    })

    Object.assign(ghost.style, {
      position: 'fixed',
      left: `${touch.clientX - offsetX}px`,
      top: `${touch.clientY - offsetY}px`,
      width: `${rect.width}px`,
      margin: '0',
      opacity: '0.85',
      pointerEvents: 'none',
      zIndex: '9999',
      transform: 'scale(1.02) rotate(0.5deg)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
      transition: 'none',
    })
    document.body.appendChild(ghost)

    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd, { once: true })
    document.addEventListener('touchcancel', handleCancel, { once: true })
  }

  onUnmounted(() => {
    removeGhost()
    document.removeEventListener('touchmove', handleMove)
    document.removeEventListener('touchend', handleEnd)
    document.removeEventListener('touchcancel', handleCancel)
  })

  return { startTouchDrag }
}
