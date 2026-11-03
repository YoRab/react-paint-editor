import useDisclosure from '@editor/hooks/useDisclosure'
import { useId } from 'react'

/**
 * A button of the settings bar showing a panel: at most one panel of the bar is open, the one named by `selectedSettings`.
 * The props of the button open and close the panel
 */
const useSettingsPanel = (selectedSettings: string | undefined, setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>) => {
  const customKey = useId()
  const isPanelVisible = selectedSettings === customKey

  const togglePanel = () => setSelectedSettings(prev => (prev === customKey ? undefined : customKey))
  const disclosure = useDisclosure(isPanelVisible, () => setSelectedSettings(prev => (prev === customKey ? undefined : prev)))

  return {
    ...disclosure,
    isPanelVisible,
    togglePanel,
    triggerProps: { ...disclosure.triggerProps, selected: isPanelVisible, onClick: togglePanel }
  }
}

export default useSettingsPanel
