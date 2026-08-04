import { Injectable } from '@nestjs/common';
import { connect as netConnect, type Socket } from 'node:net';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';

type StudentAccountMailPayload = {
  email: string;
  fullName: string;
  username: string;
  password: string;
  studentCode: string;
};

type StaffAccountMailPayload = {
  email: string;
  fullName: string;
  username: string;
  password: string;
  roleLabel: string;
};

type PasswordResetMailPayload = {
  email: string;
  fullName: string;
  resetUrl: string;
  expiresInMinutes: number;
};

type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  startTls: boolean;
  user?: string;
  pass?: string;
  from: string;
  fromName: string;
  portalUrl: string;
};

type SmtpSocket = Socket | TLSSocket;

@Injectable()
export class StudentAccountMailService {
  isConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
  }

  async sendStudentAccount(payload: StudentAccountMailPayload): Promise<void> {
    const config = this.getConfig();
    const subject = 'Thông tin tài khoản sinh viên';

    await this.sendMail(config, {
      to: payload.email,
      subject,
      text: buildAccountText(payload, config.portalUrl),
      html: buildAccountHtml(payload, config.portalUrl),
    });
  }

  async sendStaffAccount(payload: StaffAccountMailPayload): Promise<void> {
    const config = this.getConfig();
    const subject = 'Thông tin tài khoản hệ thống CSMTS';

    await this.sendMail(config, {
      to: payload.email,
      subject,
      text: buildStaffAccountText(payload, config.portalUrl),
      html: buildStaffAccountHtml(payload, config.portalUrl),
    });
  }

  async sendPasswordReset(payload: PasswordResetMailPayload): Promise<void> {
    const config = this.getConfig();
    const subject = 'Yêu cầu đặt lại mật khẩu CSMTS';

    await this.sendMail(config, {
      to: payload.email,
      subject,
      text: buildPasswordResetText(payload),
      html: buildPasswordResetHtml(payload),
    });
  }

  private getConfig(): SmtpConfig {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;

    if (!host || !from) {
      throw new Error('Chưa cấu hình SMTP_HOST hoặc SMTP_FROM');
    }

    return {
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      startTls: process.env.SMTP_STARTTLS !== 'false',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from,
      fromName: process.env.SMTP_FROM_NAME ?? 'CSMTS',
      portalUrl:
        process.env.STUDENT_PORTAL_URL ??
        process.env.FRONTEND_URL ??
        DEFAULT_LOGIN_URL,
    };
  }

  private async sendMail(config: SmtpConfig, message: MailMessage) {
    const socket = await createConnection(config);
    const reader = new SmtpReader(socket);

    try {
      await reader.expect(220);
      await command(socket, reader, `EHLO ${getClientName()}`, 250);

      let activeSocket = socket;
      let activeReader = reader;
      if (!config.secure && config.startTls) {
        activeSocket = await startTlsIfSupported(socket, reader, config);
        activeReader = new SmtpReader(activeSocket);
        await command(
          activeSocket,
          activeReader,
          `EHLO ${getClientName()}`,
          250,
        );
      }

      if (config.user && config.pass) {
        await command(activeSocket, activeReader, 'AUTH LOGIN', 334);
        await command(
          activeSocket,
          activeReader,
          Buffer.from(config.user).toString('base64'),
          334,
        );
        await command(
          activeSocket,
          activeReader,
          Buffer.from(config.pass).toString('base64'),
          235,
        );
      }

      await command(
        activeSocket,
        activeReader,
        `MAIL FROM:<${config.from}>`,
        250,
      );
      await command(
        activeSocket,
        activeReader,
        `RCPT TO:<${message.to}>`,
        [250, 251],
      );
      await command(activeSocket, activeReader, 'DATA', 354);
      activeSocket.write(buildMimeMessage(config, message));
      await activeReader.expect(250);
      await command(activeSocket, activeReader, 'QUIT', 221);
      activeSocket.end();
    } catch (error) {
      socket.destroy();
      throw error;
    }
  }
}

function createConnection(config: SmtpConfig): Promise<SmtpSocket> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    const socket = config.secure
      ? tlsConnect({ port: config.port, host: config.host }, () => {
          socket.off('error', onError);
          resolve(socket);
        })
      : netConnect(config.port, config.host, () => {
          socket.off('error', onError);
          resolve(socket);
        });

    socket.once('error', onError);
  });
}

async function startTlsIfSupported(
  socket: SmtpSocket,
  reader: SmtpReader,
  config: SmtpConfig,
): Promise<SmtpSocket> {
  await command(socket, reader, 'STARTTLS', 220);

  return new Promise((resolve, reject) => {
    const tlsSocket = tlsConnect({
      socket,
      servername: config.host,
    });
    tlsSocket.once('secureConnect', () => resolve(tlsSocket));
    tlsSocket.once('error', reject);
  });
}

async function command(
  socket: SmtpSocket,
  reader: SmtpReader,
  text: string,
  expected: number | number[],
) {
  socket.write(`${text}\r\n`);
  await reader.expect(expected);
}

class SmtpReader {
  private buffer = '';
  private waiters: Array<{
    resolve: (line: string) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(private readonly socket: SmtpSocket) {
    this.socket.on('data', (chunk: Buffer) => this.onData(chunk));
    this.socket.on('error', (error) => this.rejectAll(error));
  }

  expect(expected: number | number[]): Promise<string> {
    const codes = Array.isArray(expected) ? expected : [expected];

    return this.readResponse().then((response) => {
      const code = Number(response.slice(0, 3));
      if (!codes.includes(code)) {
        throw new Error(`SMTP trả về ${response}`);
      }

      return response;
    });
  }

  private readResponse(): Promise<string> {
    const existing = this.extractResponse();
    if (existing) {
      return Promise.resolve(existing);
    }

    return new Promise((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  private onData(chunk: Buffer) {
    this.buffer += chunk.toString('utf8');
    const response = this.extractResponse();
    if (!response) {
      return;
    }

    const waiter = this.waiters.shift();
    waiter?.resolve(response);
  }

  private extractResponse(): string | null {
    const lines = this.buffer.split(/\r?\n/);
    if (lines.length <= 1) {
      return null;
    }

    const responseLines: string[] = [];
    let consumedLength = 0;

    for (const line of lines) {
      if (!line) {
        consumedLength += 2;
        continue;
      }

      responseLines.push(line);
      consumedLength += line.length + 2;

      if (/^\d{3} /.test(line)) {
        this.buffer = this.buffer.slice(consumedLength);
        return responseLines.join('\n');
      }
    }

    return null;
  }

  private rejectAll(error: Error) {
    for (const waiter of this.waiters.splice(0)) {
      waiter.reject(error);
    }
  }
}

function buildMimeMessage(config: SmtpConfig, message: MailMessage) {
  const boundary = `CSMTS-${Date.now()}`;
  const headers = [
    `From: ${encodeHeader(config.fromName)} <${config.from}>`,
    `To: <${message.to}>`,
    `Subject: ${encodeHeader(message.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.text,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.html,
    `--${boundary}--`,
  ];

  return `${headers.join('\r\n')}\r\n\r\n${dotStuff(body.join('\r\n'))}\r\n.\r\n`;
}

const DEFAULT_LOGIN_URL = 'https://apagdanhgiarenluyen.vercel.app/login';

function getLoginUrl(portalUrl?: string): string {
  if (!portalUrl) return DEFAULT_LOGIN_URL;
  const trimmed = portalUrl.trim();
  if (trimmed.endsWith('/login')) return trimmed;
  return `${trimmed.replace(/\/+$/, '')}/login`;
}

function buildAccountText(
  payload: StudentAccountMailPayload,
  portalUrl: string,
) {
  const loginUrl = getLoginUrl(portalUrl);
  return [
    `Xin chào ${payload.fullName},`,
    '',
    'Thông tin tài khoản sinh viên của bạn:',
    `- Mã sinh viên: ${payload.studentCode}`,
    `- Tên đăng nhập: ${payload.username}`,
    `- Mật khẩu: ${payload.password}`,
    `- Địa chỉ đăng nhập: ${loginUrl}`,
    '',
    'Lưu ý:',
    '- Không chia sẻ tài khoản này cho bất kỳ ai.',
    '- Sau khi đăng nhập thành công, bạn nên đổi mật khẩu ngay.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildAccountHtml(
  payload: StudentAccountMailPayload,
  portalUrl: string,
) {
  const loginUrl = getLoginUrl(portalUrl);
  const loginLine = `<li style="margin: 6px 0;">Địa chỉ đăng nhập: <a href="${escapeHtml(
    loginUrl,
  )}" style="color: #b9101a; font-weight: 700; text-decoration: underline;">${escapeHtml(
    loginUrl,
  )}</a></li>`;

  return `
    <div style="margin: 0; padding: 0; background: #ffffff; font-family: Arial, Helvetica, sans-serif; color: #252525;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 760px; margin: 0 auto; border: 18px solid #b9101a; border-collapse: collapse; background: #ffffff;">
        <tr>
          <td style="padding: 0;">
            <div style="height: 118px; background: #ffffff; position: relative; overflow: hidden;">
              <div style="height: 86px; border-bottom: 10px solid #b9101a; transform: skewY(-4deg); transform-origin: left bottom; box-shadow: 0 4px 8px rgba(0,0,0,0.2);"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background: #eef3f1; padding: 28px 34px 34px 34px; font-size: 16px; line-height: 1.65;">
            <p style="margin: 0 0 12px 0;">Chào bạn <strong>${escapeHtml(
              payload.fullName,
            )}</strong>,</p>

            <p style="margin: 0 0 14px 0; color: #b9101a; font-size: 20px; line-height: 1.45; font-weight: 700;">
              CHÚC MỪNG bạn đã được tạo tài khoản sinh viên trên hệ thống quản lý sinh viên và đánh giá rèn luyện.
            </p>

            <p style="margin: 0 0 26px 0;">
              Thông tin tài khoản của bạn được gửi bên dưới, vui lòng truy cập
              <a href="${escapeHtml(
                loginUrl,
              )}" style="background: #ffe69a; color: #b9101a; padding: 2px 6px; font-weight: 700; text-decoration: underline;">Trang đăng nhập hệ thống</a>
              để thực hiện đánh giá.
            </p>

            <p style="margin: 0 0 10px 0; font-size: 17px;"><strong>Thông tin sinh viên của bạn:</strong></p>
            <ul style="margin: 0 0 28px 28px; padding: 0;">
              <li style="margin: 6px 0;">Mã sinh viên: ${escapeHtml(
                payload.studentCode,
              )}</li>
              <li style="margin: 6px 0;">Họ và tên: ${escapeHtml(
                payload.fullName,
              )}</li>
            </ul>

            <p style="margin: 0 0 10px 0; font-size: 17px;"><strong>Thông tin tài khoản của bạn:</strong></p>
            <ul style="margin: 0 0 18px 28px; padding: 0;">
              <li style="margin: 6px 0;">Tên đăng nhập: <strong>${escapeHtml(
                payload.username,
              )}</strong></li>
              <li style="margin: 6px 0;">Mật khẩu: <strong>${escapeHtml(
                payload.password,
              )}</strong></li>
              ${loginLine}
            </ul>

            <p style="margin: 20px 0 10px 0; font-size: 16px;"><strong>Lưu ý:</strong></p>
            <ul style="margin: 0 0 0 28px; padding: 0;">
              <li style="margin: 6px 0;">Không chia sẻ tài khoản này cho bất kỳ ai.</li>
              <li style="margin: 6px 0;">Sau khi đăng nhập thành công, bạn nên đổi mật khẩu ngay.</li>
              <li style="margin: 6px 0;">Nếu quên mật khẩu, vui lòng liên hệ quản trị viên để được hỗ trợ.</li>
            </ul>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function buildStaffAccountText(
  payload: StaffAccountMailPayload,
  portalUrl: string,
) {
  const loginUrl = getLoginUrl(portalUrl);
  return [
    `Xin chào ${payload.fullName},`,
    '',
    'Thông tin tài khoản hệ thống CSMTS của bạn:',
    `- Vai trò: ${payload.roleLabel}`,
    `- Tên đăng nhập: ${payload.username}`,
    `- Mật khẩu: ${payload.password}`,
    `- Địa chỉ đăng nhập: ${loginUrl}`,
    '',
    'Lưu ý:',
    '- Không chia sẻ tài khoản này cho bất kỳ ai.',
    '- Sau khi đăng nhập thành công, bạn nên đổi mật khẩu ngay.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildStaffAccountHtml(
  payload: StaffAccountMailPayload,
  portalUrl: string,
) {
  const loginUrl = getLoginUrl(portalUrl);
  const loginLine = `<li style="margin: 6px 0;">Địa chỉ đăng nhập: <a href="${escapeHtml(
    loginUrl,
  )}" style="color: #b9101a; font-weight: 700; text-decoration: underline;">${escapeHtml(
    loginUrl,
  )}</a></li>`;

  return `
    <div style="margin: 0; padding: 0; background: #ffffff; font-family: Arial, Helvetica, sans-serif; color: #252525;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 760px; margin: 0 auto; border: 18px solid #b9101a; border-collapse: collapse; background: #ffffff;">
        <tr>
          <td style="padding: 0;">
            <div style="height: 118px; background: #ffffff; position: relative; overflow: hidden;">
              <div style="height: 86px; border-bottom: 10px solid #b9101a; transform: skewY(-4deg); transform-origin: left bottom; box-shadow: 0 4px 8px rgba(0,0,0,0.2);"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background: #eef3f1; padding: 28px 34px 34px 34px; font-size: 16px; line-height: 1.65;">
            <p style="margin: 0 0 12px 0;">Chào <strong>${escapeHtml(
              payload.fullName,
            )}</strong>,</p>

            <p style="margin: 0 0 14px 0; color: #b9101a; font-size: 20px; line-height: 1.45; font-weight: 700;">
              THÔNG TIN TÀI KHOẢN HỆ THỐNG CSMTS (${escapeHtml(
                payload.roleLabel,
              ).toUpperCase()})
            </p>

            <p style="margin: 0 0 26px 0;">
              Tài khoản làm việc của bạn đã được khởi tạo. Vui lòng truy cập
              <a href="${escapeHtml(
                loginUrl,
              )}" style="background: #ffe69a; color: #b9101a; padding: 2px 6px; font-weight: 700; text-decoration: underline;">Trang đăng nhập hệ thống</a>
              để bắt đầu làm việc.
            </p>

            <p style="margin: 0 0 10px 0; font-size: 17px;"><strong>Thông tin tài khoản của bạn:</strong></p>
            <ul style="margin: 0 0 18px 28px; padding: 0;">
              <li style="margin: 6px 0;">Vai trò: <strong>${escapeHtml(
                payload.roleLabel,
              )}</strong></li>
              <li style="margin: 6px 0;">Tên đăng nhập: <strong>${escapeHtml(
                payload.username,
              )}</strong></li>
              <li style="margin: 6px 0;">Mật khẩu: <strong>${escapeHtml(
                payload.password,
              )}</strong></li>
              ${loginLine}
            </ul>

            <p style="margin: 20px 0 10px 0; font-size: 16px;"><strong>Lưu ý:</strong></p>
            <ul style="margin: 0 0 0 28px; padding: 0;">
              <li style="margin: 6px 0;">Không chia sẻ tài khoản này cho bất kỳ ai.</li>
              <li style="margin: 6px 0;">Sau khi đăng nhập thành công, bạn nên đổi mật khẩu ngay.</li>
              <li style="margin: 6px 0;">Nếu gặp sự cố, vui lòng liên hệ quản trị viên để được hỗ trợ.</li>
            </ul>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function buildPasswordResetText(payload: PasswordResetMailPayload) {
  return [
    `Xin chào ${payload.fullName},`,
    '',
    'Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản CSMTS của bạn.',
    payload.resetUrl
      ? `Vui lòng mở đường dẫn sau để tạo mật khẩu mới: ${payload.resetUrl}`
      : 'Không tạo được đường dẫn đặt lại mật khẩu. Vui lòng liên hệ quản trị viên.',
    `Đường dẫn này chỉ có hiệu lực trong ${payload.expiresInMinutes} phút và chỉ sử dụng được một lần.`,
    '',
    'Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildPasswordResetHtml(payload: PasswordResetMailPayload) {
  const resetAction = payload.resetUrl
    ? `<p style="margin: 22px 0;"><a href="${escapeHtml(
        payload.resetUrl,
      )}" style="display: inline-block; background: #b9101a; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 16px;">Tạo mật khẩu mới</a></p>
         <p style="margin: 0 0 18px 0; color: #4b5563; word-break: break-all;">Hoặc copy đường dẫn: <a href="${escapeHtml(
           payload.resetUrl,
         )}" style="color: #b9101a; font-weight: 700;">${escapeHtml(
           payload.resetUrl,
         )}</a></p>`
    : '<p style="margin: 22px 0; color: #b9101a; font-weight: 700;">Không tạo được đường dẫn đặt lại mật khẩu. Vui lòng liên hệ quản trị viên.</p>';

  return `
    <div style="margin: 0; padding: 0; background: #ffffff; font-family: Arial, Helvetica, sans-serif; color: #252525;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 760px; margin: 0 auto; border: 18px solid #b9101a; border-collapse: collapse; background: #ffffff;">
        <tr>
          <td style="padding: 0;">
            <div style="height: 118px; background: #ffffff; position: relative; overflow: hidden;">
              <div style="height: 86px; border-bottom: 10px solid #b9101a; transform: skewY(-4deg); transform-origin: left bottom; box-shadow: 0 4px 8px rgba(0,0,0,0.2);"></div>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background: #eef3f1; padding: 28px 34px 34px 34px; font-size: 16px; line-height: 1.65;">
            <p style="margin: 0 0 12px 0;">Xin chào <strong>${escapeHtml(
              payload.fullName,
            )}</strong>,</p>
            <p style="margin: 0 0 14px 0; font-size: 20px; line-height: 1.45; font-weight: 700; color: #b9101a;">
              Yêu cầu đặt lại mật khẩu tài khoản CSMTS
            </p>
            <p style="margin: 0 0 12px 0;">
              Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để tạo mật khẩu mới.
            </p>
            ${resetAction}
            <p style="margin: 0 0 12px 0;">
              Đường dẫn này chỉ có hiệu lực trong <strong>${
                payload.expiresInMinutes
              } phút</strong> và chỉ sử dụng được một lần.
            </p>
            <p style="margin: 0; color: #6b7280;">
              Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

function encodeHeader(value: string) {
  return `=?UTF-8?B?${Buffer.from(value).toString('base64')}?=`;
}

function dotStuff(value: string) {
  return value.replace(/^\./gm, '..');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getClientName() {
  return process.env.SMTP_CLIENT_NAME ?? 'localhost';
}
