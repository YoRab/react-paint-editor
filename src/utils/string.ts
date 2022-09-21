import _ from 'lodash/fp'

const stripAllTagsRegexp = /(<([^>]+)>)/gi
const stripDivRegexp = /<(\/)?div(\/?\s?)>/gi

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
      return newVal === '' ? undefined : newVal.replaceAll(stripAllTagsRegexp, '')
    }),
    _.reject(_.isUndefined)
  )(toConvert) as string[]
}
