import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // this storage needs public/images folder in the root directory
    // else it will throw an error saying cannot find path `pulbic/images`
    cb(null, "./public/images");
  },

  // store the file in respective format instead of binary
  filename: function (req, file, cb) {
    let fileExtension = "";
    if (file.originalname.split(".").length > 1)  {
      fileExtension = file.originalname.substring(
        file.originalname.lastIndexOf(".")
      );
    }
    const filenameWithoutExtension = file.originalname
      .toLowerCase()
      .split(" ")
      .join("-")
      ?.split(".")[0];
    
    cb(
      null,
      filenameWithoutExtension +
        Date.now() +
        Math.ceil(Math.random() * 1e5) + // to avoid rare name conflict
        fileExtension
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  // .docx
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, "Invalid file type. Only images and documents are allowed."), false);
  }
};

// Middleware responsible to read form data and uplaod the File object to the mentioned path
export const uploadAttachment = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1000 * 1000,
  },
});

// Middleware responsible to read form data and uplaod the File object to the mentioned path
export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1 * 1000 * 1000,
  },
});