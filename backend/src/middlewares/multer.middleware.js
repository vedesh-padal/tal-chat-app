import multer from "multer";

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

// Middleware responsible to read form data and uplaod the File object to the mentioned path
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1000 * 1000,
  },
});