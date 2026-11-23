import { Usuario } from '../../domain/entities';
import { CreateManagedUserResult, IAuthRepository } from '../../domain/repositories';
import { CreateUserInput } from '../../domain/validators/userSchema';
import { AuthRemoteDS } from '../datasources/remote/authRemoteDS';

export class AuthRepositoryImpl implements IAuthRepository {
  constructor(private readonly remoteDS: AuthRemoteDS) {}

  login(email: string, password: string): Promise<Usuario> {
    return this.remoteDS.signInWithPassword(email, password);
  }

  logout(): Promise<void> {
    return this.remoteDS.signOut();
  }

  getCurrentSessionUser(): Promise<Usuario | null> {
    return this.remoteDS.getCurrentUser();
  }

  changePassword(newPassword: string, isFirstLogin: boolean): Promise<void> {
    return this.remoteDS.updatePassword(newPassword, isFirstLogin);
  }

  requestPasswordRecovery(email: string): Promise<void> {
    return this.remoteDS.requestPasswordRecovery(email);
  }

  createManagedUser(input: CreateUserInput): Promise<CreateManagedUserResult> {
    return this.remoteDS.createManagedUser(input);
  }

  handleDeepLinkUrl(url: string): Promise<'RECOVERY' | 'VERIFIED' | 'NONE'> {
    return this.remoteDS.handleDeepLinkUrl(url);
  }
}