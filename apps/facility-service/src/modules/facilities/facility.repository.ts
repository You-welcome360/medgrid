import { prisma } from '@medgrid/database';

export const findAllFacilities = async () => {
  return prisma.facility.findMany({
    orderBy: { name: 'asc' },
  });
};

export const findFacilityById = async (id: string) => {
  return prisma.facility.findUnique({
    where: { id },
  });
};
