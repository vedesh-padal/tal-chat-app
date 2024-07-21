import cookieParser from "cookie-parser";
import cors from "cors"
import express from "express"
import { rateLimit } from "express-rate-limit";
// import session from "express-session";

import { createServer } from "http";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import YAML from "yaml";

import requestIp from "request-ip";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";

import { DB_NAME } from "./constants.js";
import { dbInstance } from "./db/index.js";
import { initializeSocketIO } from "./socket/index.js"; // yet to complete implementation

import { ApiError } from "./utils/ApiError.js"
import { ApiResponse } from "./utils/ApiResponse.js"


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = fs.readFileSync(path.resolve(__dirname, "./swagger.yaml"), "utf8");
const swaggerDocument = YAML.parse(
  file?.replace(
    "url: ${{server}}",
    `url: ${process.env.BACKEND_HOST_URL || "http://localhost:8081"}/api/v1`
  )
);

const app = express();

const httpServer = createServer(app);

// socket.io server
/* the pingTimeout setting in Socket.IO controls the amount of time the
 * server will wait for a client's response to a "ping" request before 
 * disconnecting the client due to a timeout. The default value has changed 
 * over time, but 60000 milliseconds (60 seconds) was commonly 
 * used in earlier versions of Socket.IO.
*/

const io = new Server(httpServer, {
  pingTimeout: 60000,
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,   // to allow the server to send and receive cookies with cross-origin requests
  }
});

// This allows you to access the Socket.IO instance from any part of your Express application by calling req.app.get("io").
// Using set and get methods avoids the need to use global variables to share the Socket.IO instance.
// using set method to mount the `io` instance on the app to avoid usage of `global`
app.set("io", io);

// global middlewares
app.use(
  cors({
    origin:
      process.env.CORS_ORIGIN === "*"
        ? "*" // This might give CORS error for some origins due to credentials set to true
        : process.env.CORS_ORIGIN?.split(","), // For multiple cors origin for production. Refer https://github.com/hiteshchoudhary/apihub/blob/a846abd7a0795054f48c7eb3e71f3af36478fa96/.env.sample#L12C1-L12C12
    credentials: true,
  })
);

app.use(requestIp.mw());  // to obtain the client's IP and attach it to req.clientIp

// rate limiter to avoid misuse of service and avoid cost spikes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000,  // limiting each IP for 5000 requests
  standardHeaders: true,  // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req, res) => {
    return req.clientIp;
  },
  handler: (_, __, ___, options) => {
    throw new ApiError(
      options.statusCode || 500,
      `There are too many requests. You are only allowed ${
        options.max
      } requests per ${options.windowMs / 60000} minutes` 
    );
  }
});

// apply rate limiting middleware to all requests
app.use(limiter);

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));  // to configure static file to save images, pdfs locally
app.use(cookieParser());

// required for passport
// app.use(
//   session({
//     secret: process.env.EXPRESS_SESSION_SECRET,
//     resave: true,
//     saveUninitialized: true,
//   })
// );

// // DOUBTFUL  
// // passport session management if needed 
// app.use(passport.initialize());
// app.use(passport.session());

// api routes
import { errorHandler } from "./middlewares/error.middlewares.js"
import healthcheckRouter from "./routes/healcheck.routes.js"

import userRouter from "./routes/auth/user.routes.js";
import chatRouter from "./routes/chat.routes.js"
import messageRouter from "./routes/message.routes.js";



// healthcheck
app.use("/api/v1/healthcheck", healthcheckRouter);

app.use("/api/v1/users", userRouter);

app.use("/api/v1/chats", chatRouter);
app.use("/api/v1/messages", messageRouter);


initializeSocketIO(io);


// API DOCS
app.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    swaggerOptions: {
      docExpansion: "none", // to keep all the sections collapsed by default
    },
    customSiteTitle: "One-to-one Chat Application API Docs"
  })
);


app.use(errorHandler);

export { httpServer };