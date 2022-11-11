import { Request, Response } from "express";

import DashboardDataService, {
  Params
} from "../services/ReportService/DashbardDataService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const params: Params = req.query;

  const dashboardData: any = await DashboardDataService(params);
  return res.status(200).json(dashboardData);
};
