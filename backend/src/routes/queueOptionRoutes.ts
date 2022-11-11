import { Router } from "express";
import isAuth from "../middleware/isAuth";
import multer from "multer";
import uploadConfig from "../config/upload";

import * as QueueOptionController from "../controllers/QueueOptionController";

const upload = multer(uploadConfig);

const queueOptionRoutes = Router();

queueOptionRoutes.get("/queue-options", isAuth, QueueOptionController.index);

queueOptionRoutes.post(
  "/queue-options",
  isAuth,
  upload.single("file"),
  QueueOptionController.store
);

queueOptionRoutes.get(
  "/queue-options/:queueOptionId",
  isAuth,
  QueueOptionController.show
);

queueOptionRoutes.put(
  "/queue-options/:queueOptionId",
  isAuth,
  upload.single("file"),
  QueueOptionController.update
);

queueOptionRoutes.delete(
  "/queue-options/:queueOptionId",
  isAuth,
  QueueOptionController.remove
);

export default queueOptionRoutes;
