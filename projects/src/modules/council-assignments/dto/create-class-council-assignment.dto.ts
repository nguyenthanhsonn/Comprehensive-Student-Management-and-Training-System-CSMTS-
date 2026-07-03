import { IsUUID } from 'class-validator';

/** Gán 1 user (role class_council) phụ trách duyệt điểm cho 1 lớp cụ thể. */
export class CreateClassCouncilAssignmentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  classId: string;
}
