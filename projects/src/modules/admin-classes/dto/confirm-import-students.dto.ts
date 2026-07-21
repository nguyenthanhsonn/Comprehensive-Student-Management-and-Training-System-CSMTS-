import { IsUUID } from 'class-validator';

export class ConfirmImportStudentsDto {
  @IsUUID()
  importToken: string;
}
