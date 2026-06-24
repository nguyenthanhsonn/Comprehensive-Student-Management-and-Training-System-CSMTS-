import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { User, UserRole } from 'src/common/shared';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokenStoreService } from './jwt/auth-token-store';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import type { JwtPayload, JwtTokenType } from './types/jwt-payload.type';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type LogoutResult = {
  loggedOut: true;
};

type ChangePasswordResult = {
  passwordChanged: true;
  requiresLogin: true;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenStore: AuthTokenStoreService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    return this.createSession({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      isActive: user.isActive,
    });
  }

  me(user: AuthenticatedUser): User {
    return this.toPublicUser(user);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(dto.refreshToken);
    const user = await this.usersService.findByIdWithRefreshToken(payload.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (user.refreshTokenExpiresAt.getTime() <= Date.now()) {
      await this.usersService.clearRefreshToken(user.id);
      throw new UnauthorizedException('Refresh token has expired');
    }

    const isRefreshTokenValid = await bcrypt.compare(
      dto.refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.createSession({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      isActive: user.isActive,
    });
  }

  async logout(
    user: AuthenticatedUser,
    dto: LogoutDto = {},
  ): Promise<LogoutResult> {
    this.tokenStore.revokeToken(user.accessTokenId, user.tokenExpiresAt);

    if (dto.refreshToken) {
      const payload = await this.verifyRefreshToken(dto.refreshToken);
      if (payload.sub !== user.id) {
        throw new UnauthorizedException('Invalid refresh token');
      }
    }

    await this.usersService.clearRefreshToken(user.id);

    return { loggedOut: true };
  }

  async changePassword(
    user: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<ChangePasswordResult> {
    const userWithPassword = await this.usersService.findByIdWithPassword(
      user.id,
    );

    if (
      !userWithPassword ||
      !(await bcrypt.compare(
        dto.currentPassword,
        userWithPassword.passwordHash,
      ))
    ) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (await bcrypt.compare(dto.newPassword, userWithPassword.passwordHash)) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.usersService.updatePasswordHash(user.id, passwordHash);
    await this.usersService.clearRefreshToken(user.id);
    this.tokenStore.revokeToken(user.accessTokenId, user.tokenExpiresAt);

    return {
      passwordChanged: true,
      requiresLogin: true,
    };
  }

  private async createSession(user: User): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signToken(user, 'access'),
      this.signToken(user, 'refresh'),
    ]);
    const refreshTokenPayload = await this.verifyRefreshToken(refreshToken);
    const refreshTokenExpiresAt = this.getTokenExpiresAt(refreshTokenPayload);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    await this.usersService.updateRefreshToken(
      user.id,
      refreshTokenHash,
      refreshTokenExpiresAt,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private signToken(user: User, tokenType: JwtTokenType): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenType,
      jti: randomUUID(),
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.getTokenExpiresIn(tokenType) as never,
    });
  }

  private getTokenExpiresIn(tokenType: JwtTokenType): string {
    if (tokenType === 'refresh') {
      return this.configService.get<string>('app.jwtRefreshExpiresIn', '7d');
    }

    return this.configService.get<string>('app.jwtExpiresIn', '15m');
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('app.jwtSecret'),
        },
      );

      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private getTokenExpiresAt(payload: JwtPayload): Date {
    if (!payload.exp) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return new Date(payload.exp * 1000);
  }

  private toPublicUser(user: AuthenticatedUser): User {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    };
  }
}
