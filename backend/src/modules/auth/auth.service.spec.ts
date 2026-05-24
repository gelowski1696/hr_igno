import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  const user = {
    id: 7,
    username: 'admin',
    passwordHash: 'hashed-password',
    role: 'ADMIN',
    status: 'ACTIVE',
    employeeId: null,
    storeId: null,
  };

  const users = {
    findForLogin: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;

  const passwords = {
    verify: jest.fn(),
  } as unknown as jest.Mocked<PasswordService>;

  const jwt = {
    signAsync: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns user details and tokens when credentials are valid', async () => {
    users.findForLogin.mockResolvedValue(user as never);
    passwords.verify.mockResolvedValue(true as never);
    jwt.signAsync
      .mockResolvedValueOnce('access-token' as never)
      .mockResolvedValueOnce('refresh-token' as never);
    const service = new AuthService(users, passwords, jwt);

    const result = await service.login({ username: 'admin', password: 'secret' });

    expect(result.user).toEqual({
      id: 7,
      username: 'admin',
      role: 'ADMIN',
      employeeId: null,
      storeId: null,
    });
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(jwt.signAsync).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid credentials without exposing which field failed', async () => {
    users.findForLogin.mockResolvedValue(user as never);
    passwords.verify.mockResolvedValue(false as never);
    const service = new AuthService(users, passwords, jwt);

    await expect(
      service.login({ username: 'admin', password: 'bad-secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive users', async () => {
    users.findForLogin.mockResolvedValue({ ...user, status: 'INACTIVE' } as never);
    passwords.verify.mockResolvedValue(true as never);
    const service = new AuthService(users, passwords, jwt);

    await expect(
      service.login({ username: 'admin', password: 'secret' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

