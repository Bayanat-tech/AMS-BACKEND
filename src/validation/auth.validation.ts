import Joi from "joi";
import { TLogin } from "../interfaces/common.interface";

export const loginSchema = (data: TLogin) => {
  const schema = Joi.object().keys({
    /**
     * Email address
     */
    email: Joi.string().required(),
    /**
     * Password
     */
    password: Joi.string().required(),
  });
  return schema.validate(data);
};
