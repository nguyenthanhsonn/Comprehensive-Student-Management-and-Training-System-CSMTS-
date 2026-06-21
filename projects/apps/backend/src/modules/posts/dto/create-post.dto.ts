import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsUUID()
  authorId: string;
}
