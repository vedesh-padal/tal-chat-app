import mongoose, { Schema } from "mongoose";

const chatSchema = new Schema(
  {
    name: {
      type: String,
      required: true
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
    pariticipants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User"
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