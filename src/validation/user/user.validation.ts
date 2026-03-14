import Joi from "joi";
import { IUser } from "../../interfaces/user.interface";

/**
 * Validates user data against a predefined schema.
 *
 * @param {IUser} data - The user data to be validated.
 * @returns {Joi.ValidationResult} - The result of the validation.
 */
export const userSchema = (data: IUser) => {
  /**
   * Defines the schema for user data validation.
   *
   * @type {Joi.ObjectSchema}
   */
  const schema = Joi.object().keys({
    /**
     * The language preference of the user.
     *
     * @type {Joi.StringSchema}
     */
    lang_pref: Joi.string().required(),
  });
  return schema.validate(data);
};
