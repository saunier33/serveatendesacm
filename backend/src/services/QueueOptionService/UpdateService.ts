import QueueOption from "../../models/QueueOption";
import ShowService from "./ShowService";
import { isNil } from "lodash";
import fs from "fs";
import path from "path";

interface QueueData {
  queueId?: string;
  title?: string;
  option?: string;
  message?: string;
  parentId?: string | null;
  optionType?: string;
  fileType?: string;
  path?: string;
  fileName?: string;
  finalize?: string | boolean;
}

const UpdateService = async (
  queueOptionId: number | string,
  queueOptionData: QueueData
): Promise<QueueOption> => {
  const queueOption = await ShowService(queueOptionId);

  if (queueOptionData.parentId == "null") {
    queueOptionData.parentId = null;
  }

  if (
    !isNil(queueOptionData.path) &&
    queueOption.path !== "" &&
    queueOptionData?.path !== queueOption.path
  ) {
    if (queueOption.path !== null) {
      const file = path.resolve("public", queueOption.path);
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
        await queueOption.update({
          fileName: "",
          path: "",
          fileType: ""
        });
      }
    }
  }

  if (queueOptionData?.path == null) {
    queueOptionData["fileName"] = "";
    queueOptionData["path"] = "";
    queueOptionData["fileType"] = "";
  }

  if (queueOptionData?.finalize == "true") {
    queueOptionData.finalize = true;
  }
  if (queueOptionData?.finalize == "false") {
    queueOptionData.finalize = false;
  }

  await queueOption.update(queueOptionData);

  return queueOption;
};

export default UpdateService;
