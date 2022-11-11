import { Router } from "express";
import isAuth from "../middleware/isAuth";
import multer from "multer";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

import * as QueueController from "../controllers/QueueController";

const queueRoutes = Router();

queueRoutes.get("/queue", isAuth, QueueController.index);

queueRoutes.post(
  "/queue",
  isAuth,
  upload.single("file"),
  QueueController.store
);

queueRoutes.get("/queue/:queueId", isAuth, QueueController.show);

queueRoutes.put(
  "/queue/:queueId",
  isAuth,
  upload.single("file"),
  QueueController.update
);

queueRoutes.delete("/queue/:queueId", isAuth, QueueController.remove);

export default queueRoutes;
