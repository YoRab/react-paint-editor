import React, { useEffect, useRef, useState, useTransition } from 'react'
import Button from '../../components/common/Button'
import Panel from '../../components/common/Panel'
import Tool from './Tool'
import type { CustomTool, ToolsType } from '../../types/tools'
import { isEventInsideNode } from '../../utils/dom'
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
  alignment?: 'left' | 'center' | 'right'
  title?: string
  disabled?: boolean
  img?: string
  setActiveToolFromId: (id: string) => void
}

const ToolbarGroup = ({
  activeTool,
  alignment,
  group,
  disabled = false,
  setActiveToolFromId
}: ToolbarGroupType) => {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [localActiveTool, setLocalActiveTool] = useState<ToolsType | undefined>(undefined)

  const setActiveTool = (tool: ToolsType) => {
    setLocalActiveTool(tool)
    setActiveToolFromId(tool.id)
  }

  useEffect(() => {
    if (!isOpen) return

    const closePanel = (event: MouseEvent | TouchEvent) => {
      const isClickInsideToolbarGroup = isEventInsideNode(event, panelRef.current)
      !isClickInsideToolbarGroup && setIsOpen(false)
    }

    document.addEventListener('mousedown', closePanel, { passive: false })
    document.addEventListener('touchstart', closePanel, { passive: false })

    return () => {
      document.removeEventListener('mousedown', closePanel)
      document.removeEventListener('touchstart', closePanel)
    }
  }, [isOpen])

  if ('type' in group) {
    return (
      <Tool
        disabled={disabled}
        type={group}
        img={group.icon}
        isActive={activeTool.id === group.id}
        setActive={setActiveTool}
      />
    )
  }
  if (!group.toolsType.length) return null

  if (group.toolsType?.length === 1) {
    return (
      <Tool
        disabled={disabled}
        type={group.toolsType[0]}
        img={group.toolsType[0].icon}
        isActive={activeTool.id === group.toolsType[0].id}
        setActive={setActiveTool}
      />
    )
  }

  const isActive = group?.toolsType.find(tool => tool.type === activeTool.type) !== undefined

  const groupIcon =
    (localActiveTool
      ? localActiveTool.icon
      : group.toolsType?.[0]?.icon) ?? group.title

  const openPanel = () => {
    if (localActiveTool) setActiveToolFromId(localActiveTool.id)
    else group.toolsType?.[0] && setActiveTool(group.toolsType[0])
    startTransition(() => {
      setIsOpen(true)
    })
  }

  return (
    <div className='react-paint-editor-toolbargroup-relative'>
      <Button
        selected={isActive}
        title={group.title}
        disabled={disabled}
        onClick={openPanel}
        icon={groupIcon}
      />
      {isOpen && (
        <Panel alignment={alignment} position="top">
          <div className='react-paint-editor-toolbargroup-panel-content' data-vertical={+group.vertical} ref={panelRef}>
            {group.toolsType.map((toolType, i) => (
              <Tool
                disabled={disabled}
                key={i}
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
