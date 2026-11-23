import { Candidato, Mesa, Organizacion } from '../../../domain/entities';
import { getSqliteDb } from '../../../infrastructure/sqlite/dbConnection';
import {
  CandidatoRow,
  LocalMesaRow,
  mapCandidatoRow,
  mapLocalMesaRow,
  mapOrganizacionRow,
  OrganizacionRow,
} from '../../mappers/mappers';

export class CatalogLocalDS {
  async saveOrganizacionesYCandidatos(
    organizaciones: Organizacion[],
    candidatos: Candidato[]
  ): Promise<void> {
    const db = await getSqliteDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM local_candidatos');
      await db.runAsync('DELETE FROM local_organizaciones');

      for (const org of organizaciones) {
        await db.runAsync(
          `INSERT OR REPLACE INTO local_organizaciones
            (id, numero_lista, sigla, nombre, color_hex, es_cliente)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [org.id, org.numeroLista, org.sigla, org.nombre, org.colorHex, org.esCliente ? 1 : 0]
        );
      }

      for (const cand of candidatos) {
        await db.runAsync(
          `INSERT OR REPLACE INTO local_candidatos
            (id, organizacion_id, dignidad, nombre_completo)
           VALUES (?, ?, ?, ?)`,
          [cand.id, cand.organizacionId, cand.dignidad, cand.nombreCompleto]
        );
      }
    });
  }

  async getOrganizacionesYCandidatos(): Promise<{
    organizaciones: Organizacion[];
    candidatos: Candidato[];
  }> {
    const db = await getSqliteDb();
    const orgRows = await db.getAllAsync<OrganizacionRow>(
      'SELECT * FROM local_organizaciones ORDER BY numero_lista ASC'
    );
    const candRows = await db.getAllAsync<CandidatoRow>(
      'SELECT * FROM local_candidatos'
    );

    return {
      organizaciones: orgRows.map(mapOrganizacionRow),
      candidatos: candRows.map(mapCandidatoRow),
    };
  }

  async saveMesasVeedor(veedorId: string, mesas: Mesa[]): Promise<void> {
    const db = await getSqliteDb();
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      await db.runAsync('DELETE FROM local_mesas WHERE veedor_id = ?', [veedorId]);

      for (const mesa of mesas) {
        await db.runAsync(
          `INSERT OR REPLACE INTO local_mesas
            (id, veedor_id, recinto_id, recinto_nombre, recinto_latitud, recinto_longitud, numero_jrv, genero, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            mesa.id,
            veedorId,
            mesa.recintoId,
            mesa.recintoNombre ?? 'Recinto asignado',
            mesa.recintoLatitud ?? 0,
            mesa.recintoLongitud ?? 0,
            mesa.numeroJrv,
            mesa.genero,
            now,
          ]
        );
      }
    });
  }

  async getMesasVeedor(veedorId: string): Promise<Mesa[]> {
    const db = await getSqliteDb();
    const rows = await db.getAllAsync<LocalMesaRow>(
      'SELECT * FROM local_mesas WHERE veedor_id = ? ORDER BY numero_jrv ASC',
      [veedorId]
    );
    return rows.map(mapLocalMesaRow);
  }
}