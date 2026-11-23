import { Usuario } from '../../entities';
import { ICrashMonitorPort } from '../../ports';
import { CreateManagedUserResult, IAuthRepository } from '../../repositories';
import {
  changePasswordSchema,
  CreateUserInput,
  createUserSchema,
  loginSchema,
  recoverySchema,
} from '../../validators/userSchema';

export class LoginUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly crashMonitor: ICrashMonitorPort
  ) {}

  async execute(email: string, password: string): Promise<Usuario> {
    const parsed = loginSchema.parse({ email, password });
    const user = await this.authRepo.login(parsed.email, parsed.password);
    this.crashMonitor.setSafeUserContext(user.id, user.rol);
    this.crashMonitor.addBreadcrumb('auth', 'Inicio de sesión exitoso', { rol: user.rol });
    return user;
  }
}

export class LogoutUseCase {
  constructor(
    private readonly authRepo: IAuthRepository,
    private readonly crashMonitor: ICrashMonitorPort
  ) {}

  async execute(): Promise<void> {
    await this.authRepo.logout();
    this.crashMonitor.clearUserContext();
  }
}

export class ChangePasswordUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(password: string, confirmPassword: string, isFirstLogin: boolean): Promise<void> {
    const parsed = changePasswordSchema.parse({ password, confirmPassword });
    await this.authRepo.changePassword(parsed.password, isFirstLogin);
  }
}

export class RequestPasswordRecoveryUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(email: string): Promise<void> {
    const parsed = recoverySchema.parse({ email });
    await this.authRepo.requestPasswordRecovery(parsed.email);
  }
}

export class CreateManagedUserUseCase {
  constructor(private readonly authRepo: IAuthRepository) {}

  async execute(input: CreateUserInput): Promise<CreateManagedUserResult> {
    const parsed = createUserSchema.parse(input);
    return this.authRepo.createManagedUser(parsed);
  }
}