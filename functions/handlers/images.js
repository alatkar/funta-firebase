const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");
const storage = require("firebase/storage");

// Upload image for profile, bark, user, news, resource etc
exports.uploadImage = (req, res) => {
  if (!req.params.imageType) {
    return res
      .status(400)
      .json({ error: "Please provide image type to be uploaded" });
  }

  if (
    req.params.imageType !== "bark" &&
    req.params.imageType !== "user" &&
    req.params.imageType !== "profile" &&
    req.params.imageType !== "product" &&
    req.params.imageType !== "news" &&
    req.params.imageType !== "resource"
  ) {
    return res
    .status(400)
    .json({ error: `Unsupported image type ${req.params.imageType}` });
  }

  console.log("Uploading image for:", req);
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;
  // TODO: String for image token
  //let generatedToken = uuid();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${req.user.userName}-${req.params.imageType}-${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket(config.storageBucket)
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            //firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })      
      .then(() => {
        console.log(
          `Uploading ${req.params.imageType} image for user: ${req.user}`
        );
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        console.log(
          `Uploaded ${req.params.imageType} image for user: ${req.user} as ${imageUrl}`
        );
        res.json(imageUrl);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};
