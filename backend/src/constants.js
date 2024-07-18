export const DB_NAME = "talchatapp";

export const UserRolesEnum = {
  ADMIN: "ADMIN",
  USER: "USER"
};

export const InvitationStatusEnum = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  NONE: "NONE"
};

export const InvitationStatuses = Object.values(InvitationStatusEnum);

export const AvailableUserRoles = Object.values(UserRolesEnum);

export const USER_TEMPORARY_TOKEN_EXPIRY = 20 * 60 * 1000; // 20 minutes

export const UserLoginType = {
  GOOGLE: "GOOGLE",
  EMAIL_PASSWORD: "EMAIL_PASSWORD",
};

export const AvailableSocialLogins = Object.values(UserLoginType);

/**
 * @description set of events that we are using in chat app. more to be added as more features are added
 */
export const ChatEventEnum = Object.freeze({
  // once user is ready to go
  CONNECTED_EVENT: "connected",
  // when user gets disconnected
  DISCONNECTED_EVENT: "disconnect",
  // when user joins a socket room
  JOIN_CHAT_EVENT: "joinChat",
  // when participant gets removed from group, chat gets deleted or leaves a group
  LEAVE_CHAT_EVENT: "leaveChat",
  // when admin updates a group name
  UPDATE_GROUP_NAME_EVENT: "updateGroupName",
  // when new message is received
  MESSAGE_RECEIVED_EVENT: "messageReceived",
  // when there is new one on one chat, new group chat or user gets added in thr group
  NEW_CHAT_EVENT: "newChat",
  // when there is an error in socket
  SOCKET_ERROR_EVENT: "socketError",
  // when participant starts typing
  TYPING_EVENT: "typing",
  // when participant stops typing
  STOP_TYPING_EVENT: "stopTyping",
  // when message is deleted
  MESSAGE_DELETE_EVENT: "messageDeleted"
})

export const AvailableChatEvents = Object.values(ChatEventEnum);