import type { Request, Response, NextFunction } from 'express';

import { getFacilityServiceHealth } from '../../clients/facility/facility.client';
import { getCoordinationServiceHealth } from '../../clients/coordination/coordination.client';

export const getSystemHealthController = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const [facilityHealth, coordinationHealth] = await Promise.all([
      getFacilityServiceHealth(),
      getCoordinationServiceHealth(),
    ]);
    //   console.log({
    //     facilityHealth,
    //     coordinationHealth,
    //     });

    return res.status(200).json({
      gateway: 'ok',
      facilityService: facilityHealth.data?.status,
      coordinationService: coordinationHealth.data?.status,
    });
  } catch (error) {
    return next(error);
  }
};
