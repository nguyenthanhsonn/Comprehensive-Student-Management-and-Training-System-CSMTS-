export type AdminMajorResponse = {
  id: string;
  code: string;
  name: string;
  facultyId: string;
  isActive: boolean;
  createdAt: Date;
  faculty: {
    id: string;
    code: string;
    name: string;
  };
  classCount: number;
};
