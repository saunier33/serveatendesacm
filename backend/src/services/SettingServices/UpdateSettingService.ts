import Setting from "../../models/Setting";
import { isArray, isObject } from "lodash";

interface Request {
  key: string;
  value: string;
}

const UpdateSettingService = async ({
  key,
  value
}: Request): Promise<Setting | undefined> => {
  const setting = await Setting.findOne({
    where: { key }
  });

  let preparedValue = value;

  if (isArray(value) || isObject(value)) {
    preparedValue = JSON.stringify(value);
  }

  if (!setting) {
    return await Setting.create({ key, value: preparedValue });
  } else {
    return await setting.update({ value: preparedValue });
  }
};

export default UpdateSettingService;
