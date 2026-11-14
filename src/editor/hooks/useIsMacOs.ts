// Copy of the hook of the canvas: the editor only depends on the public API of the canvas
import { useSyncExternalStore } from 'react'

// the platform does not change during the life of the page
const subscribe = () => () => undefined
// the shortcuts take ⌘ instead of Ctrl on macOS
const isMacOs = () => navigator.userAgent.includes('Macintosh')
const isMacOsOnServer = () => false

/** Whether the browser runs on macOS: false on the server and while hydrating what it rendered, then read from the browser */
const useIsMacOs = (): boolean => useSyncExternalStore(subscribe, isMacOs, isMacOsOnServer)

export default useIsMacOs
