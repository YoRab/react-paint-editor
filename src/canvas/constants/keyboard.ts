export const KeyboardCode = {
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Delete: 'Delete',
  Backspace: 'Backspace',
  Escape: 'Escape',
  Enter: 'Enter',
  Tab: 'Tab',
  Shift: 'Shift',
  Alt: 'Alt',
  Option: 'Option',
  Space: ' ',
  Plus: '+',
  Equal: '=',
  Minus: '-',
  Zero: '0',
  BracketLeft: '[',
  BracketRight: ']'
} as const

/**
 * Physical keys (KeyboardEvent.code), for the digits and the signs: their character changes with the layout of the keyboard,
 * like Ctrl+0 which gives 'à' on an AZERTY keyboard. The letters are read from their character, the one shown on the key
 */
export const KeyboardPhysicalCode = {
  Equal: 'Equal',
  NumpadAdd: 'NumpadAdd',
  Minus: 'Minus',
  NumpadSubtract: 'NumpadSubtract',
  Digit0: 'Digit0',
  Numpad0: 'Numpad0',
  Digit1: 'Digit1',
  Digit2: 'Digit2',
  BracketLeft: 'BracketLeft',
  BracketRight: 'BracketRight'
} as const

export const KeyboardCommand = {
  Cut: 'cut',
  Copy: 'copy',
  Paste: 'paste'
} as const
