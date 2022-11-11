import QueueOption from "../../models/QueueOption";

interface QueueOptionData {
  queueId: string;
  title: string;
  option: string;
  message?: string;
  parentId?: string | null;
  optionType?: string;
  fileType?: string;
  path?: string;
  fileName?: string;
  finalize?: string | boolean;
}

const CreateService = async (
  queueOptionData: QueueOptionData
): Promise<QueueOption> => {
  if (queueOptionData.parentId == "null") {
    queueOptionData.parentId = null;
  }
  if (queueOptionData.finalize == "true") {
    queueOptionData.finalize = true;
  }
  if (queueOptionData.finalize == "false") {
    queueOptionData.finalize = false;
  }
  const queueOption = await QueueOption.create(queueOptionData);
  return queueOption;
};

export default CreateService;
