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
      portalUrl: process.env.STUDENT_PORTAL_URL ?? process.env.FRONTEND_URL ?? '',
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
        await command(activeSocket, activeReader, `EHLO ${getClientName()}`, 250);
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

      await command(activeSocket, activeReader, `MAIL FROM:<${config.from}>`, 250);
      await command(activeSocket, activeReader, `RCPT TO:<${message.to}>`, [
        250,
        251,
      ]);
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

function buildAccountText(payload: StudentAccountMailPayload, portalUrl: string) {
  return [
    `Xin chào ${payload.fullName},`,
    '',
    'Thông tin tài khoản sinh viên của bạn:',
    `- Mã sinh viên: ${payload.studentCode}`,
    `- Tên đăng nhập: ${payload.username}`,
    `- Mật khẩu: ${payload.password}`,
    portalUrl ? `- Địa chỉ đăng nhập: ${portalUrl}` : '',
    '',
    'Lưu ý:',
    '- Không chia sẻ tài khoản này cho bất kỳ ai.',
    '- Sau khi đăng nhập thành công, bạn nên đổi mật khẩu ngay.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildAccountHtml(payload: StudentAccountMailPayload, portalUrl: string) {
  const loginLine = portalUrl
    ? `<li style="margin: 6px 0;">Địa chỉ đăng nhập: <a href="${escapeHtml(
        portalUrl,
      )}" style="color: #2563eb; text-decoration: underline;">${escapeHtml(
        portalUrl,
      )}</a></li>`
    : '';
  const portalLabel = portalUrl ? 'cổng hệ thống' : 'hệ thống';

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

            <p style="margin: 0 0 14px 0; color: #4f7faa; font-size: 20px; line-height: 1.45; font-weight: 700;">
              CHÚC MỪNG bạn đã được tạo tài khoản sinh viên trên hệ thống quản lý sinh viên và đánh giá rèn luyện.
            </p>

            <p style="margin: 0 0 26px 0;">
              Thông tin tài khoản của bạn được gửi bên dưới, vui lòng đăng nhập vào
              <span style="background: #ffe69a; padding: 0 4px; font-weight: 700;">${escapeHtml(
                portalLabel,
              )}</span>
              và trải nghiệm.
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
              <li style="margin: 6px 0;"><em>Lưu ý:</em></li>
            </ul>

            <ul style="margin: 0 0 0 72px; padding: 0;">
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

function buildStaffAccountText(payload: StaffAccountMailPayload, portalUrl: string) {
  return [
    `Xin chào ${payload.fullName},`,
    '',
    'Thông tin tài khoản hệ thống CSMTS của bạn:',
    `- Vai trò: ${payload.roleLabel}`,
    `- Tên đăng nhập: ${payload.username}`,
    `- Mật khẩu: ${payload.password}`,
    portalUrl ? `- Địa chỉ đăng nhập: ${portalUrl}` : '',
    '',
    'Lưu ý:',
    '- Không chia sẻ tài khoản này cho bất kỳ ai.',
    '- Sau khi đăng nhập thành công, bạn nên đổi mật khẩu ngay.',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildStaffAccountHtml(payload: StaffAccountMailPayload, portalUrl: string) {
  const loginLine = portalUrl
    ? `<li>Địa chỉ đăng nhập: <a href="${escapeHtml(portalUrl)}">${escapeHtml(
        portalUrl,
      )}</a></li>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <p><strong>Thông tin tài khoản hệ thống CSMTS của bạn:</strong></p>
      <ul>
        <li>Vai trò: ${escapeHtml(payload.roleLabel)}</li>
        <li>Họ và tên: ${escapeHtml(payload.fullName)}</li>
        <li>Tên đăng nhập: <strong>${escapeHtml(payload.username)}</strong></li>
        <li>Mật khẩu: <strong>${escapeHtml(payload.password)}</strong></li>
        ${loginLine}
      </ul>
      <p><strong>Lưu ý:</strong></p>
      <ul>
        <li>Không chia sẻ tài khoản này cho bất kỳ ai.</li>
        <li>Sau khi đăng nhập thành công, bạn nên đổi mật khẩu ngay.</li>
        <li>Nếu quên mật khẩu, vui lòng liên hệ quản trị viên để được hỗ trợ.</li>
      </ul>
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
