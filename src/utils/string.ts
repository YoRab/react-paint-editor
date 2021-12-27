import _ from 'lodash/fp'

const divContentRegexp = /<div>(.*?)<\/div>/g
const stripBrRegexp = /<br(\/?\s?)>/g
const stripDivRegexp = /<div(\/?\s?)>/g

export const convertStringArrayToDivContent = (toConvert: string[]) => {
  return toConvert.map(val => `<div>${val === '' ? '<br/>' : val}</div>`).join('')
}

export const convertDivContentToStringArray = (toConvert: string) => {
  console.log(`<div>${toConvert}</div>`)
  return _.flow(
    (divContent: string) => `<div>${divContent}</div>`.replaceAll(stripBrRegexp, ''),
    (divContent: string) => divContent.matchAll(divContentRegexp),
    Array.from,
    _.map((val: string[]) => _.get(1, val).replaceAll(stripDivRegexp, ''))
  )(toConvert) as string[]
}
