# One-to-One Chat Application API for TAL Chat

  The **One-to-One Chat Application** is a robust and feature-rich project designed to facilitate seamless real-time communication between users.

  This project provides a comprehensive API for essential functionalities such as user registration, real-time messaging, multimedia sharing, push notifications, user status tracking, and secure authentication.

  Key highlights of the One-to-One Chat Application include:

  1. **🔐 Secure Authentication:** Ensures user data privacy and secure access through robust authentication mechanisms using JWT, Cookie management, rate-limiting.

  2. **📨 Real-Time Messaging:** Supports instant communication between users using socket programming and real-time updates. Based on `socket.io` library.

  3. **📸 Multimedia Sharing:** Allows users to share images, and documents within chats.

  4. **📱 Push Notifications:** Keeps users informed about new messages and updates even when they are not actively using the app.  [ yet to be implemented ]
   
## Some other features include:
- **Connect**: Ability to send invitation, accept or reject inorder to establish chat.
- **Chat**: Chat with connected users.
- **Search functionality**: Search for specific messages or keywords within chats and also search users in the Chat application.
- **Profile Customization**: Set a profile photo and status message.
- **Message Status**: Message delivered (single tick) and read (double tick).


## Tech Stack and libraries used:
- **Backend**: Node.js and ExpressJS
- **Database**: MongoDB
- **Message communication**: socket.io
- **Swagger**: OpenAPI spec standard API documentation.
- **Data validation** using `zod`


# Project Setup 

### 1. Clone the repository
Clone the repository to your local machine.

```bash
git clone https://github.com/vedesh-padal/tal-chat-web.git
cd tal-chat-web
```

### 2. Choosing a Module

Since the project is now just ready with backend API support, the working directory is now `backend`. Change to the backend directory using `cd backend`.


### 3. Install Dependencies

```bash
npm install
```

### Instructions for `backend` directory:

1. Create a copy of `.env.sample` file and rename it to `.env`
2. Put the MongoDB connection URL (either from MongoDB Atlas, or local Docker setup MongoDB URL) in the `MONGODB_URI` key value in `.env` file.
3. Obtain a RESEND (mailing service provider) API key from [here](https://resend.com/api-keys), and put the API key into `RESEND_API_KEY` key value in `.env` file.
4. Feel free to change the `env` variables: `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` and others except `NODE_ENV` according to your usecase.

#### Starting the Backend service:
5. Run the following command to start the Backend:
    (assuming that you are in the `backend` directory)
      ```bash
      cd src
      npm start
      ```

- Once, the backend is started, head over to the `BACKEND_HOST_URL` URL that was given in `. env` file to take a look at the OpenAPI Spec (Swagger Docs).

- If you have not changed the `BACKEND_HOST_URL`, click on the following [link](http://localhost:8081) to access Swagger Docs of this project.

- Since the database is just created, you need to create users and perform other operations.
For that, please visit Swagger Docs at your backend URL to understand the routes and test the backend.