import {
  SnackbarTypeEnum,
  SNACKBAR_ANIMATION_DUURATION as SNACKBAR_ANIMATION_DURATION
} from 'constants/snackbar'
import { SnackBarType } from 'hooks/useSnackbar'
import React, { useEffect, useState } from 'react'
import styled from 'styled-components'

const getSnackbarTheme = (type: SnackbarTypeEnum) => {
  switch (type) {
    case SnackbarTypeEnum.Infos:
    default:
      return `
      background: #646464;
      color:white;`
    case SnackbarTypeEnum.Warning:
      return ` background: #c3a200;
      color:black;`
    case SnackbarTypeEnum.Error:
      return ` background: #911717;
      color:white;`
    case SnackbarTypeEnum.Success:
      return ` background: #088900;
      color:white;`
  }
}

const StyledSnackbar = styled.div<{
  type: SnackbarTypeEnum
  isshown: boolean
}>`
  display: inline-block;

  padding: 12px 48px;
  margin: 8px;
  max-width: calc(100% - 24px);
  overflow-wrap: break-word;
  box-sizing: border-box;
  transition: all ${SNACKBAR_ANIMATION_DURATION}ms;
  opacity: 0;
  transform: translate3d(0px, 40px, 0px);

  ${({ type }) => getSnackbarTheme(type)}
  ${({ isshown }) =>
    isshown
      ? `
          opacity: 1;
          transform: translate3d(0px, 0px, 0px);
        `
      : `
          opacity: 0;
          transform: translate3d(0px, 40px, 0px);
        `};
`

const StyledSnackbarContainer = styled.div`
  display: flex;
  flex-direction: column-reverse;
  position: absolute;
  z-index: 3;
  bottom: 0;
  left: 0;
  right: 0;
  height: 0px;
  align-items: center;
`

type SnackbarContainerType = {
  snackbarList: SnackBarType[]
}

const Snackbar = ({ type, text, duration }: SnackBarType) => {
  const [isShown, setIsShown] = useState(false)
  useEffect(() => {
    const timeoutShowId = setTimeout(() => {
      setIsShown(true)
    }, 100)
    const timeoutHideId = setTimeout(() => {
      setIsShown(false)
    }, duration - SNACKBAR_ANIMATION_DURATION - 100)
    return () => {
      clearTimeout(timeoutShowId)
      clearTimeout(timeoutHideId)
    }
  }, [duration])

  return (
    <StyledSnackbar isshown={isShown} type={type}>
      {text}
    </StyledSnackbar>
  )
}

const SnackbarContainer = ({ snackbarList }: SnackbarContainerType) => {
  return (
    <StyledSnackbarContainer>
      {snackbarList.map(snackbar => (
        <Snackbar key={snackbar.id} {...snackbar} />
      ))}
    </StyledSnackbarContainer>
  )
}

export default SnackbarContainer
