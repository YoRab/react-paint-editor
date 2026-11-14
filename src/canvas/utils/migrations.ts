import { ReactPaintError } from '@canvas/utils/error'

/** Loaded data, of any version of the format: the fields of an older version are not typed */
type LoadedData = Record<string, unknown>

/** Converts data of a version of the format to the next one */
export type DataMigration = (data: LoadedData) => LoadedData

/**
 * The migrations of the format of the data, by the version they start from: the one at index n converts data of version n
 * to version n + 1
 */
export const DATA_MIGRATIONS: readonly DataMigration[] = [
  // the data of 0.x and of the betas, which have no version: the fields removed then, like lineArrow, are not converted
  data => data
]

/**
 * Version of the format of the exported data (getCurrentData, dataChanged, exportData), given in their version field: the
 * number of migrations, so that a new migration gives a new version. loadData converts the data of an older version to
 * it, and refuses the data of a newer one
 */
export const DATA_VERSION = DATA_MIGRATIONS.length

/**
 * Converts loaded data to the last version of the format, DATA_VERSION by default, one version after the other. Data
 * without version are of version 0, and data of a newer version, which cannot be read, throw dataVersionUnsupported
 */
export const migrateData = (data: LoadedData, migrations: readonly DataMigration[] = DATA_MIGRATIONS): LoadedData => {
  const version = typeof data.version === 'number' ? data.version : 0
  const max = migrations.length
  if (version > max) {
    throw new ReactPaintError('dataVersionUnsupported', `The data are of version ${version}, newer than ${max}, the last one this release reads`, {
      version,
      max
    })
  }
  const migrated = migrations.slice(version).reduce((current, migrate) => migrate(current), data)
  return { ...migrated, version: max }
}
