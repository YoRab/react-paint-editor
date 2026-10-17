import type { CustomTool, ToolsType } from '@canvas/index'
import Button from '@editor/components/common/Button'
import Panel from '@editor/components/common/Panel'
import usePressOutside from '@editor/hooks/usePressOutside'
import { useCallback, useRef, useState, useTransition } from 'react'
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
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [localActiveTool, setLocalActiveTool] = useState<ToolsType | undefined>(undefined)

  const setActiveTool = (tool: ToolsType) => {
    setLocalActiveTool(tool)
    setActiveToolFromId(tool.id)
  }

  const closePanel = useCallback(() => setIsOpen(false), [])
  usePressOutside(panelRef, closePanel, isOpen)

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

  const groupIcon = (localActiveTool ? localActiveTool.icon : group.toolsType?.[0]?.icon) ?? group.title

  const openPanel = () => {
    if (localActiveTool) setActiveToolFromId(localActiveTool.id)
    else group.toolsType?.[0] && setActiveTool(group.toolsType[0])
    startTransition(() => {
      setIsOpen(true)
    })
  }

  return (
    <div className='react-paint-editor-toolbargroup-relative'>
      <Button selected={isActive} title={group.title} disabled={disabled} onClick={openPanel} icon={groupIcon} />
      {isOpen && (
        <Panel alignment='center' position='top'>
          <div className='react-paint-editor-toolbargroup-panel-content' data-vertical={+group.vertical} ref={panelRef}>
            {group.toolsType.map(toolType => (
              <Tool
                disabled={disabled}
                key={toolType.id}
                type={toolType}
                img={toolType.icon}
                isActive={activeTool.id === toolType.id}
                setActive={setActiveTool}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}

export default ToolbarGroup
