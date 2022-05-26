import _ from 'lodash/fp'
import React, { useEffect, useState } from 'react'
import Button from 'components/common/Button'
import Panel from 'components/common/Panel'
import { styled } from '@linaria/react'
import { ShapeEnum, ToolsType } from 'types/Shapes'
import { getShapePicture } from 'utils/style'

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
  group: {
    tools?: ShapeEnum[]
    title: string
    img: string
  }
  vertical?: boolean
  alignment?: 'left' | 'center' | 'right'
  title?: string
  disabled?: boolean
  img?: string
  children: React.ReactNode
}

const MenuGroup = ({
  activeTool,
  alignment,
  group,
  vertical = false,
  disabled = false,
  children
}: ToolbarGroupType) => {
  const [isOpen, setIsOpen] = useState(false)

  const openPanel = () => {
    setIsOpen(true)
  }

  const isActive = _.includes(activeTool, group?.tools)
  const groupIcon = (isActive ? getShapePicture(activeTool as ShapeEnum) : group.img) ?? group.title

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

  return _.isEmpty(children) ? null : (
    <StyledRelative>
      <Button
        selected={isActive}
        title={group.title}
        disabled={disabled}
        onClick={openPanel}
        dangerouslySetInnerHTML={{ __html: groupIcon }}></Button>
      {isOpen && (
        <StyledPanel vertical={vertical} alignment={alignment}>
          {children}
        </StyledPanel>
      )}
    </StyledRelative>
  )
}

export default MenuGroup
