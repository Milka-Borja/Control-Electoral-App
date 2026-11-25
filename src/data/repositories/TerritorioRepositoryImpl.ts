import { Candidato, EstadoAvanceMesa, Mesa, Organizacion, Recinto, Usuario } from '../../domain/entities';
import { ITerritorioRepository } from '../../domain/repositories';
import { CreateRecintoInput } from '../../domain/validators/userSchema';
import { ActaLocalDS } from '../datasources/local/actaLocalDS';
import { CatalogLocalDS } from '../datasources/local/catalogLocalDS';
import { TerritorioRemoteDS } from '../datasources/remote/territorioRemoteDS';

function calcularAvanceMesa(
  estadoAlc?: string,
  estadoPref?: string
): EstadoAvanceMesa {
  const hasAlc = Boolean(estadoAlc && estadoAlc !== 'PENDIENTE');
  const hasPref = Boolean(estadoPref && estadoPref !== 'PENDIENTE');
  if (hasAlc && hasPref) return 'COMPLETA';
  if (hasAlc || hasPref) return 'PARCIAL';
  return 'PENDIENTE';
}

export class TerritorioRepositoryImpl implements ITerritorioRepository {
  constructor(
    private readonly remoteDS: TerritorioRemoteDS,
    private readonly catalogLocalDS: CatalogLocalDS,
    private readonly actaLocalDS: ActaLocalDS
  ) {}

  async getOrganizacionesYCandidatos(): Promise<{
    organizaciones: Organizacion[];
    candidatos: Candidato[];
  }> {
    let remote: { organizaciones: Organizacion[]; candidatos: Candidato[] };
    try {
      remote = await this.remoteDS.getOrganizacionesYCandidatos();
    } catch (remoteError) {
      const local = await this.catalogLocalDS.getOrganizacionesYCandidatos();
      if (local.organizaciones.length > 0) return local;
      throw remoteError;
    }

    if (remote.organizaciones.length > 0) {
      await this.catalogLocalDS.saveOrganizacionesYCandidatos(
        remote.organizaciones,
        remote.candidatos
      );
      return remote;
    }

    const local = await this.catalogLocalDS.getOrganizacionesYCandidatos();
    return local.organizaciones.length > 0 ? local : remote;
  }

  getRecintosJurisdiccion(): Promise<Recinto[]> {
    return this.remoteDS.getRecintosJurisdiccion();
  }

  createRecinto(input: CreateRecintoInput): Promise<Recinto> {
    return this.remoteDS.createRecinto(input);
  }

  asignarCoordinadorRecinto(recintoId: string, coordinadorId: string): Promise<void> {
    return this.remoteDS.asignarCoordinadorRecinto(recintoId, coordinadorId);
  }

  getCoordinadoresRecinto(): Promise<Usuario[]> {
    return this.remoteDS.getCoordinadoresRecinto();
  }

  getMiRecinto(): Promise<Recinto | null> {
    return this.remoteDS.getMiRecinto();
  }

  getMesasMiRecinto(): Promise<Mesa[]> {
    return this.remoteDS.getMesasMiRecinto();
  }

  getVeedoresMiRecinto(): Promise<Usuario[]> {
    return this.remoteDS.getVeedoresMiRecinto();
  }

  reasignarMesaVeedor(mesaId: string, nuevoVeedorId: string): Promise<void> {
    return this.remoteDS.reasignarMesaVeedor(mesaId, nuevoVeedorId);
  }

  async getMesasAsignadasVeedor(veedorId: string): Promise<Mesa[]> {
    let mesas: Mesa[] = [];
    try {
      mesas = await this.remoteDS.getMesasAsignadasVeedor(veedorId);
      await this.catalogLocalDS.saveMesasVeedor(veedorId, mesas);
    } catch {
      mesas = await this.catalogLocalDS.getMesasVeedor(veedorId);
    }

    // Superponer estados locales SQLite (GUARDADO, EN_PROCESO, FALLADO, CONFLICTO)
    const localStatuses = await this.actaLocalDS.getStatusesByMesaIds(mesas.map((m) => m.id));
    return mesas.map((mesa) => {
      const local = localStatuses.get(mesa.id);
      const estadoAlcaldia = local?.ALCALDIA ?? mesa.estadoAlcaldia ?? 'PENDIENTE';
      const estadoPrefectura = local?.PREFECTURA ?? mesa.estadoPrefectura ?? 'PENDIENTE';
      return {
        ...mesa,
        estadoAlcaldia,
        estadoPrefectura,
        avance: calcularAvanceMesa(estadoAlcaldia, estadoPrefectura),
      };
    });
  }
}