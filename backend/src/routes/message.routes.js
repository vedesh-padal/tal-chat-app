import { Router } from "express";
import {
  deleteMessage,
  getAllMessages,
  markMessageAsRead,
  sendMessage
} from "../controllers/message.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { uploadAttachment } from "../middlewares/multer.middleware.js";
import { sendMessageSchema } from "../validators/message.validators.js";
import { mongoIdPathVariableSchema } from "../validators/mongodb.validators.js";
import { validate_params, validate_body } from "../validators/validate.js";


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
    validate_params(mongoIdPathVariableSchema("chatId")),
    getAllMessages
  )
  .post(
    uploadAttachment.fields([{ name: "attachments", maxCount: 5 }]),
    validate_params(mongoIdPathVariableSchema("chatId")),
    validate_body(sendMessageSchema),
    sendMessage
  );

// delete message
router
  .route("/:chatId/:messageId")
  .delete(
    validate_params(mongoIdPathVariableSchema("chatId")),
    validate_params(mongoIdPathVariableSchema("messageId")),
    deleteMessage
  );

router
  .route("/:chatId/:messageId/read")
  .patch(
    validate_params(mongoIdPathVariableSchema("chatId")),
    validate_params(mongoIdPathVariableSchema("messageId")),
    markMessageAsRead
  );


export default router;