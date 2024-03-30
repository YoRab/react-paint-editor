import { compact } from '@common/utils/array'

const stripAllTagsRegexp = /(<([^>]+)>)/gi
const stripDivRegexp = /<(\/)?div(\/?\s?)>/gi

export const convertStringArrayToDivContent = (toConvert: string[]) => {
	return toConvert.map(val => `<div>${val === '' ? '<br/>' : val}</div>`).join('')
}

const decodeHtmlEntities = (html: string) => {
	const textareaElement = document.createElement('textarea')
	textareaElement.innerHTML = html
	return textareaElement.value
}

export const convertDivContentToStringArray = (toConvert: string) => {
	const decodedLines = decodeHtmlEntities(toConvert).split('<div>')
	const linesWithNodeDiv = decodedLines.flatMap(val => {
		const newVal = val.replaceAll(stripDivRegexp, '')
		return newVal === '' ? undefined : newVal.replaceAll(stripAllTagsRegexp, '')
	})
	const compactedLines = compact(linesWithNodeDiv)
	return compactedLines
}
