import type { CustomTool, ToolsType } from '@canvas/index'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import useArrowNavigation from '@editor/hooks/useArrowNavigation'
import usePopup from '@editor/hooks/usePopup'
import { useState, useTransition } from 'react'
import Tool from './Tool'
import './ToolbarGroup.css'

type ToolbarGroupType = {
  activeTool: ToolsType
  group:
    | CustomTool
    | {
        title: string
        toolsType: CustomTool[]
        vertical: boolean
      }
  disabled?: boolean
  setActiveToolFromId: (id: string) => void
}

const ToolbarGroup = ({ activeTool, group, disabled = false, setActiveToolFromId }: ToolbarGroupType) => {
  const { containerRef, isOpen, setIsOpen, close: closePanel, triggerProps, panelProps, closeAndFocus } = usePopup()
  const [, startTransition] = useTransition()
  const [lastTool, setLastTool] = useState<ToolsType | undefined>(undefined)

  const setActiveTool = (tool: ToolsType) => setActiveToolFromId(tool.id)

  const toolsRef = useArrowNavigation({ orientation: !('type' in group) && group.vertical ? 'vertical' : 'horizontal' })

  if ('type' in group) {
    return <Tool disabled={disabled} type={group} img={group.icon} isActive={activeTool.id === group.id} setActive={setActiveTool} />
  }
  if (!group.toolsType.length) return null

  if (group.toolsType?.length === 1) {
    return (
      <Tool
        disabled={disabled}
        type={group.toolsType[0]!}
        img={group.toolsType[0]!.icon}
        isActive={activeTool.id === group.toolsType[0]!.id}
        setActive={setActiveTool}
      />
    )
  }

  const isActive = group?.toolsType.find(tool => tool.type === activeTool.type) !== undefined

  // the group shows the last tool chosen in it, whether by its panel or elsewhere, like by a shortcut
  const activeToolOfGroup = group.toolsType.find(tool => tool.id === activeTool.id)
  if (activeToolOfGroup && activeToolOfGroup.id !== lastTool?.id) setLastTool(activeToolOfGroup)
  const shownTool = activeToolOfGroup ?? lastTool
  const groupIcon = shownTool ? shownTool.icon : group.toolsType?.[0]?.icon

  // the opening selects the last tool chosen in the group
  const togglePanel = () => {
    if (isOpen) {
      closePanel()
      return
    }
    if (shownTool) setActiveToolFromId(shownTool.id)
    else group.toolsType?.[0] && setActiveTool(group.toolsType[0])
    startTransition(() => {
      setIsOpen(true)
    })
  }

  // like an item of a menu, the tool chosen closes the panel, the focus going back to its button
  const chooseTool = (tool: ToolsType) => {
    setActiveTool(tool)
    closeAndFocus()
  }

  return (
    <div className='react-paint-editor-toolbargroup-relative' ref={containerRef}>
      {/* the title of the group is rendered as text, next to the icon */}
      <Button selected={isActive} title={group.title} disabled={disabled} onClick={togglePanel} icon={groupIcon} {...triggerProps}>
        {groupIcon === undefined ? group.title : undefined}
      </Button>
      {isOpen && (
        <Panel alignment='center' position='top' {...panelProps}>
          <div className='react-paint-editor-toolbargroup-panel-content' data-vertical={+group.vertical} ref={toolsRef}>
            {group.toolsType.map(toolType => (
              <Tool
                disabled={disabled}
                key={toolType.id}
                type={toolType}
                img={toolType.icon}
                isActive={activeTool.id === toolType.id}
                setActive={chooseTool}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}

export default ToolbarGroup
