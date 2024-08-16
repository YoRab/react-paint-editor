import { describe, it, expect } from 'vitest'
import { uniqueId } from '@common/utils/util'

describe('uniqueId', () => {
  it('should generate unique IDs with a given prefix', () => {
    const id1 = uniqueId('test_')
    const id2 = uniqueId('test_')
    const id3 = uniqueId('test_')

    expect(id1).toBe('test_1')
    expect(id2).toBe('test_2')
    expect(id3).toBe('test_3')
  })

  it('should generate unique IDs without a prefix', () => {
    const id1 = uniqueId()
    const id2 = uniqueId()
    const id3 = uniqueId()

    expect(id1).toBe('1')
    expect(id2).toBe('2')
    expect(id3).toBe('3')
  })

  it('should reset and increment IDs independently for different prefixes', () => {
    const id1 = uniqueId('prefix1_')
    const id2 = uniqueId('prefix2_')
    const id3 = uniqueId('prefix1_')
    const id4 = uniqueId('prefix2_')

    expect(id1).toBe('prefix1_1')
    expect(id2).toBe('prefix2_1')
    expect(id3).toBe('prefix1_2')
    expect(id4).toBe('prefix2_2')
  })

  it('should generate unique IDs even with an empty string as a prefix', () => {
    const id1 = uniqueId('')
    const id2 = uniqueId('')
    const id3 = uniqueId('')

    expect(id1).toBe('4')
    expect(id2).toBe('5')
    expect(id3).toBe('6')
  })

  it('should maintain a global counter for the same prefix', () => {
    const id1 = uniqueId('global_')
    const id2 = uniqueId('global_')

    expect(id1).toBe('global_1')
    expect(id2).toBe('global_2')

    // Simulating external reset of the global counter
    const id3 = uniqueId('global_')
    expect(id3).toBe('global_3')
  })
})
