import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100, // example: limit chat name length
    },
    // including this as it may be useful in future
    isGroupChat: {
      type: Boolean,
      default: false
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "ChatMessage"
    },
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      }
    ],
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
  },
  { timestamps: true }
);

export const Chat = mongoose.model("Chat", chatSchema);