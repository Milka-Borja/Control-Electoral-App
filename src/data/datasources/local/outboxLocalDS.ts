import { EstadoSyncActa, SyncItem } from '../../../domain/entities';
import { getSqliteDb } from '../../../infrastructure/sqlite/dbConnection';
import { mapOutboxRow, OutboxRow } from '../../mappers/mappers';

export class OutboxLocalDS {
  async getAllQueueItems(): Promise<SyncItem[]> {
    const db = await getSqliteDb();
    const rows = await db.getAllAsync<OutboxRow>(
      `SELECT o.*, m.numero_jrv
       FROM sync_outbox o
       LEFT JOIN local_mesas m ON m.id = o.mesa_id
       ORDER BY o.created_at ASC`
    );
    return rows.map(mapOutboxRow);
  }

  async getPendingCount(): Promise<number> {
    const db = await getSqliteDb();
    const row = await db.getFirstAsync<{ total: number }>(
      `SELECT COUNT(*) as total FROM sync_outbox WHERE status IN ('GUARDADO', 'EN_PROCESO', 'FALLADO')`
    );
    return Number(row?.total ?? 0);
  }

  async markStatus(
    outboxId: string,
    status: EstadoSyncActa,
    errorMessage: string | null = null,
    incrementAttempt = false
  ): Promise<void> {
    const db = await getSqliteDb();
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE sync_outbox SET
        status = ?,
        attempts = attempts + ?,
        last_error = ?,
        updated_at = ?
       WHERE id = ?`,
      [status, incrementAttempt ? 1 : 0, errorMessage, now, outboxId]
    );
  }

  async removeItem(outboxId: string): Promise<void> {
    const db = await getSqliteDb();
    await db.runAsync('DELETE FROM sync_outbox WHERE id = ?', [outboxId]);
  }

  async resetFailedToPending(): Promise<void> {
    const db = await getSqliteDb();
    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE sync_outbox SET status = 'GUARDADO', last_error = NULL, updated_at = ?
         WHERE status = 'FALLADO'`,
        [now]
      );
      await db.runAsync(
        `UPDATE local_actas SET sync_status = 'GUARDADO', error_message = NULL, updated_at = ?
         WHERE sync_status = 'FALLADO'`,
        [now]
      );
    });
  }
}