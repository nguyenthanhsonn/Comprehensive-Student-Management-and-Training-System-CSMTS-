import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenStoreService } from './services/auth-token-store.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('app.jwtSecret'),
        signOptions: {
          expiresIn: configService.get<string>(
            'app.jwtExpiresIn',
            '15m',
          ) as never,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthTokenStoreService, JwtStrategy],
  exports: [AuthService, AuthTokenStoreService],
})
export class AuthModule {}
