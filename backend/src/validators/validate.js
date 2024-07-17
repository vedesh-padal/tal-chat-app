import { z } from "zod";
import { ApiError } from "../utils/ApiError.js"

export const validate_params = (schema) => (req, res, next) => {
  try {
    if (req.params) {
      const { chatId } = req.params;
      const { receiverId } = req.params;
      const { messageId } = req.params;

      if (chatId) schema.parse(chatId)
      else if (receiverId) schema.parse(receiverId)
      else if (messageId) schema.parse(messageId)
    }

    next();
  } catch (error) {
    if (error instanceof z.ZodError)  {
      const extractedErrors = error.issues.map((err) => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      throw new ApiError(422, "Received data is not valid", extractedErrors);
    } else {
      next(error);
    }
  }
}


export const validate_body = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body)

    next();
  } catch (error) {
    if (error instanceof z.ZodError)  {
      const extractedErrors = error.issues.map((err) => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      throw new ApiError(422, "Received data is not valid", extractedErrors);
    } else {
      next(error);
    }
  }
}