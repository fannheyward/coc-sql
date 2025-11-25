import { workspace } from 'coc.nvim';

const supportedDatabases = [
  'athena',
  'bigquery',
  'db2',
  'flinksql',
  'hive',
  'mysql',
  'mariadb',
  'postgresql',
  'redshift',
  'snowflake',
  'sqlite',
  'transactsql'
];

// gets database from coc config or else, tries to guess value from DATABASE_URL env variable
export function getDatabase(): string {
  let database = workspace.getConfiguration('sql', 'mysql').get('database') as string;
  if (database === 'guess' && process.env.DATABASE_URL) {
    database = process.env.DATABASE_URL.toLowerCase().split(':')[0];
    if (database === 'postgres') {
      database = 'postgresql';
    }
    if (supportedDatabases.includes(database)) {
      return database;
    }
  }

  return database;
}
