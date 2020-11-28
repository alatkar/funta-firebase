const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");
const { getUserImageUrl } = require("./users");

exports.getAllBarks = (req, res) => {
  let lastVisible = "";

  let query = db.collection("barks").orderBy("createdAt", "desc");

  if (req.query.filter) {
    let arr = req.query.filter.split(",");
    query = query.where("barkCategory", "in", arr);
  }
  if (req.query.lastVisible) {
    lastVisible = req.query.lastVisible;
    query = query.startAfter(req.query.lastVisible);
  }

  //query = query.where('category', 'in', ['RECOMMENDATION']);

  query = query.limit(15);

  let barks = [];
  query
    .get()
    .then((data) => {
      if (data.docs.length == 0) return barks;

      lastVisible = data.docs[data.docs.length - 1].data().createdAt;
      data.forEach((element) => {
        // TODO: Use spread syntax if it is allowed
        let barkCat = "GENERAL";
        if (element.data().barkCategory) {
          barkCat = element.data().barkCategory;
        }

        barks.push({
          barkCategory: barkCat,
          barkId: element.id,
          commentCount: element.data().commentCount,
          createdAt: element.data().createdAt,
          eventDate: element.data().eventDate,
          hashTag: element.data().hashTag,
          // TODO: imageUrl Check if it is array and send as it is
          // If it is string, covert to array
          imageUrl: element.data().imageUrl,
          likeCount: element.data().likeCount,
          message: element.data().message,
          price: element.data().price,
          place: element.data().place,
          subject: element.data().subject,
          userId: element.data().userId,
          //userImageUrl: element.data().imageUrl,    // This is populated at the bottom
          userName: element.data().userName,
        });
      });
      return barks;
    })
    .then((data) => {
      let imgUrls = [];
      const unique = [...new Set(data.map((item) => item.userName))];
      console.log("Unique users in Barks :", unique);
      return Promise.all(
        unique.map((userId) => {
          return getUserImageUrl(userId);
        })
      );
    })
    .then((data) => {
      // Create Map of userName to userImages
      let map = [];
      data.forEach((elem) => {
        map[elem.data().userName] = elem.data().imageUrl;
        console.log("Got image uri: ", elem.data().imageUrl);
      });
      barks.forEach((bark) => {
        if (map[bark.userName]) {
          bark.userImageUrl = map[bark.userName];
        }
      });
      if (barks.length == 0) return res.json({ response: { barks } });

      return res.json({ response: { barks, lastVisible: lastVisible } });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Upload a profile image for user
exports.uploadBarkImage = (req, res) => {
  console.log("Uploading image for bark:", req);
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
    imageFileName = `${req.user.userName}-bark-${Math.round(
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
        console.log("Uploading image for user:", req.user);
        // Append token to url
        //const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        console.log("Uploaded bark image: ", imageUrl);
        res.json({ response: imageUrl });
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ message: `${err}` });
      });
  });
  busboy.end(req.rawBody);
};

exports.postBark = (req, res) => {
  console.log("Body ", req.body);

  //if (req.body.body.trim() === '') // Doesn't work
  if (req.body.message.trim() === "") {
    return res.status(400).json({ message: "Body must not be empty" });
  }

  const newBark = {
    commentCount: 0,
    //createdAt: admin.firestore.Timestamp.fromDate(new Date())
    createdAt: new Date().toISOString(),
    likeCount: 0,
    message: req.body.message,
    userId: req.user.userId,
    userName: req.user.userName,
  };

  // imageUrl is optional
  if (req.body.imageUrl) {
    newBark.imageUrl = req.body.imageUrl;
  }

  // Sanitize Bark Type
  let value = req.body.barkCategory
    ? req.body.barkCategory.toUpperCase()
    : enumDefinations.barkCategory.GENERAL;
  switch (value) {
    case enumDefinations.barkCategory.BUYSELL:
    case enumDefinations.barkCategory.GENERAL:
    case enumDefinations.barkCategory.LOSTANDFOUND:
    case enumDefinations.barkCategory.QUESTION:
    case enumDefinations.barkCategory.RECOMMENDATION:
    case enumDefinations.barkCategory.EVENT:
      newBark.barkCategory = value;
      break;
    default:
      console.log(
        "Bark Type ",
        value,
        " is incorrect for user ",
        newBark.userName,
        " Setting barkCategory as ",
        enumDefinations.barkCategory.GENERAL
      );
      newBark.barkCategory = enumDefinations.barkCategory.GENERAL;
  }

  // Sanitize other fields
  if (req.body.eventDate) {
    // Can be Event Place
    newBark.eventDate = req.body.eventDate;
  }
  if (req.body.hashTag) {
    newBark.hashTag = req.body.hashTag;
  }
  if (newBark.imageUrl && !Array.isArray(newBark.imageUrl)) {
    return res.status(400).json({ message: "imageUrl must be an array" });
  }
  if (req.body.place) {
    // Can be Event Place
    newBark.place = req.body.place;
  }
  if (
    req.body.price &&
    newBark.barkCategory === enumDefinations.barkCategory.BUYSELL
  ) {
    // This is for Buy Sell
    newBark.price = req.body.price;
  }
  if (req.body.subject) {
    newBark.subject = req.body.subject;
  }

  console.log("Creating bark ", newBark);

  db.collection("barks")
    .add(newBark)
    .then((doc) => {
      const resBark = newBark;
      resBark.barkId = doc.id;
      res.json({ response: resBark });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.getBark = (req, res) => {
  let barkData = {};

  db.doc(`/barks/${req.params.barkId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Bark not found" });
      }
      barkData = doc.data();
      barkData.barkId = doc.id;
      let barkCat = "GENERAL";
      if (barkData.barkCategory) {
        barkCat = barkData.barkCategory;
      }
      barkData.barkCategory = barkCat;

      return db
        .collection("comments")
        .orderBy("createdAt", "desc") //fails with Index error
        .where("barkId", "==", req.params.barkId)
        .get();
    })
    .then((data) => {
      barkData.comments = [];
      data.forEach((doc) => {
        let commentToPush = doc.data();
        commentToPush.commentId = doc.id;
        barkData.comments.push(commentToPush);
      });
      return getUserImageUrl(barkData.userName);
    })
    .then((data) => {
      if (data) {
        barkData.userImageUrl = data.data().imageUrl;
      }
      return res.json({ response: barkData });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Comment on Bark
exports.commentOnBark = (req, res) => {
  console.log("Body ", req.body);
  if (req.body.message.trim() === "")
    return res.status(400).json({ message: "Must not be empty" });

  const newComment = {
    message: req.body.message,
    createdAt: new Date().toISOString(),
    barkId: req.params.barkId,
    userName: req.user.userName,
    imageUrl: req.user.imageUrl,
  };
  console.log(newComment);

  db.doc(`/barks/${req.params.barkId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Bark not found" });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then((data) => {
      newComment.commentId = data.id;
      res.json({ response: newComment });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Like a bark
exports.likeBark = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userName", "==", req.user.userName)
    .where("barkId", "==", req.params.barkId)
    .limit(1);

  const barkDocument = db.doc(`/barks/${req.params.barkId}`);

  let barkData = {};

  barkDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        barkData = doc.data();
        barkData.barkId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ message: "Bark not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            barkId: req.params.barkId,
            userName: req.user.userName,
          })
          .then(() => {
            // Explaination at time 3:08:14
            barkData.likeCount++;
            return barkDocument.update({ likeCount: barkData.likeCount });
          })
          .then(() => {
            return res.json({ response: barkData });
          });
      } else {
        return res.status(400).json({ message: "Bark already liked" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// UnLike a bark
exports.unlikeBark = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userName", "==", req.user.userName)
    .where("barkId", "==", req.params.barkId)
    .limit(1);

  const barkDocument = db.doc(`/barks/${req.params.barkId}`);

  let barkData = {};

  barkDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        barkData = doc.data();
        barkData.barkId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ message: "Bark not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ message: "Bark not liked" });
      } else {
        console.log("Liked Doc: ", data.docs[0], data.docs[0].id);
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            // Explaination at time 3:08:14
            barkData.likeCount--;
            return barkDocument.update({ likeCount: barkData.likeCount });
          })
          .then(() => {
            return res.json({ response: barkData });
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Patch a bark
exports.patchBark = (req, res) => {
  console.log(
    `Patching Bark. Body: ${Object.keys(req.body)} Bark ${req.params.barkId}`
  );
  const document = db.doc(`/barks/${req.params.barkId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Bark not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res.status(403).json({
          message: "Unauthorized. Can not update other user's Bark",
        });
      } else {
        return doc;
      }
    })
    .then((doc) => {
      console.log("Doc data: ", doc.data());
      // TODO: Validating if fields exist. We might need to allow to enter fields

      var fields = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (key === "imageUrl") {
          if (!Array.isArray(value)) {
            return res
              .status(400)
              .json({ message: "imageUrl must be an array" });
          }
          //Allow imageUrl to be inserted if not present
          //continue;
        }
        /*if (!doc.data().hasOwnProperty(key)) {
          // TODO: Return causing error
          return res
            .status(404)
            .json({ error: `Bark property ${key} not found` });
        }*/
        if (value != null && value !== "") {
          fields[key] = value;
        }
      }
      return doc.ref.update(fields);
    })
    .then(() => {
      res.json({ message: `Bark ${req.params.barkId} updated successfully` });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Delete a bark
exports.deleteBark = (req, res) => {
  console.log(`Deleting bark: ${req.params.barkId}`);
  const document = db.doc(`/barks/${req.params.barkId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Bark not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res
          .status(403)
          .json({ message: "Unauthorized. Can not delete other user's bark" });
      } else {
        // TODO: ALso delete likes.
        // TODO: Also delete comments
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Bark deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};
