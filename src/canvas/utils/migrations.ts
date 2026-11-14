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
 * number of migrations, so that a new migration gives a new version. loadData converts the data of an older version to it
 */
export const DATA_VERSION = DATA_MIGRATIONS.length

/**
 * Converts loaded data to the last version of the format, DATA_VERSION by default, one version after the other. Data
 * without version are of version 0
 */
export const migrateData = (data: LoadedData, migrations: readonly DataMigration[] = DATA_MIGRATIONS): LoadedData => {
  const version = typeof data.version === 'number' ? data.version : 0
  const migrated = migrations.slice(version).reduce((current, migrate) => migrate(current), data)
  return { ...migrated, version: migrations.length }
}
