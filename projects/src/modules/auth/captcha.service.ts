import { BadRequestException, Injectable, OnModuleDestroy } from '@nestjs/common';
import { createHash, randomInt, randomUUID } from 'node:crypto';

type CaptchaEntry = {
  codeHash: string;
  expiresAt: number;
};

export type CaptchaResponse = {
  captchaId: string;
  image: string;
  expiresInSeconds: number;
  debugCode?: string;
};

const CAPTCHA_TTL_MS = 2 * 60 * 1000;
const CAPTCHA_CLEANUP_INTERVAL_MS = 60 * 1000;
const CAPTCHA_LENGTH = 5;
const CAPTCHA_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class CaptchaService implements OnModuleDestroy {
  private readonly store = new Map<string, CaptchaEntry>();
  private readonly cleanupTimer: NodeJS.Timeout;

  constructor() {
    this.cleanupTimer = setInterval(
      () => this.cleanupExpired(),
      CAPTCHA_CLEANUP_INTERVAL_MS,
    );
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  create(): CaptchaResponse {
    this.cleanupExpired();

    const captchaId = randomUUID();
    const code = this.generateCode();

    this.store.set(captchaId, {
      codeHash: this.hashCode(code),
      expiresAt: Date.now() + CAPTCHA_TTL_MS,
    });

    return {
      captchaId,
      image: this.createSvgDataUri(code),
      expiresInSeconds: CAPTCHA_TTL_MS / 1000,
      ...(process.env.NODE_ENV === 'production' ? {} : { debugCode: code }),
    };
  }

  verify(captchaId: string, captchaCode: string) {
    const entry = this.store.get(captchaId);
    // Captcha chỉ được thử một lần. Đúng, sai, hoặc hết hạn đều phải lấy mã mới.
    this.store.delete(captchaId);

    if (!entry) {
      throw new BadRequestException(
        'Mã xác nhận không hợp lệ hoặc đã hết hạn, vui lòng tải mã mới',
      );
    }

    if (entry.expiresAt <= Date.now()) {
      throw new BadRequestException(
        'Mã xác nhận đã hết hạn, vui lòng tải mã mới',
      );
    }

    if (entry.codeHash !== this.hashCode(captchaCode)) {
      throw new BadRequestException(
        'Mã xác nhận không đúng, vui lòng tải mã mới',
      );
    }
  }

  private generateCode() {
    let code = '';

    for (let i = 0; i < CAPTCHA_LENGTH; i += 1) {
      code += CAPTCHA_CHARS[randomInt(0, CAPTCHA_CHARS.length)];
    }

    return code;
  }

  private hashCode(code: string) {
    return createHash('sha256')
      .update(code.trim().toUpperCase())
      .digest('hex');
  }

  private cleanupExpired() {
    const now = Date.now();

    for (const [captchaId, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(captchaId);
      }
    }
  }

  private createSvgDataUri(code: string) {
    const chars = code.split('');
    const text = chars
      .map((char, index) => {
        const x = 28 + index * 34 + randomInt(-4, 5);
        const y = 42 + randomInt(-5, 6);
        const rotate = randomInt(-18, 19);
        return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
      })
      .join('');

    const lines = Array.from({ length: 7 }, () => {
      const x1 = randomInt(0, 200);
      const y1 = randomInt(0, 60);
      const x2 = randomInt(0, 200);
      const y2 = randomInt(0, 60);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
    }).join('');

    const dots = Array.from({ length: 45 }, () => {
      const cx = randomInt(0, 200);
      const cy = randomInt(0, 60);
      return `<circle cx="${cx}" cy="${cy}" r="1" />`;
    }).join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60">
  <rect width="200" height="60" rx="8" fill="#fff1f5"/>
  <g stroke="#d63384" stroke-width="1.5" opacity="0.35">${lines}</g>
  <g fill="#be123c" opacity="0.45">${dots}</g>
  <g font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#be123c" opacity="0.9">${text}</g>
</svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
}
