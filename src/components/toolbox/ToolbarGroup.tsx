import _ from 'lodash/fp'
import React, { useEffect, useState } from 'react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { styled } from '@linaria/react'
import { ShapeEnum, ToolsType } from 'types/Shapes'
import { getShapePicture } from 'utils/style'
import Tool from './Tool'
import { CustomTool } from 'types/tools'

const StyledPanel = styled(Panel)`
  display: flex;
  bottom: unset;
  top: 100%;

  &[data-vertical='1'] {
    flex-direction: column;
  }
`

const StyledRelative = styled.div`
  position: relative;
  display: inline-block;
`

type ToolbarGroupType = {
  activeTool: React.SetStateAction<ToolsType>
  group:
    | CustomTool<ShapeEnum>
    | {
        title: string
        toolsType: CustomTool<ShapeEnum>[]
        vertical: boolean
      }
  alignment?: 'left' | 'center' | 'right'
  title?: string
  disabled?: boolean
  img?: string
  setActiveTool: (tool: ToolsType) => void
}

const ToolbarGroup = ({
  activeTool,
  alignment,
  group,
  disabled = false,
  setActiveTool: setActiveToolFromProps
}: ToolbarGroupType) => {
  const [isOpen, setIsOpen] = useState(false)
  const [localActiveTool, setLocalActiveTool] = useState<ToolsType | undefined>(undefined)

  const setActiveTool = (tool: ToolsType) => {
    setLocalActiveTool(tool)
    setActiveToolFromProps(tool)
  }

  useEffect(() => {
    if (!isOpen) return

    const closePanel = () => {
      setIsOpen(false)
    }
    const timeoutId = setTimeout(() => {
      //TODO find a better fix than settimeout for react18
      document.addEventListener('click', closePanel)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', closePanel)
    }
  }, [isOpen])

  if ('type' in group) {
    return (
      <Tool
        disabled={disabled}
        type={group.type}
        lib={group.lib ?? group.type}
        img={getShapePicture(group.type)}
        isActive={activeTool === group.type}
        setActive={setActiveTool}
      />
    )
  }
  if (_.isEmpty(group.toolsType)) return null

  if (group.toolsType?.length === 1) {
    return (
      <Tool
        disabled={disabled}
        type={group.toolsType[0].type}
        lib={group.toolsType[0].lib ?? group.toolsType[0].type}
        img={getShapePicture(group.toolsType[0].type)}
        isActive={activeTool === group.toolsType[0].type}
        setActive={setActiveTool}
      />
    )
  }

  const isActive = _.find({ type: activeTool }, group?.toolsType) !== undefined

  const groupIcon =
    (localActiveTool
      ? getShapePicture(localActiveTool as ShapeEnum)
      : group.toolsType && group.toolsType[0] && getShapePicture(group.toolsType[0].type)) ??
    group.title

  const openPanel = () => {
    if (localActiveTool) setActiveToolFromProps(localActiveTool)
    else group.toolsType && group.toolsType[0] && setActiveTool(group.toolsType[0].type)
    setIsOpen(true)
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
        <StyledPanel vertical={group.vertical} alignment={alignment}>
          {group.toolsType.map((toolType, i) => (
            <Tool
              disabled={disabled}
              key={i}
              type={toolType.type}
              lib={toolType.lib ?? toolType.type}
              img={getShapePicture(toolType.type)}
              isActive={activeTool === toolType.type}
              setActive={setActiveTool}
            />
          ))}
        </StyledPanel>
      )}
    </StyledRelative>
  )
}

export default ToolbarGroup
