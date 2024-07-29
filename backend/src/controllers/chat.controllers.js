import mongoose from "mongoose";
import { ChatEventEnum, InvitationStatusEnum } from "../constants.js";
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



const searchAllAvailableUsers = asyncHandler(async (req, res) => {

  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const users = await User.aggregate([
    {
      $match: {
        _id: {
          $ne: req.user._id,
        },
      },
    },
    {
      $project: {
        avatar: 1,
        username: 1,
        email: 1,
        role: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));

});


const searchUsers = asyncHandler(async (req, res) => {
  
  // zod validation can be done here if required (validate() middleware can be used if needed)
  const { query } = req.query;  // /search?query=<searchTerm>

  if (!query) {
    throw new ApiError(400, "Search query is required");
  }

  // search for users by username or email (case insensitive)
  const users = await User.find({
    $or: [
      { username: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
    ],
  }).select("username email avatar"); // select only these fields

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully"));

});


const sendInvitation = asyncHandler(async (req, res) => {
  const { receiverId } = req.params;

  // Check if the receiverId parameter is provided
  if (!receiverId) {
    throw new ApiError(400, "Invalid request: receiverId parameter is required");
  }

  // check if the receiver (user) exists
  const receiver = await User.findById(receiverId);

  if (!receiver)  {
    throw new ApiError(404, "Receiver does not exist");
  }

  // Check if an invitation already exists
  const existingInvitation = await User.findOne({
    _id: receiverId,
    'invitations.from': req.user._id
  });

  if (existingInvitation) {
    // CHANGE STATUS CODE HERE, IF NEEDED
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "Invitation already sent"));
  }

  // Create new invitation
  await User.findByIdAndUpdate(receiverId, {
    $push: { invitations: { from: req.user._id, status: InvitationStatusEnum.PENDING } }
  });

  // save the user with updated invitatiosn
  await req.user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Invitation sent successfully"));

});


const respondToInvitation = asyncHandler(async (req, res) => {
  const { invitationFrom, response } = req.query; // response can be 'accept' or 'reject'

  // Check if the invitationFrom parameter is provided
  if (!invitationFrom) {
    throw new ApiError(400, "Invalid request: invitationFrom parameter is required");
  }
  
  if (!response || !['accept', 'reject'].includes(response)) {
    throw new ApiError(400, "Invalid request: response parameter is required and must be 'accept' or 'reject'");
  }

  // first the invitation received from should be a valid user
  const sender = await User.findById(invitationFrom);

  if (!sender)  {
    throw new ApiError(404, "No such user from whom invitation was sent");
  }

  // find the invitation
  const invitation = await req
    .user
    .invitations
    .find(inv => inv.from.toString() === invitationFrom);

  if (!invitation)  {
    throw new ApiError(404, "Invitation not found");
  }

  // update invitation status
  if (response === "accept")  {
    invitation.status = InvitationStatusEnum.ACCEPTED;

    // add each other to connections
    // in-memory updates
    req.user.connections.push(invitation.from);

    const actualSender = await User.findById(invitation.from);
    actualSender.connections.push(req.user._id);

    // // update in DB as well
    // await User.findByIdAndUpdate(req.user._id, {
    //   $push: { connections: invitationFrom }
    // });

    // await User.findByIdAndUpdate(invitationFrom, {
    //   $push: { connections: req.user._id }
    // });
    // the above DB update will be done by the save()

    await actualSender.save()
    // await req.user.save();

    
    // await sender.save();
  } else if (response === "reject") {
    invitation.status = InvitationStatusEnum.REJECTED;
  } else {
    throw new ApiError(400, "Invalid response by the user for the invitation");
  }

  // // remove the invitation after responding
  // req.user.invitations.pull({ from: invitationFrom });
  await req.user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Invitation responded successfully"));

});


const getUsersByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;
  const invitationStatus = status.toLowerCase();

  const getUserInvitationsByStatus = (status) => {
    switch (status) {
      case InvitationStatusEnum.PENDING.toLowerCase():
        return req.user.invitations
          .filter(inv => inv.status === InvitationStatusEnum.PENDING)
          .map(({ from, status }) => ({ from, status }));
      case InvitationStatusEnum.ACCEPTED.toLowerCase():
        return req.user.invitations
          .filter(inv => inv.status === InvitationStatusEnum.ACCEPTED)
          .map(({ from, status }) => ({ from, status }));
      case InvitationStatusEnum.REJECTED.toLowerCase():
        return req.user.invitations
          .filter(inv => inv.status === InvitationStatusEnum.REJECTED)
          .map(({ from, status }) => ({ from, status }));
      default:
        throw new ApiError(400, "Invalid status of invitation as a request from the user");
    }
  };

  const usersByStatus = getUserInvitationsByStatus(invitationStatus);

  return res
    .status(200)
    .json(new ApiResponse(
      200,
      { usersByStatus },
      `Users with status ${status} fetched successfully`
    ));
});


const getMyInvitations = asyncHandler(async (req, res) => {
  
  const user = await User.findById(req.user?._id);

  if (!user)  {
    throw new ApiError(404, "User not found");
  }

  // check if user has any invitations
  if (!user.invitations || user.invitations.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No invitations found"));
  }

  // const invitations = user.invitations.filter(
  //   (inv) => inv.status !== InvitationStatusEnum.ACCEPTED
  // );

  const invitations = await Promise.all(
    user.invitations.map(async (invitation) => {
      const sender = await User.findById(invitation.from);
      if (!sender)  {
        throw new ApiError(404, "User not found");
      }
      return {
        _id: sender._id,
        avatar: sender.avatar,
        email: sender.email,
        username: sender.username,
        role: sender.role,
        invitationStatus: invitation.status,
      };
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, invitations, "Invitations fetched successfully"));

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


  // check if there's an existing invitation
  const existingInvitation = receiver.invitations.find(inv => inv.from.equals(req.user._id));
  if (!existingInvitation || existingInvitation.status !== InvitationStatusEnum.ACCEPTED) {
    throw new ApiError(400, "The receiver has not accepted your invitation");
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

  console.log(chat);

  if (chat.length)  {
    // if we find the chat, that means user already has created a chat with that receiver
    return res
      .status(200)
      .json(new ApiResponse(200, chat[0], "Chat retrieved successfully"));
  }

  // if not we need to create a new on on one chat
  // AND THIS SHOULD HAPPEN ONLY WHEN THE CONNECTED REQUEST IS ACCEPTED --> TODO
  const newChatInstance = await Chat.create({
    name: `Chat between ${req.user.username} and ${receiver.username}`,  // change name here to indicate the conversation between whom
    participants: [req.user._id, new mongoose.Types.ObjectId(receiverId)],  // add receiver and logged in user as participants
    admin: req.user._id,  // not really required for one-to-one chat, but just indicates who initiated the chat
  });

  // structure the chat as per the common aggregation to keep the consistency
  const createdChat = await Chat.aggregate([
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


const searchMessagesInChat = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { query } = req.query;

  if (!chatId || !query) {
    throw new ApiError(400, "Chat ID and search query are required");
  }

  // find messages that match the query in the specified chat
  const messages = await ChatMessage.find({
    chat: new mongoose.Types.ObjectId(chatId),
    content: { $regex: query },
  })
    .sort({ createdAt: -1 })
    .populate("sender", "username avatar email role");

  if (!messages.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, messages, "Messages fetched successfully"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, messages, "Messages fetched successfully"));
});


export {
  createOrGetAOneOnOneChat,
  deleteOneOnOneChat,
  getAllChats,
  searchAllAvailableUsers,
  sendInvitation,
  respondToInvitation,
  searchUsers,
  getMyInvitations,
  getUsersByStatus,
  searchMessagesInChat
}