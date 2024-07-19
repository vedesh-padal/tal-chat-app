import mongoose, { Schema } from "mongoose";

// support to other types of files like docx or pdf
const chatMessageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    content: {
      type: String
    },
    attachments: {
      type: [
        {
          url: String,
          localPath: String
        },
      ],
      default: [],
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
    },
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: [],
      }
    ],
  },
  { timestamps: true }
);

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);