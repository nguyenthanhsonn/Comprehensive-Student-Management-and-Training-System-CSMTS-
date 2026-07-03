import { IsUUID } from 'class-validator';

/** Gán 1 user (role faculty_council) phụ trách duyệt điểm cho 1 khoa cụ thể. */
export class CreateFacultyCouncilAssignmentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  facultyId: string;
}
