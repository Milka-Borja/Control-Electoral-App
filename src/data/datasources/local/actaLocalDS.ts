import { Acta, DignidadElectoral, EstadoSyncActa, Voto } from '../../../domain/entities';
import { getSqliteDb } from '../../../infrastructure/sqlite/dbConnection';
import { generateUuidV4 } from '../../../shared/uuid';
import { LocalActaRow, mapLocalActaRow } from '../../mappers/mappers';

interface LocalVotoRow {
  organizacion_id: string;
  cantidad: number;
}

export class ActaLocalDS {
  async saveActaAndEnqueue(acta: Acta): Promise<Acta> {
    const db = await getSqliteDb();
    const now = new Date().toISOString();
    let localId = acta.localId ?? generateUuidV4();

    await db.withTransactionAsync(async () => {
      const existing = await db.getFirstAsync<LocalActaRow>(
        'SELECT * FROM local_actas WHERE mesa_id = ? AND dignidad = ?',
        [acta.mesaId, acta.dignidad]
      );

      if (existing) {
        localId = existing.local_id;
        await db.runAsync(
          `UPDATE local_actas SET
            client_uuid = ?,
            total_sufragantes = ?,
            votos_blancos = ?,
            votos_nulos = ?,
            local_photo_uri = ?,
            remote_photo_path = CASE WHEN ? IS NOT NULL AND ? <> COALESCE(local_photo_uri, '') THEN NULL ELSE remote_photo_path END,
            latitud = ?,
            longitud = ?,
            precision_gps = ?,
            distancia_recinto_m = ?,
            alerta_ubicacion = ?,
            version = ?,
            sync_status = 'GUARDADO',
            error_message = NULL,
            modificado_por = ?,
            updated_at = ?
           WHERE local_id = ?`,
          [
            acta.clientUuid,
            acta.totalSufragantes,
            acta.votosBlancos,
            acta.votosNulos,
            acta.localPhotoUri ?? existing.local_photo_uri,
            acta.localPhotoUri ?? null,
            acta.localPhotoUri ?? null,
            acta.latitud,
            acta.longitud,
            acta.precisionGps,
            acta.distanciaRecintoM,
            acta.alertaUbicacion ? 1 : 0,
            acta.version,
            acta.modificadoPor ?? existing.modificado_por,
            now,
            localId,
          ]
        );
      } else {
        await db.runAsync(
          `INSERT INTO local_actas (
            local_id, server_id, client_uuid, mesa_id, dignidad,
            total_sufragantes, votos_blancos, votos_nulos,
            local_photo_uri, remote_photo_path,
            latitud, longitud, precision_gps, distancia_recinto_m, alerta_ubicacion,
            version, sync_status, error_message, registrado_por, modificado_por, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GUARDADO', NULL, ?, ?, ?)`,
          [
            localId,
            acta.id ?? null,
            acta.clientUuid,
            acta.mesaId,
            acta.dignidad,
            acta.totalSufragantes,
            acta.votosBlancos,
            acta.votosNulos,
            acta.localPhotoUri ?? null,
            acta.fotoPath ?? null,
            acta.latitud,
            acta.longitud,
            acta.precisionGps,
            acta.distanciaRecintoM,
            acta.alertaUbicacion ? 1 : 0,
            acta.version,
            acta.registradoPor ?? null,
            acta.modificadoPor ?? null,
            now,
          ]
        );
      }

      // Reemplazar desglose de votos dentro de la misma transacción
      await db.runAsync('DELETE FROM local_votos WHERE acta_local_id = ?', [localId]);
      for (const voto of acta.votos) {
        await db.runAsync(
          'INSERT INTO local_votos (acta_local_id, organizacion_id, cantidad) VALUES (?, ?, ?)',
          [localId, voto.organizacionId, voto.cantidad]
        );
      }

      // Limpiar entradas previas pendientes de esta misma acta y encolar la nueva operación idempotente
      await db.runAsync('DELETE FROM sync_outbox WHERE acta_local_id = ?', [localId]);
      await db.runAsync(
        `INSERT INTO sync_outbox (
          id, operation_uuid, acta_local_id, mesa_id, dignidad,
          status, attempts, last_error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'GUARDADO', 0, NULL, ?, ?)`,
        [
          generateUuidV4(),
          acta.clientUuid,
          localId,
          acta.mesaId,
          acta.dignidad,
          now,
          now,
        ]
      );
    });

    const saved = await this.getByLocalId(localId);
    if (!saved) throw new Error('Error al leer el acta guardada localmente');
    return saved;
  }

  async cacheRemoteActa(acta: Acta): Promise<void> {
    const db = await getSqliteDb();
    const existing = await db.getFirstAsync<LocalActaRow>(
      'SELECT * FROM local_actas WHERE mesa_id = ? AND dignidad = ?',
      [acta.mesaId, acta.dignidad]
    );

    // No sobrescribir cambios locales pendientes de sincronizar
    if (existing && existing.sync_status !== 'ENVIADO') return;

    const localId = existing?.local_id ?? generateUuidV4();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT OR REPLACE INTO local_actas (
          local_id, server_id, client_uuid, mesa_id, dignidad,
          total_sufragantes, votos_blancos, votos_nulos,
          local_photo_uri, remote_photo_path,
          latitud, longitud, precision_gps, distancia_recinto_m, alerta_ubicacion,
          version, sync_status, error_message, registrado_por, modificado_por, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ENVIADO', NULL, ?, ?, ?)`,
        [
          localId,
          acta.id ?? null,
          acta.clientUuid,
          acta.mesaId,
          acta.dignidad,
          acta.totalSufragantes,
          acta.votosBlancos,
          acta.votosNulos,
          existing?.local_photo_uri ?? null,
          acta.fotoPath ?? null,
          acta.latitud,
          acta.longitud,
          acta.precisionGps,
          acta.distanciaRecintoM,
          acta.alertaUbicacion ? 1 : 0,
          acta.version,
          acta.registradoPor ?? null,
          acta.modificadoPor ?? null,
          acta.updatedAt,
        ]
      );

      await db.runAsync('DELETE FROM local_votos WHERE acta_local_id = ?', [localId]);
      for (const v of acta.votos) {
        await db.runAsync(
          'INSERT INTO local_votos (acta_local_id, organizacion_id, cantidad) VALUES (?, ?, ?)',
          [localId, v.organizacionId, v.cantidad]
        );
      }
    });
  }

  async getByLocalId(localId: string): Promise<Acta | null> {
    const db = await getSqliteDb();
    const row = await db.getFirstAsync<LocalActaRow>(
      'SELECT * FROM local_actas WHERE local_id = ?',
      [localId]
    );
    if (!row) return null;

    const votoRows = await db.getAllAsync<LocalVotoRow>(
      'SELECT organizacion_id, cantidad FROM local_votos WHERE acta_local_id = ?',
      [localId]
    );
    const votos: Voto[] = votoRows.map((v) => ({
      organizacionId: v.organizacion_id,
      cantidad: Number(v.cantidad),
    }));

    return mapLocalActaRow(row, votos);
  }

  async getByMesaYDignidad(
    mesaId: string,
    dignidad: DignidadElectoral
  ): Promise<Acta | null> {
    const db = await getSqliteDb();
    const row = await db.getFirstAsync<LocalActaRow>(
      'SELECT * FROM local_actas WHERE mesa_id = ? AND dignidad = ?',
      [mesaId, dignidad]
    );
    if (!row) return null;
    return this.getByLocalId(row.local_id);
  }

  async getStatusesByMesaIds(
    mesaIds: string[]
  ): Promise<Map<string, { ALCALDIA?: EstadoSyncActa; PREFECTURA?: EstadoSyncActa }>> {
    const result = new Map<string, { ALCALDIA?: EstadoSyncActa; PREFECTURA?: EstadoSyncActa }>();
    if (mesaIds.length === 0) return result;

    const db = await getSqliteDb();
    const placeholders = mesaIds.map(() => '?').join(',');
    const rows = await db.getAllAsync<{
      mesa_id: string;
      dignidad: DignidadElectoral;
      sync_status: EstadoSyncActa;
    }>(
      `SELECT mesa_id, dignidad, sync_status FROM local_actas WHERE mesa_id IN (${placeholders})`,
      mesaIds
    );

    for (const row of rows) {
      const current = result.get(row.mesa_id) ?? {};
      current[row.dignidad] = row.sync_status;
      result.set(row.mesa_id, current);
    }
    return result;
  }

  async updateSyncState(
    localId: string,
    params: {
      status: EstadoSyncActa;
      serverId?: string;
      version?: number;
      remotePhotoPath?: string;
      errorMessage?: string | null;
    }
  ): Promise<void> {
    const db = await getSqliteDb();
    const now = new Date().toISOString();

    await db.runAsync(
      `UPDATE local_actas SET
        sync_status = ?,
        server_id = COALESCE(?, server_id),
        version = COALESCE(?, version),
        remote_photo_path = COALESCE(?, remote_photo_path),
        error_message = ?,
        updated_at = ?
       WHERE local_id = ?`,
      [
        params.status,
        params.serverId ?? null,
        params.version ?? null,
        params.remotePhotoPath ?? null,
        params.errorMessage ?? null,
        now,
        localId,
      ]
    );
  }
}