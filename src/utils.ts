import { workspace } from 'coc.nvim';
import fs from 'fs';
import { inspect } from 'util';

// util to debug values when developing
// tail -f /tmp/coc-sql-debug
export const log = (something: any) => {
  fs.writeFileSync('/tmp/coc-sql-debug', inspect(something, { depth: null }) + '\n', { flag: 'a' });
};

const defaultDatabase = 'mysql';

const supportedDatabases = ['db2', 'bigquery', 'hive', 'mysql', 'mariadb', 'postgresql', 'transactsql'];

// Guess database from environment variable DATABASE_URL
function guessDatabase(): string {
  if (process.env.DATABASE_URL) {
    let dbType = process.env.DATABASE_URL.toLowerCase().split(':')[0];
    if (dbType === 'postgres') {
      dbType = 'postgresql';
    }
    if (supportedDatabases.includes(dbType)) {
      return dbType;
    }
  }
  return defaultDatabase;
}

// gets database from coc config or else, tries to guess value from DATABASE_URL env variable
export function getDatabase(): string {
  let database = workspace.getConfiguration('sql').get('database') as string;
  if (database === 'guess') {
    database = guessDatabase();
  }
  return database;
}
