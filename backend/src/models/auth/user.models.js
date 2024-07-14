import bcrypt from "bcrypt"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import mongoose, { Schema } from "mongoose"

import {
  AvailableUserRoles,
  AvailableSocialLogins,
  USER_TEMPORARY_TOKEN_EXPIRY,
  UserLoginType,
  UserRolesEnum
} from "../../../constants.js"

const userSchema = new Schema(
  {
    avatar: {
      type: {
        url: String,
        localPath: String,  // revisit here
      },
      default: {
        url: `https://via.placeholder.com/200x200.png`,
        localPath: "",
      }
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // ROLE can be used when it is some group chat (for future purpose)
    role: {
      type: String,
      enum: AvailableUserRoles,
      default: UserRolesEnum.USER,  // basically "USER", but just to avoid mistakes, REMOVE IF NOT NEEDED
      required: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    loginType: {
      type: String,
      enum: AvailableSocialLogins,
      default: UserLoginType.EMAIL_PASSWORD,
    },

    // not sure if the below ones will be needed  REVISIT
    // Fields for handling tokens and their expiry dates.
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },
    forgotPasswordToken: {
      type: String,
    },
    forgotPasswordExpiry: {
      type: Date,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationExpiry: {
      type: Date,
    },
  },
  { timestamps: true }  // Adds createdAt and updatedAt fields to the schema.
);


// Pre-save hook: Runs before saving a user document.
// Checks if the password field is modified: If not, proceeds to the next middleware.
// Hashes the password: If modified, hashes it using bcrypt with a salt round of 10.
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compares a given password with the hashed password stored in the database.
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Generates a JWT access token for the user.
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      role: this.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

// In case of token expired, Generates a JWT refresh token for the user.
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};


// try to write descriptions this way:
/**
 * @description Method responsible for generating tokens for email verification, password reset etc.
 */
userSchema.methods.generateTemporaryToken = function () {
  // This token should be client facing
  // for example: for email verification unHashedToken should go into the user's mail
  const unHashedToken = crypto.randomBytes(20).toString("hex");
  
  // Example: 93ace271c3c62f72c75a712937470e59dba2760f  

  // This should stay in the DB to compare at the time of verification
  const hashedToken = crypto
    .createHash("sha256")
    .update(unHashedToken)
    .digest("hex");
  // This is the expiry time for the token (20 minutes)
  const tokenExpiry = Date.now() + USER_TEMPORARY_TOKEN_EXPIRY;

  return { unHashedToken, hashedToken, tokenExpiry };
};

export const User = mongoose.model("User", userSchema);
