import { Injectable } from '@nestjs/common';
import type { JwtPayload } from '../types/jwt-payload.type';

type RevokedToken = {
  expiresAt: number;
};

@Injectable()
export class AuthTokenStoreService {
  private readonly revokedTokens = new Map<string, RevokedToken>();
  private readonly userTokensRevokedAfter = new Map<string, number>();

  revokeToken(jti: string | undefined, expiresAtSeconds: number | undefined) {
    if (!jti) {
      return;
    }

    const expiresAt = expiresAtSeconds ? expiresAtSeconds * 1000 : Date.now();
    this.revokedTokens.set(jti, { expiresAt });
    this.pruneExpiredTokens();
  }

  revokeUserTokensIssuedBefore(
    userId: string,
    issuedBeforeSeconds = Math.floor(Date.now() / 1000),
  ) {
    this.userTokensRevokedAfter.set(userId, issuedBeforeSeconds);
  }

  isTokenRevoked(payload: Pick<JwtPayload, 'sub' | 'jti' | 'iat'>): boolean {
    this.pruneExpiredTokens();

    if (payload.jti && this.revokedTokens.has(payload.jti)) {
      return true;
    }

    const revokedAfter = this.userTokensRevokedAfter.get(payload.sub);
    if (!revokedAfter || !payload.iat) {
      return false;
    }

    return payload.iat < revokedAfter;
  }

  private pruneExpiredTokens() {
    const now = Date.now();
    for (const [jti, token] of this.revokedTokens.entries()) {
      if (token.expiresAt <= now) {
        this.revokedTokens.delete(jti);
      }
    }
  }
}
