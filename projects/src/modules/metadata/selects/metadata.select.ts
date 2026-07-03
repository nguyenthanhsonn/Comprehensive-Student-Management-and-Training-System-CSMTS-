import { Prisma } from '../../../generated/prisma/client';

// ─── Select tối giản cho combobox — chỉ id/code/name, không kéo dư thừa ───────

export const facultyMetadataSelect = {
  id: true,
  code: true,
  name: true,
} satisfies Prisma.FacultySelect;

export const majorMetadataSelect = {
  id: true,
  code: true,
  name: true,
} satisfies Prisma.MajorSelect;

export const classMetadataSelect = {
  id: true,
  code: true,
  name: true,
} satisfies Prisma.ClassSelect;

// ─── Inferred record types ────────────────────────────────────────────────────
export type FacultyMetadataRecord = Prisma.FacultyGetPayload<{
  select: typeof facultyMetadataSelect;
}>;
export type MajorMetadataRecord = Prisma.MajorGetPayload<{
  select: typeof majorMetadataSelect;
}>;
export type ClassMetadataRecord = Prisma.ClassGetPayload<{
  select: typeof classMetadataSelect;
}>;
