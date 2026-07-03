import { IsOptional, IsUUID } from 'class-validator';

/** Query cho GET /metadata/majors — lọc ngành theo khoa (phục vụ combobox phân cấp). */
export class MajorsQueryDto {
  @IsOptional()
  @IsUUID()
  facultyId?: string;
}

/** Query cho GET /metadata/classes — lọc lớp theo ngành (phục vụ combobox phân cấp). */
export class ClassesQueryDto {
  @IsOptional()
  @IsUUID()
  majorId?: string;
}
