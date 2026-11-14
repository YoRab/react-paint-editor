import { ReactPaintError } from '@canvas/utils/error'
import { type DataMigration, migrateData } from '@canvas/utils/migrations'
import { describe, expect, it } from 'vitest'

// a format whose version 1 renames size to width, and whose version 2 counts the width in halves
const MIGRATIONS: DataMigration[] = [({ size, ...data }) => ({ ...data, width: size }), data => ({ ...data, width: (data.width as number) * 2 })]

describe('migrateData', () => {
  it('applies the migrations from the version of the data, one after the other', () => {
    expect(migrateData({ version: 0, size: 10 }, MIGRATIONS)).toEqual({ version: 2, width: 20 })
    expect(migrateData({ version: 1, width: 10 }, MIGRATIONS)).toEqual({ version: 2, width: 20 })
    expect(migrateData({ version: 2, width: 10 }, MIGRATIONS)).toEqual({ version: 2, width: 10 })
  })

  it('takes data without version as data of version 0', () => {
    expect(migrateData({ size: 10 }, MIGRATIONS)).toEqual({ version: 2, width: 20 })
  })

  it('refuses data of a newer version, which it cannot read, with dataVersionUnsupported', () => {
    const migrate = () => migrateData({ version: 3, width: 10 }, MIGRATIONS)
    expect(migrate).toThrow(ReactPaintError)
    expect(migrate).toThrow(expect.objectContaining({ code: 'dataVersionUnsupported', details: { version: 3, max: 2 } }))
  })
})
