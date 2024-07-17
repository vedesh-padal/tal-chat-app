// // doubtful code REVIEW LATER and test --> DONE 

import { z } from "zod";

/**
 *
 * @param {string} idName
 * @description A common validator responsible to validate mongodb ids passed in the url's path variable
 */
export const mongoIdPathVariableSchema = () => {
  return z.string().regex(/^[0-9a-fA-F]{24}$/, `Invalid id`)
}

/**
 *
 * @param {string} idName
 * @description A common validator responsible to validate mongodb ids passed in the request body
 */
export const mongoIdRequestBodySchema = (idName) => {
  return z.object({
    [idName]: z.string().regex(/^[0-9a-fA-F]{24}$/, `Invalid ${idName}`),
  });
};