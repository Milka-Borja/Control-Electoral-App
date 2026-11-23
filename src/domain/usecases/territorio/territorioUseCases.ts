import { Candidato, Mesa, Organizacion, Recinto, Usuario } from '../../entities';
import { ITerritorioRepository } from '../../repositories';
import { CreateRecintoInput, createRecintoSchema } from '../../validators/userSchema';

export class GetCatalogosElectoralesUseCase {
  constructor(private readonly territorioRepo: ITerritorioRepository) {}

  execute(): Promise<{ organizaciones: Organizacion[]; candidatos: Candidato[] }> {
    return this.territorioRepo.getOrganizacionesYCandidatos();
  }
}

export class GetRecintosUseCase {
  constructor(private readonly territorioRepo: ITerritorioRepository) {}

  execute(): Promise<Recinto[]> {
    return this.territorioRepo.getRecintosJurisdiccion();
  }
}

export class CreateRecintoUseCase {
  constructor(private readonly territorioRepo: ITerritorioRepository) {}

  execute(input: CreateRecintoInput): Promise<Recinto> {
    const parsed = createRecintoSchema.parse(input);
    return this.territorioRepo.createRecinto(parsed);
  }
}

export class AsignarCoordinadorRecintoUseCase {
  constructor(private readonly territorioRepo: ITerritorioRepository) {}

  execute(recintoId: string, coordinadorId: string): Promise<void> {
    return this.territorioRepo.asignarCoordinadorRecinto(recintoId, coordinadorId);
  }
}

export class GetCoordinadoresRecintoUseCase {
  constructor(private readonly territorioRepo: ITerritorioRepository) {}

  execute(): Promise<Usuario[]> {
    return this.territorioRepo.getCoordinadoresRecinto();
  }
}

export class GetPanelRecintoUseCase {
  constructor(private readonly territorioRepo: ITerritorioRepository) {}

  async execute(): Promise<{
    recinto: Recinto | null;
    mesas: Mesa[];
    veedores: Usuario[];
  }> {
    const [recinto, mesas, veedores] = await Promise.all([
      this.territorioRepo.getMiRecinto(),
      this.territorioRepo.getMesasMiRecinto(),
      this.territorioRepo.getVeedoresMiRecinto(),
    ]);
    return { recinto, mesas, veedores };
  }
}

export class ReasignarMesaVeedorUseCase {
  constructor(private readonly territorioRepo: ITerritorioRepository) {}

  execute(mesaId: string, nuevoVeedorId: string): Promise<void> {
    return this.territorioRepo.reasignarMesaVeedor(mesaId, nuevoVeedorId);
  }
}

export class GetMesasVeedorUseCase {
  constructor(private readonly territorioRepo: ITerritorioRepository) {}

  execute(veedorId: string): Promise<Mesa[]> {
    return this.territorioRepo.getMesasAsignadasVeedor(veedorId);
  }
}