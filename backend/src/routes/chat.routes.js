import { Router } from "express";
import {
  createOrGetAOneOnOneChat,
  deleteOneOnOneChat,
  getAllChats,
  searchAvailableUsers
} from "../controllers/chat.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { mongoIdPathVariableSchema } from "../validators/mongodb.validators.js";
import { validate } from "../validators/validate.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getAllChats);

router.route("/users").get(searchAvailableUsers);

router
  .route("/c/:receiverId")
  .post(
    validate(mongoIdPathVariableSchema("receiverId")),
    createOrGetAOneOnOneChat
  );

router
  .route("/remove/:chatId")
  .delete(
    validate(mongoIdPathVariableSchema("chatId")),
    deleteOneOnOneChat
  );


export default router;