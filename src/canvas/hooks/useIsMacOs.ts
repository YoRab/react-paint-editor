import { isMacOs } from '@canvas/utils/util'
import { useSyncExternalStore } from 'react'

// the platform does not change during the life of the page
const subscribe = () => () => undefined
const isMacOsOnServer = () => false

/** Whether the browser runs on macOS: false on the server and while hydrating what it rendered, then read from the browser */
const useIsMacOs = (): boolean => useSyncExternalStore(subscribe, isMacOs, isMacOsOnServer)

export default useIsMacOs
