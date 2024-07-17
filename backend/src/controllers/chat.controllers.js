import mongoose from "mongoose";
import { ChatEventEnum } from "../constants.js";
import { User } from "../models/auth/user.models.js"
import { Chat } from "../models/chat.models.js";
import { ChatMessage } from "../models/message.models.js";
import { emitSocketEvent } from "../socket/index.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { removeLocalFile } from "../utils/helpers.js";

/**
 * @description Utility function which returns the pipeline stages to structure the chat schema with common lookups
 * @returns {mongoose.PipelineStage[]}
 */
// detailed description on working is made as notes in Notion under a toggle heading3 day3,4
const chatCommonAggregation = () => {
  return [  // returns an array of pipeline stages
    {
      // lookup for the participants present
      $lookup: {
        from: "users",
        foreignField: "_id",
        localField: "participants",
        as: "participants",
        pipeline: [
          {
            $project: {
              password: 0,
              refreshToken: 0,
              forgotPasswordToken: 0,
              forgotPasswordExpiry: 0,
              emailVerificationToken: 0,
              emailVerificationExpiry: 0,
            },
          },
        ],
      },
    },
    {
      // DOUBTFUL: lookup for the group chats
      $lookup: {
        from: "chatmessages",  // why this naming, mongodb pluralises (explanation in notion doc)
        foreignField: "_id",
        localField: "lastMessage",
        as: "lastMessage",
        pipeline: [
          {
            // get the details of the sender
            $lookup: {
              from: "users",
              foreignField: "_id",
              localField: "sender",
              as: "sender",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                    email: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              sender: { $first: "$sender" },  //  adds the first element of the sender array to the sender field.
            },
          },
        ],
      },
    },
    {
      $addFields: {
        lastMessage: { $first: "$lastMessage" },
      },
    },
  ];
};


/**
 *
 * @param {string} chatId
 * @description utility function responsible for removing all the messages and file attachments attached to the deleted chat
 */
const deleteCascadeChatMessages = async (chatId) => {
  // fetch messages associated with the chat to remove
  const messages = await ChatMessage.find({
    chat: new mongoose.Types.ObjectId(chatId),
  });

  let attachments = [];

  // collecting the attachements present in the messages of that particular chat
  attachments = attachments.concat(
    ...messages.map((message) => {
      return message.attachments;
    })
  );

  attachments.forEach((attachment) => {
    // remove attachment files from the local storage
    removeLocalFile(attachment.localPath);
  });

  // delete all the messages
  await ChatMessage.deleteMany({
    chat: new mongoose.Types.ObjectId(chatId),
  });
};

const searchAvailableUsers = asyncHandler(async (req, res) => {
  const users = await User.aggregate([
    {
      $match: {
        _id: {
          $ne: req.user._id,  // ($ne => note equal) avoid logged in user
        },
      },
    },
    {
      $project: {
        avatar: 1,
        username: 1,
        email: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));
});


const createOrGetAOneOnOneChat = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;

  // check if it's a valid receiver (user)
  const receiver = await User.findById(receiverId);

  if (!receiver)  {
    throw new ApiError(404, "Receiver does not exist");
  }

  // check if receiver is not the user who is requesting a chat
  // the same user cannot chat with himself
  if (receiver._id.toString() === req.user._id.toString())  {
    throw new ApiError(400, "You cannot chat with yourself");
  }

  const chat = await Chat.aggregate([
    {
      $match: {
        isGroupChat: false,
        // filter chats with participants having receiver and logged in user only 
        // (after auth, we have req.user, so logged-in user)
        $and: [
          {
            participants: { $elemMatch: { $eq: req.user._id } }
          },
          {
            participants: {
              $elemMatch: { $eq: new mongoose.Types.ObjectId(receiverId) },
            }
          }
        ]
      }
    },
    ...chatCommonAggregation(),
  ]);


  if (chat.length)  {
    // if we find the chat, that means user already has created a chat with that receiver
    return res
      .status(200)
      .json(new ApiResponse(200, chat[0]), "Chat retrieved successfully");
  }

  // if not we need to create a new on on one chat
  // AND THIS SHOULD HAPPEN ONLY WHEN THE CONNECTED REQUEST IS ACCEPTED --> TODO
  const newChatInstance = await Chat.create({
    name: "One on one chat",  // change name here to indicate the conversation between whom
    participants: [req.user._id, new mongoose.Types.ObjectId(receiverId)],  // add receiver and logged in user as participants
    admin: req.user._id,  // not really required for one-to-one chat, but just indicates who initiated the chat
  });

  // structure the chat as per the common aggregation to keep the consistency
  const createdChat = await Chat.aggregrate([
    {
      $match: {
        _id: newChatInstance._id,
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = createdChat[0]; // store the aggregation result

  if (!payload) {
    throw new ApiError(500, "Internal server error");
  }

  // logic to emit socket event about the new chat added to the participants
  payload?.participants?.forEach((participant) => {
    // do not emit the even for the logged in user, as he is the one who is initiating the chat
    if (participant._id.toString() === req.user._id.toString()) return;

    // emit event to other particiapnts with new chat as a payload
    emitSocketEvent(
      req,
      participant._id?.toString(),
      ChatEventEnum.NEW_CHAT_EVENT,
      payload
    );
  });

  return res
    .status(201)
    .json(new ApiResponse(201, payload, "Chat retrieved successfully"));

});


const deleteOneOnOneChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;

  // check for chat existence
  // NOTE: Chat.aggregate() is used because it allows for more complex and flexible operations on the data, including filtering, projection, lookup operations, aggregation, and custom pipeline stages.
  const chat = await Chat.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(chatId),
      },
    },
    ...chatCommonAggregation(),
  ]);

  const payload = chat[0];

  if (!payload) {
    throw new ApiError(404, "Chat does not exist");
  }

  await Chat.findByIdAndDelete(chatId); // delete the chat even if user is not admin, because it's a personal chat (assuming we might implement group chats sometime in future)

  await deleteCascadeChatMessages(chatId);  // delete all the messages and attachments associated with the chat

  const otherParticipant = payload?.participants?.find(
    (participant) => participant?._id.toString() !== req.user._id.toString()  // get the other participant in chat for socket
  );

  // emit event to the other participant with left chat as a payload
  emitSocketEvent(
    req,
    otherParticipant._id?.toString(),
    ChatEventEnum.LEAVE_CHAT_EVENT,
    payload
  );

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Chat deleted successfully"));

});


// get all chats of the logged-in user, newest at the top
const getAllChats = asyncHandler(async (req, res) => {
  const chats = await Chat.aggregate([
    {
      $match: {
        participants: { $elemMatch: { $eq: req.user._id } }   // get all the chats that have logged-in users as participant
      },
    },
    {
      $sort: {
        updatedAt: -1,    // descending sort
      },
    },
    ...chatCommonAggregation(),
  ])

  return res
    .status(200)
    .json(
      new ApiResponse(200, chats || [], "User chats fetched successfully!")
    );

});

export {
  createOrGetAOneOnOneChat,
  deleteOneOnOneChat,
  getAllChats,
  searchAvailableUsers,
}