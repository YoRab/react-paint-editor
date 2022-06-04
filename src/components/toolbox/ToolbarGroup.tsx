import _ from 'lodash/fp'
import React, { useEffect, useState } from 'react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { styled } from '@linaria/react'
import { ShapeEnum, ToolsType } from 'types/Shapes'
import { getShapePicture } from 'utils/style'
import Tool from './Tool'

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
    | ShapeEnum
    | {
        vertical: boolean
        tools?: ShapeEnum[]
        title: string
        img: string
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

  if (!_.isObject(group)) {
    return (
      <Tool
        disabled={disabled}
        type={group}
        lib={group}
        img={getShapePicture(group)}
        isActive={activeTool === group}
        setActive={setActiveTool}
      />
    )
  }
  if (_.isEmpty(group.tools)) return null

  if (group.tools?.length === 1) {
    return (
      <Tool
        disabled={disabled}
        type={group.tools[0]}
        lib={group.tools[0]}
        img={getShapePicture(group.tools[0])}
        isActive={activeTool === group.tools[0]}
        setActive={setActiveTool}
      />
    )
  }

  const isActive = _.includes(activeTool, group?.tools)
  const groupIcon =
    (localActiveTool ? getShapePicture(localActiveTool as ShapeEnum) : group.img) ?? group.title

  const openPanel = () => {
    if (localActiveTool) setActiveToolFromProps(localActiveTool)
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
          {_.map(
            toolType => (
              <Tool
                disabled={disabled}
                key={toolType}
                type={toolType}
                lib={toolType}
                img={getShapePicture(toolType)}
                isActive={activeTool === toolType}
                setActive={setActiveTool}
              />
            ),
            group.tools
          )}
        </StyledPanel>
      )}
    </StyledRelative>
  )
}

export default ToolbarGroup
