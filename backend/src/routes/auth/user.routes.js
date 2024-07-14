import { Router } from "express";
// import passport from "passport";
import { UserRolesEnum } from "../../../constants";

// validation imports
import {
  userAssignRoleSchema,
  userChangeCurrentPasswordSchema,
  userForgotPasswordSchema,
  userLoginSchema,
  userRegisterSchema,
  userResetForgottenPasswordSchema
} from "../../validators/auth/user.validators.js"
import { validate } from "../../validators/validate.js";

// multer middleware, mongodb validator
import {
  verifyJWT,
  verifyPermission
} from "../../middlewares/auth.middlewares.js"
// import passport/index.js for OAuth related logic [ if OAuth is needed ]


const router = Router();


// unsecure routes
