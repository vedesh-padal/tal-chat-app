import { Router } from "express";
import {
  createOrGetAOneOnOneChat,
  deleteOneOnOneChat,
  getAllChats,
  searchAllAvailableUsers,
  searchUsers,
  sendInvitation,
  respondToInvitation,
  getMyInvitations,
  getUsersByStatus,
  searchMessagesInChat
} from "../controllers/chat.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { mongoIdPathVariableSchema } from "../validators/mongodb.validators.js";
import { validate_params } from "../validators/validate.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getAllChats); // chats this user is part of

router.route("/users").get(searchAllAvailableUsers);

// should do zod validation for the incoming data if needed for the next 3 routes below
// /search?query=<searchTerm>
router
  .route("/search")
  .get(searchUsers);


router
  .route("/invitations/send/:receiverId")
  .post(sendInvitation);


router
  .route("/invitations/respond")  // const { invitationFrom, response } = req.query;
  .post(respondToInvitation);


router
  .route("/invitations/:status")
  .get(getUsersByStatus);

router
  .route("/invitations/all")
  .get(getMyInvitations);


router
  .route("/c/:receiverId")
  .post(
    validate_params(mongoIdPathVariableSchema("receiverId")),
    createOrGetAOneOnOneChat
  );


router
  .route("/searchMessages")
  .get(searchMessagesInChat);  // uses query parameters to pass chatId and search query


router
  .route("/remove/:chatId")
  .delete(
    validate_params(mongoIdPathVariableSchema("chatId")),
    deleteOneOnOneChat
  );


export default router;