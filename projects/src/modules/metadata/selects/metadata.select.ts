import { Prisma } from '../../../generated/prisma/client';

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

export type FacultyMetadataRecord = Prisma.FacultyGetPayload<{
  select: typeof facultyMetadataSelect;
}>;
export type MajorMetadataRecord = Prisma.MajorGetPayload<{
  select: typeof majorMetadataSelect;
}>;
export type ClassMetadataRecord = Prisma.ClassGetPayload<{
  select: typeof classMetadataSelect;
}>;
