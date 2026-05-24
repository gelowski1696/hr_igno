import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { AccountStatus } from '@prisma/client';
import { LoginDto } from './dto/login.dto';
import { PasswordService } from './password.service';
import { UsersService } from '../users/users.service';

export type AuthenticatedUser = {
  id: number;
  username: string;
  role: string;
  employeeId: number | null;
  storeId: number | null;
};

export type LoginResult = {
  user: AuthenticatedUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

function tokenTtl(value: string | undefined, fallback: JwtSignOptions['expiresIn']) {
  return (value || fallback) as JwtSignOptions['expiresIn'];
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(JwtService) private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const username = dto.username.trim();
    const user = await this.users.findForLogin(username);
    const invalid = new UnauthorizedException('Invalid username or password');

    if (!user) {
      throw invalid;
    }

    const passwordMatches = await this.passwords.verify(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw invalid;
    }

    if (user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException('Account is inactive');
    }

    const safeUser: AuthenticatedUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      employeeId: user.employeeId,
      storeId: user.storeId,
    };

    const payload = {
      sub: safeUser.id,
      id: safeUser.id,
      username: safeUser.username,
      role: safeUser.role,
      employeeId: safeUser.employeeId,
      storeId: safeUser.storeId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'local-access-secret',
        expiresIn: tokenTtl(process.env.JWT_ACCESS_EXPIRES_IN, '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'local-refresh-secret',
        expiresIn: tokenTtl(process.env.JWT_REFRESH_EXPIRES_IN, '7d'),
      }),
    ]);

    return {
      user: safeUser,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}
