const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");
const storage = require("firebase/storage");

// Upload image for profile, bark, user, news, resource etc
// Store images in user folder with sub folder as per image tupe
exports.uploadImage = (req, res) => {
  if (!req.params.imageType) {
    return res
      .status(400)
      .json({ message: "Please provide image type to be uploaded" });
  }

  if (
    req.params.imageType !== "bark" &&
    req.params.imageType !== "user" &&
    req.params.imageType !== "profile" &&
    req.params.imageType !== "product" &&
    req.params.imageType !== "service" &&
    req.params.imageType !== "news" &&
    req.params.imageType !== "resource" &&
    req.params.imageType !== "group"
  ) {
    return res
    .status(400)
    .json({ message: `Unsupported image type ${req.params.imageType}` });
  }

  //console.log("Uploading image for:", req);
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
      return res.status(400).json({ message: "Wrong file type submitted" });
    }
    // File nameing algo: using date time ticks (Earlier random math)
    const imageExtension = filename.split(".")[filename.split(".").length - 1].toLowerCase();
    //imageFileName = `${req.user.userName}-${req.params.imageType}-${Math.round(
    //  Math.random() * 1000000000000
    //).toString()}.${imageExtension}`;
    
    imageFileName = `${Math.round(
      new Date().getTime()
    ).toString()}.${imageExtension}`;

    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));    
  });
  busboy.on("finish", () => {
  
    let destination = `${req.user.userName}/${req.params.imageType}/${imageFileName}`;
    admin
      .storage()
      .bucket(config.storageBucket)
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl. Check which format works
            //firebaseStorageDownloadTokens: generatedToken,
            //metadata: {
            //  firebaseStorageDownloadTokens: uuid
            //}
          },          
        },
        destination: destination
      })   
      .then((imageObj) => {
        let fileName = encodeURIComponent(imageObj[0].name);
        console.log(
          `Uploading ${req.params.imageType} image for user: ${req.user}`
        );
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${fileName}?alt=media`;
        console.log(
          `Uploaded ${req.params.imageType} image for user: ${req.user} as ${imageUrl}`
        );
        res.json({response: imageUrl});
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ message: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};
