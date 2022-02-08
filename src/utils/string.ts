import _ from 'lodash/fp'

const stripBrRegexp = /<br(\/?\s?)>/g
const stripDivRegexp = /<(\/)?div(\/?\s?)>/g

export const convertStringArrayToDivContent = (toConvert: string[]) => {
  return toConvert.map(val => `<div>${val === '' ? '<br/>' : val}</div>`).join('')
}

export const decodeHtmlEntities = (html: string) => {
  const textareaElement = document.createElement('textarea')
  textareaElement.innerHTML = html
  return textareaElement.value
}

export const convertDivContentToStringArray = (toConvert: string) => {
  return _.flow(
    (divContent: string) => decodeHtmlEntities(divContent),
    (divContent: string) => divContent.split('<div>'),
    _.flatMap((val: string) => {
      const newVal = val.replaceAll(stripDivRegexp, '')
      return newVal === '' ? undefined : newVal.replaceAll(stripBrRegexp, '')
    }),
    _.reject(_.isUndefined)
  )(toConvert) as string[]
}
