import { z } from "zod";
import { ApiError } from "../utils/ApiError"

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
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