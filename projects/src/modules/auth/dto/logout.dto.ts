import { IsJWT, IsOptional } from 'class-validator';

export class LogoutDto {
  @IsOptional()
  @IsJWT()
  refreshToken?: string;
}
2