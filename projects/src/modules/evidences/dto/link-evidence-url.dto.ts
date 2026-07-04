import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class LinkEvidenceUrlDto {
  @IsString()
  @MaxLength(20)
  criteriaCode: string;

  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @Matches(/^https:\/\/res\.cloudinary\.com\/.+/i, {
    message: 'Đường dẫn ảnh phải là URL bảo mật của Cloudinary',
  })
  @MaxLength(1000)
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  publicId?: string;
}
