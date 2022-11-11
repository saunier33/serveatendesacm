import { Op } from "sequelize";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import ShowQueueService from "./ShowQueueService";
import { isNil } from "lodash";
import path from "path";
import fs from "fs";

interface QueueData {
  name?: string;
  color?: string;
  greetingMessage?: string;
  optionType?: string;
  filePath?: string | null;
  fileName?: string | null;
  fileType?: string | null;
}

const UpdateQueueService = async (
  queueId: number | string,
  queueData: QueueData
): Promise<Queue> => {
  const { color, name } = queueData;

  const queueSchema = Yup.object().shape({
    name: Yup.string()
      .min(2, "ERR_QUEUE_INVALID_NAME")
      .test(
        "Check-unique-name",
        "ERR_QUEUE_NAME_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameName = await Queue.findOne({
              where: { name: value, id: { [Op.not]: queueId } }
            });

            return !queueWithSameName;
          }
          return true;
        }
      ),
    color: Yup.string()
      .required("ERR_QUEUE_INVALID_COLOR")
      .test("Check-color", "ERR_QUEUE_INVALID_COLOR", async value => {
        if (value) {
          const colorTestRegex = /^#[0-9a-f]{3,6}$/i;
          return colorTestRegex.test(value);
        }
        return true;
      })
      .test(
        "Check-color-exists",
        "ERR_QUEUE_COLOR_ALREADY_EXISTS",
        async value => {
          if (value) {
            const queueWithSameColor = await Queue.findOne({
              where: { color: value, id: { [Op.not]: queueId } }
            });
            return !queueWithSameColor;
          }
          return true;
        }
      )
  });

  try {
    await queueSchema.validate({ color, name });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const queue = await ShowQueueService(queueId);

  if (
    !isNil(queueData.filePath) &&
    queue.filePath !== "" &&
    queueData?.filePath !== queue.filePath
  ) {
    if (queue.filePath !== null) {
      const file = path.resolve("public", queue.filePath);
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        await queue.update({
          fileName: "",
          filePath: "",
          fileType: ""
        });
      }
    }
  }

  await queue.update(queueData);

  return queue;
};

export default UpdateQueueService;
