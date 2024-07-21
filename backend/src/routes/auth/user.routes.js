import { Router } from "express";
// import passport from "passport";   // for Social / OAuth Logins in future
import { UserRolesEnum } from "../../constants.js";

import {
  assignRole,
  changeCurrentPassword,
  forgotPasswordRequest,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  resendEmailVerification,
  resetForgottenPassword,
  updateUserProfile,
  verifyEmail,
} from "../../controllers/auth/user.controllers.js";


// validation imports
import {
  userAssignRoleSchema,
  userChangeCurrentPasswordSchema,
  userForgotPasswordSchema,
  userLoginSchema,
  userRegisterSchema,
  userResetForgottenPasswordSchema
} from "../../validators/auth/user.validators.js"
import { validate_params, validate_body } from "../../validators/validate.js";

// multer middleware, mongodb validator
import {
  verifyJWT,
  verifyPermission
} from "../../middlewares/auth.middlewares.js"

import { uploadAvatar } from "../../middlewares/multer.middleware.js";

// import passport/index.js for OAuth related logic [ if OAuth is needed ]

// mongoIdPathVariableValidator import for changing the User role
import { mongoIdPathVariableSchema } from "../../validators/mongodb.validators.js";



const router = Router();

// unsecure routes
router.route("/register").post(validate_body(userRegisterSchema), registerUser);
router.route("/login").post(validate_body(userLoginSchema), loginUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/verify-email/:verificationToken").get(verifyEmail);

router
  .route("/forgot-password")
  .post(validate_body(userForgotPasswordSchema), forgotPasswordRequest);

router
  .route("/reset-password/:resetToken")
  .post(
    validate_body(userResetForgottenPasswordSchema),
    resetForgottenPassword
  );

// secure routes
router.route("/logout").post(verifyJWT, logoutUser);

// optional  --> REMOVE LATER, if need be
router.route("/current-user").get(verifyJWT, getCurrentUser);

router
  .route("/profile")
  .patch(verifyJWT, uploadAvatar.single("avatar"), updateUserProfile);

router
  .route("/change-password")
  .post(
    verifyJWT,
    validate_body(userChangeCurrentPasswordSchema),
    changeCurrentPassword
  );

router
  .route("/resend-email-verification")
  .post(verifyJWT, resendEmailVerification);

// REVISIT THIS ROUTE - HIGHLY SUSPICIOUS ABOUT ITS WORKING
router
  .route("/assign-role/:userId")
  .post(
    verifyJWT,
    verifyPermission([UserRolesEnum.ADMIN]),  // good one
    validate_params(mongoIdPathVariableSchema("userId")),
    validate_body(userAssignRoleSchema),
    assignRole
  )


// OAuth end-points if needed in future


export default router;