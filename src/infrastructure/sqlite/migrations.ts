import type { SQLiteDatabase } from 'expo-sqlite';

export async function runSqliteMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS local_organizaciones (
      id TEXT PRIMARY KEY NOT NULL,
      numero_lista INTEGER NOT NULL,
      sigla TEXT NOT NULL,
      nombre TEXT NOT NULL,
      color_hex TEXT NOT NULL,
      es_cliente INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS local_candidatos (
      id TEXT PRIMARY KEY NOT NULL,
      organizacion_id TEXT NOT NULL,
      dignidad TEXT NOT NULL,
      nombre_completo TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_mesas (
      id TEXT PRIMARY KEY NOT NULL,
      veedor_id TEXT NOT NULL,
      recinto_id TEXT NOT NULL,
      recinto_nombre TEXT NOT NULL,
      recinto_latitud REAL NOT NULL,
      recinto_longitud REAL NOT NULL,
      numero_jrv INTEGER NOT NULL,
      genero TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_actas (
      local_id TEXT PRIMARY KEY NOT NULL,
      server_id TEXT,
      client_uuid TEXT NOT NULL UNIQUE,
      mesa_id TEXT NOT NULL,
      dignidad TEXT NOT NULL,
      total_sufragantes INTEGER NOT NULL,
      votos_blancos INTEGER NOT NULL,
      votos_nulos INTEGER NOT NULL,
      local_photo_uri TEXT,
      remote_photo_path TEXT,
      latitud REAL NOT NULL,
      longitud REAL NOT NULL,
      precision_gps REAL NOT NULL,
      distancia_recinto_m REAL NOT NULL,
      alerta_ubicacion INTEGER NOT NULL DEFAULT 0,
      version INTEGER NOT NULL DEFAULT 0,
      sync_status TEXT NOT NULL DEFAULT 'GUARDADO',
      error_message TEXT,
      registrado_por TEXT,
      modificado_por TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE (mesa_id, dignidad)
    );

    CREATE TABLE IF NOT EXISTS local_votos (
      acta_local_id TEXT NOT NULL,
      organizacion_id TEXT NOT NULL,
      cantidad INTEGER NOT NULL,
      PRIMARY KEY (acta_local_id, organizacion_id),
      FOREIGN KEY (acta_local_id) REFERENCES local_actas(local_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY NOT NULL,
      operation_uuid TEXT NOT NULL UNIQUE,
      acta_local_id TEXT NOT NULL,
      mesa_id TEXT NOT NULL,
      dignidad TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'GUARDADO',
      attempts INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (acta_local_id) REFERENCES local_actas(local_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_outbox_status_created
      ON sync_outbox(status, created_at);
  `);
}