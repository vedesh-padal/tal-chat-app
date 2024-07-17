import { Router } from "express";
import {
  deleteMessage,
  getAllMessages,
  sendMessage
} from "../controllers/message.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middleware.js";
import { sendMessageSchema } from "../validators/message.validators.js";
import { mongoIdPathVariableSchema } from "../validators/mongodb.validators.js";
import { validate } from "../validators/validate.js";


const router = Router();

router.use(verifyJWT);

/**
 * 
 * GET /:chatId - Retrieve all messages for a specific chat
 * POST /:chatId - Send a new message to a specific chat
 */
router
  .route("/:chatId")
  .get(
    validate(mongoIdPathVariableSchema("chatId")),
    getAllMessages
  )
  .post(
    upload.fields([{ name: "attachments", maxCount: 5 }]),
    validate(mongoIdPathVariableSchema("chatId")),
    validate(sendMessageSchema),
    sendMessage
  );

// delete message
router
  .route("/:chatId/:messageId")
  .delete(
    validate(mongoIdPathVariableSchema("chatId")),
    validate(mongoIdPathVariableSchema("messageId")),
    deleteMessage
  );


export default router;