import cookie from "cookie"
import jwt from "jsonwebtoken"
// import { Server, Socket } from "socket.io"
import { User } from "../models/auth/user.models.js"
import { AvailableChatEvents, ChatEventEnum } from "../constants.js"
import { ApiError } from "../utils/ApiError.js"


const mountJoinChatEvent = (socket) => {
  socket.on(ChatEventEnum.JOIN_CHAT_EVENT, (chatId) => {
    console.log(`User joined the chat 🤝. chatId: `, chatId);
    // joining the room with the chatId will allow specific events to be fired where we don't bother about the users like typing events (to others)
    // i.e., we want to just emit that to the chat where the typing is happening
    socket.join(chatId);
  });
};


const mountParticipantTypingEvent = (socket) => {
  socket.on(ChatEventEnum.TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.TYPING_EVENT, chatId);
  })
};

const mountParticipantStoppedTypingEvent = (socket) => {
  socket.on(ChatEventEnum.STOP_TYPING_EVENT, (chatId) => {
    socket.in(chatId).emit(ChatEventEnum.STOP_TYPING_EVENT, chatId);
  });
};


const initializeSocketIO = (io) => {

  // socket object represents a single client connection to the server. 
  // It is the fundamental building block of real-time, bidirectional communication between the client and server.

  // socket in the below code: it is a built-in object provided by the Socket.IO library, 
  // which is used to handle the communication between the client and the server.

  return io.on("connection", async (socket) => {
    try {
      // parse the cookies from the handshake headers (This is only possible if client has `withCredentials: true`)
      const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

      let token = cookies?.accessToken; // get the accessToken

      if (!token) {
        // token is required for the socket to work
        throw new ApiError(401, "Un-authorized handshake. Token is missing.");
      }

      const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken -emailVerficationToken -emailVerificationExpiry"
      );

      if (!user)  {
        throw new ApiError(401, "Un-authorized handshake. Token is invalid");
      }

      socket.user = user; // mount the user object to the socket

      // creating a room with user id so that if user is joined but,
      // does not have any active chat going on, still we want ot emit some socket 
      // events to the user. so that the client can catch the event and show the notifications
      socket.join(user._id.toString());
      socket.emit(ChatEventEnum.CONNECTED_EVENT); // emit the connected event so that the client is aware
      console.log("User connected ✅. userId: " + user._id.toString());

      // common events that needs to be mounted on the initialisation
      mountJoinChatEvent(socket);
      mountParticipantTypingEvent(socket);
      mountParticipantStoppedTypingEvent(socket);

      socket.on(ChatEventEnum.DISCONNECTED_EVENT, () => {
        console.log("User has disconnected 🚫. userId: " + socket.user?._id);
        if (socket.user?._id) {
          socket.leave(socket.user_id);
        }
      })
    } catch (error) {
      socket.emit(
        ChatEventEnum.SOCKET_ERROR_EVENT,
        error?.message || "Something went wrong while connecting to the socket."
      );
    }
  });
};


/**
 * 
 * @param {import("express").Request} req - Request object to access the `io` instance set at the entry point
 * @param {string} roomId - Room where the event should be emitted
 * @param {AvailableChatEvents[0]} event - Event that should be emitted
 * @param {any} payload - Data that should be sent when emitting the event
 */

const emitSocketEvent = (req, roomId, event, payload) => {
  req.app.get("io").in(roomId).emit(event, payload);
};

export { initializeSocketIO, emitSocketEvent };