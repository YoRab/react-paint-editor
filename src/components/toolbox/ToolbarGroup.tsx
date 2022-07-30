import _ from 'lodash/fp'
import React, { useEffect, useState, useTransition } from 'react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { styled } from '@linaria/react'
import Tool from './Tool'
import { CustomTool, ToolsType } from 'types/tools'

const StyledPanelContent = styled.div`
  display: flex;

  &[data-vertical='1'] {
    flex-direction: column;
  }
`

const StyledRelative = styled.div`
  position: relative;
  display: inline-block;
`

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
  const [isOpen, setIsOpen] = useState(false)
  const [, startTransition] = useTransition()
  const [localActiveTool, setLocalActiveTool] = useState<ToolsType | undefined>(undefined)

  const setActiveTool = (tool: ToolsType) => {
    setLocalActiveTool(tool)
    setActiveToolFromId(tool.id)
  }

  useEffect(() => {
    if (!isOpen) return

    const closePanel = () => {
      setIsOpen(false)
    }

    document.addEventListener('click', closePanel)

    return () => {
      document.removeEventListener('click', closePanel)
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
  if (_.isEmpty(group.toolsType)) return null

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

  const isActive = _.find({ type: activeTool.type }, group?.toolsType) !== undefined

  const groupIcon =
    (localActiveTool
      ? localActiveTool.icon
      : group.toolsType && group.toolsType[0] && group.toolsType[0].icon) ?? group.title

  const openPanel = () => {
    if (localActiveTool) setActiveToolFromId(localActiveTool.id)
    else group.toolsType && group.toolsType[0] && setActiveTool(group.toolsType[0])
    startTransition(() => {
      setIsOpen(true)
    })
  }

  return (
    <StyledRelative>
      <Button
        selected={isActive}
        title={group.title}
        disabled={disabled}
        onClick={openPanel}
        icon={groupIcon}
      />
      {isOpen && (
        <Panel alignment={alignment} position="top">
          <StyledPanelContent data-vertical={+group.vertical}>
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
          </StyledPanelContent>
        </Panel>
      )}
    </StyledRelative>
  )
}

export default ToolbarGroup
