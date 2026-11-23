import { Acta, ActaAuditoria, ConflictoActa, DignidadElectoral } from '../../entities';
import { IFileStoragePort, ILocationPort, ISharpnessPort } from '../../ports';
import { IActaRepository } from '../../repositories';
import { evaluarUbicacionActa } from '../../utils/geoDistance';
import { ActaInput, actaSchema } from '../../validators/actaSchema';

export interface SaveActaParams {
  input: ActaInput;
  clientUuid: string;
  recintoLatitud: number;
  recintoLongitud: number;
  usuarioId: string;
  isNewPhotoCapture: boolean;
}

export class SaveActaOfflineUseCase {
  constructor(
    private readonly actaRepo: IActaRepository,
    private readonly fileStorage: IFileStoragePort
  ) {}

  async execute(params: SaveActaParams): Promise<Acta> {
    // 1. Validación estricta Zod (RF-10, RF-19, S-03, ADR-09)
    const parsed = actaSchema.parse(params.input);

    // 2. Validar espacio disponible y persistir fotografía en disco local (ADR-03)
    let persistedPhotoUri = parsed.fotoUri;
    if (params.isNewPhotoCapture) {
      const hasSpace = await this.fileStorage.hasSufficientStorage(40);
      if (!hasSpace) {
        throw new Error(
          'Espacio de almacenamiento insuficiente en el dispositivo para guardar la fotografía del acta. Libere al menos 40 MB e intente nuevamente.'
        );
      }
      persistedPhotoUri = await this.fileStorage.persistPhotoLocally(
        parsed.fotoUri,
        params.clientUuid
      );
    }

    // 3. Calcular distancia Haversine respecto al recinto (S-06)
    const { distanciaMetros, alertaUbicacion } = evaluarUbicacionActa(
      parsed.latitud,
      parsed.longitud,
      params.recintoLatitud,
      params.recintoLongitud
    );

    // 4. Guardar en SQLite + Outbox transaccional (ADR-03, ADR-10)
    const acta: Acta = {
      clientUuid: params.clientUuid,
      mesaId: parsed.mesaId,
      dignidad: parsed.dignidad,
      totalSufragantes: parsed.totalSufragantes,
      votosBlancos: parsed.votosBlancos,
      votosNulos: parsed.votosNulos,
      votos: parsed.votos,
      localPhotoUri: persistedPhotoUri,
      latitud: parsed.latitud,
      longitud: parsed.longitud,
      precisionGps: parsed.precisionGps,
      distanciaRecintoM: distanciaMetros,
      alertaUbicacion,
      version: parsed.baseVersion,
      syncStatus: 'GUARDADO',
      registradoPor: params.usuarioId,
      modificadoPor: params.usuarioId,
      updatedAt: new Date().toISOString(),
    };

    return this.actaRepo.saveActaOffline(acta);
  }
}

export class ValidateEvidenceCaptureUseCase {
  constructor(
    private readonly sharpnessPort: ISharpnessPort,
    private readonly locationPort: ILocationPort
  ) {}

  async execute(photoUri: string) {
    const [sharpness, location] = await Promise.all([
      this.sharpnessPort.analyzeImage(photoUri),
      this.locationPort.captureBestAccuracyLocation(),
    ]);
    return { sharpness, location };
  }
}

export class GetActaPorMesaYDignidadUseCase {
  constructor(private readonly actaRepo: IActaRepository) {}

  execute(mesaId: string, dignidad: DignidadElectoral): Promise<Acta | null> {
    return this.actaRepo.getActaPorMesaYDignidad(mesaId, dignidad);
  }
}

export class GetActasMiRecintoUseCase {
  constructor(private readonly actaRepo: IActaRepository) {}

  execute(): Promise<ActaAuditoria[]> {
    return this.actaRepo.getActasMiRecinto();
  }
}

export class GetActaAuditoriaUseCase {
  constructor(private readonly actaRepo: IActaRepository) {}

  execute(actaId: string): Promise<ActaAuditoria | null> {
    return this.actaRepo.getActaAuditoriaById(actaId);
  }
}

export class GetConflictosPendientesUseCase {
  constructor(private readonly actaRepo: IActaRepository) {}

  execute(): Promise<ConflictoActa[]> {
    return this.actaRepo.getConflictosPendientes();
  }
}

export class ResolverConflictoActaUseCase {
  constructor(private readonly actaRepo: IActaRepository) {}

  execute(
    conflictoId: string,
    decision: 'CONSERVAR_SERVIDOR' | 'APLICAR_ENTRANTE'
  ): Promise<void> {
    return this.actaRepo.resolverConflicto(conflictoId, decision);
  }
}