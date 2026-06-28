import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UserRole } from 'src/common/shared';
import { UsersService } from '../../users/users.service';
import { AuthTokenStoreService } from '../jwt/auth-token-store';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly tokenStore: AuthTokenStoreService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('app.jwtAccessSecret'),
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    if (!payload.jti || this.tokenStore.isTokenRevoked(payload)) {
      throw new UnauthorizedException('Invalid access token');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      accessTokenId: payload.jti,
      tokenIssuedAt: payload.iat,
      tokenExpiresAt: payload.exp,
    };
  }
}
