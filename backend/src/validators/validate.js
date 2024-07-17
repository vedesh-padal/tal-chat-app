import { z } from "zod";
import { ApiError } from "../utils/ApiError.js"

const validate = (schema) => (req, res, next) => {
  console.log('reaching in validate method')
  try {
    if (req.params) {
      const { chatId } = req.params;
      const { receiverId } = req.params;
      const { messageId } = req.params;
      
      if (chatId) schema.parse(chatId)
      else if (receiverId) schema.parse(receiverId)
      else if (messageId) schema.parse(messageId)
    } else if (req.body)  {
       schema.parse(req.body);
    }
    
    
    next();
  } catch (error) {
    if (error instanceof z.ZodError)  {
      const extractedErrors = error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message
      }));
      
      throw new ApiError(422, "Received data is not valid", extractedErrors);
    } else {
      next(error);
    }
  }
}

export { validate };