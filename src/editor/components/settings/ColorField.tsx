import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import { eyedropperIcon, noFillIcon, noStrokeIcon, paletteIcon } from '@editor/constants/icons'
import { uniqueId } from '@editor/utils/util'
import type React from 'react'
import { useEffect, useState } from 'react'
import './ColorField.css'

type ShapeStyleColorType = {
  selectedSettings: string | undefined
  setSelectedSettings: React.Dispatch<React.SetStateAction<string | undefined>>
  title?: string
  disabled?: boolean | undefined
  field: string
  mode?: 'fill' | 'stroke'
  value?: string | undefined
  values: string[]
  valueChanged: (field: string, value: string | number) => void
  /** The custom colors chosen last, newest first, shared by the fields */
  recentColors: string[]
  addRecentColor: (color: string) => void
  /** Picks a color of the drawing */
  pickColor: () => Promise<string | undefined>
  /** Whether a color of the drawing is being picked */
  isPicking: boolean
}

type ColorButtonType = {
  color: string
  mode: 'fill' | 'stroke'
  selected: boolean
  onClick: () => void
  title?: string
  disabled?: boolean
}

/** A button showing a color, named after it by default */
const ColorButton = ({ color, mode, selected, onClick, title = color, disabled = false }: ColorButtonType) => (
  <Button
    title={title}
    selected={selected}
    disabled={disabled}
    icon={color === 'transparent' ? (mode === 'fill' ? noFillIcon : noStrokeIcon) : undefined}
    onClick={onClick}
  >
    {color !== 'transparent' && (
      <div
        className='react-paint-editor-colorfield-color'
        data-mode={mode}
        style={{
          '--react-paint-editor-colorfield-color-value': color
        }}
      />
    )}
  </Button>
)

const ColorField = ({
  selectedSettings,
  setSelectedSettings,
  title = 'Choisissez une couleur',
  mode = 'fill',
  disabled = false,
  values,
  field,
  value = '',
  valueChanged,
  recentColors,
  addRecentColor,
  pickColor,
  isPicking
}: ShapeStyleColorType) => {
  const [customKey] = useState(uniqueId('settings_'))
  // the element is kept in a state, so that the listener is set once it is mounted
  const [customColorInput, setCustomColorInput] = useState<HTMLInputElement | null>(null)
  const isPanelVisible = selectedSettings === customKey

  // the color is chosen once the picker is closed: it sends 'input' events while it is open, and 'change' at the end
  useEffect(() => {
    if (!customColorInput) return
    const onChosen = () => addRecentColor(customColorInput.value)
    customColorInput.addEventListener('change', onChosen)
    return () => customColorInput.removeEventListener('change', onChosen)
  }, [customColorInput, addRecentColor])

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = +event.target.value
    valueChanged(field, Number.isNaN(parsedValue) ? event.target.value : parsedValue)
  }

  const handleClick = (value: string) => {
    valueChanged(field, value)
  }

  const handlePick = async () => {
    const color = await pickColor()
    if (color === undefined) return
    if (color !== 'transparent') addRecentColor(color)
    valueChanged(field, color)
  }

  const togglePanel = () => {
    setSelectedSettings(prev => {
      return prev === customKey ? undefined : customKey
    })
  }

  if (!values.length) return null

  const otherRecentColors = recentColors.filter(color => !values.includes(color))
  const renderColor = (color: string) => (
    <ColorButton key={color} color={color} mode={mode} selected={color === value} onClick={() => handleClick(color)} />
  )

  return (
    <>
      <ColorButton color={value} mode={mode} title={title} disabled={disabled} selected={isPanelVisible} onClick={togglePanel} />
      {isPanelVisible && (
        <Panel title={title} alignment='left' position='bottom'>
          <div className='react-paint-editor-colorfield-wrapper'>
            {values.map(renderColor)}
            <Button
              ref={setCustomColorInput as React.Ref<HTMLInputElement | HTMLButtonElement>}
              type='color'
              title='Custom color'
              selected={value !== '' && !values.includes(value)}
              value={value}
              onChange={handleChange}
            >
              <div
                className='react-paint-editor-colorfield-customcolor'
                style={{
                  '--react-paint-editor-colorfield-color-value': values.includes(value) ? 'var(--react-paint-editor-app-font-color)' : value
                }}
              >
                <span dangerouslySetInnerHTML={{ __html: paletteIcon }} />
              </div>
            </Button>
            <Button title='Pipette' icon={eyedropperIcon} selected={isPicking} onClick={handlePick} />
          </div>
          {otherRecentColors.length > 0 && (
            <div className='react-paint-editor-colorfield-wrapper' title='Couleurs récentes'>
              {otherRecentColors.map(renderColor)}
            </div>
          )}
        </Panel>
      )}
    </>
  )
}

export default ColorField
