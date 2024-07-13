import cookieParser from "cookie-parser";
import cors from "cors"
import express from "express"
import { rateLimit } from "express-rate-limit";
import session from "express-session";

import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import { DB_NAME } from "../constants.js";
import { dbInstance } from "./db/index.js";
import { initializeSocketIO } from "./socket/index.js"; // yet to complete implementation

import { ApiError } from "./utils/ApiError.js"
import { ApiResponse } from "./utils/ApiResponse.js"
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// read somewhere that swagger should be initialized here
// TODO

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
    credentials: true
  }
});

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

// This middleware function is responsible for retrieving the client's IP address from the incoming HTTP request and attaching it to the req object.
app.use(requestIp.mw());

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
app.use(express.static("public"));  // to configure static file to save images locally
app.use(cookieParser());

// required for passport
app.use(
  session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
  })
);

// session secret
app.use(passport.initialize());

// api routes
import { errorHandler } from "./middlewares/error.middlewares.js"
import healthcheckRouter from "./routes/healcheck.routes.js"

