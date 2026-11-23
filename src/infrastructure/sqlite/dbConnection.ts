import * as SQLite from 'expo-sqlite';
import { runSqliteMigrations } from './migrations';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getSqliteDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('control_electoral_acp.db');
      await runSqliteMigrations(db);
      return db;
    })();
  }
  return dbPromise;
}