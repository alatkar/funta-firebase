const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");
const { getUserImageUrl} = require("./users");

exports.getAllBarks = (req, res) => {
  let barks = [];
  db.collection("barks")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      data.forEach((element) => {
        // TODO: Use spread syntax if it is allowed
        barks.push({
          barkCategory: element.data().subject,
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
          // TODO: userImageUrl Passing same image as user image. Need to do DB join
          // Also we are going to have multiple images to post. In this case this
          // code should return first image
          userImageUrl: element.data().imageUrl,          
          userName: element.data().userName,
        });
      });      
      return barks;
    })
    .then((data) => {
      let imgUrls = [];      
      const unique = [...new Set(data.map(item => item.userName))];
      console.log("Unique users in Barks :", unique);         
      return imgUrls;
    })
    .then((data) => {
      // TODO: Need to figure out Async code as function is returning before user Images are retrieved
      //data.forEach((elem) => {
      //  console.log("Got image uri: ", elem);
      //});
      return res.json(barks);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
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
        res.json(imageUrl);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};

exports.postBark = (req, res) => {
  console.log("Body ", req.body);

  //if (req.body.body.trim() === '') // Doesn't work
  if (req.body.message.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newBark = {
    commentCount: 0,
    //createdAt: admin.firestore.Timestamp.fromDate(new Date())
    createdAt: new Date().toISOString(),
    imageUrl: req.body.imageUrl,
    likeCount: 0,
    message: req.body.message,
    userId: req.user.userId,
    userName: req.user.userName,
  };
  
  // Sanitize Bark Type
  let value = req.body.barkCategory ? req.body.barkCategory.toUpperCase() : enumDefinations.barkCategory.GENERAL;
  switch(value)
  {
    case enumDefinations.barkCategory.BUYSELL:
    case enumDefinations.barkCategory.GENERAL:
    case enumDefinations.barkCategory.LOSTANDFOUND:
    case enumDefinations.barkCategory.QUESTION:   
    case enumDefinations.barkCategory.RECOMMENDATION:    
      newBark.barkCategory = value;
      break;
    default:
      console.log("Bark Type ", value, " is incorrect for user ", newBark.userName, " Setting barkCategory as ", enumDefinations.barkCategory.GENERAL);
      newBark.barkCategory =   enumDefinations.barkCategory.GENERAL;
  }

  // Sanitize other fields
  if(req.body.eventDate)  // Can be Event Place
  {
    newBark.eventDate = req.body.eventDate;
  }
  if(req.body.hashTag)
  {
    newBark.hashTag = req.body.hashTag;
  }
  if(newBark.imageUrl && !Array.isArray(newBark.imageUrl))
  {
    return res.status(400).json({ body: "imageUrl must be an array" });
  }
  if(req.body.place) // Can be Event Place
  {
    newBark.place = req.body.place;
  }
  if(req.body.price && newBark.barkCategory === enumDefinations.barkCategory.BUYSELL) // This is for Buy Sell
  {
    newBark.price = req.body.price;
  }  
  if(req.body.subject)
  {
    newBark.subject = req.body.subject;
  }
 
  console.log("Creating bark ", newBark);

  db.collection("barks")
    .add(newBark)
    .then((doc) => {
      const resBark = newBark;
      resBark.barkId = doc.id;
      res.json(resBark);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: `Something went wrong ${err.message}` });
    });
};

exports.getBark = (req, res) => {
  let barkData = {};

  db.doc(`/barks/${req.params.barkId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Bark not found" });
      }
      barkData = doc.data();
      barkData.barkId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc") //fails with Index error
        .where("barkId", "==", req.params.barkId)
        .get();
    })
    .then((data) => {
      barkData.comments = [];
      data.forEach((doc) => {
        barkData.comments.push(doc.data());
      });
      return res.json(barkData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ errorCode: err.code, errordetails: err.details });
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
        return res.status(404).json({ error: "Bark not found" });
      }
      return doc.ref.update({commentCount: doc.data().commentCount + 1})
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then((data) => {
      newComment.commentId = data.id;
      res.json(newComment);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ errorCode: err.code, errordetails: err.details });
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
        return res.status(404).json({ error: "Bark not found" });
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
            return res.json(barkData);
          });
      } else {
        return res.status(400).json({ error: "Bark already liked" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
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
        return res.status(404).json({ error: "Bark not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: "Bark not liked" });
      } else {
        console.log('Liked Doc: ', data.docs[0], data.docs[0].id)
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            // Explaination at time 3:08:14
            barkData.likeCount--;
            return barkDocument.update({ likeCount: barkData.likeCount });
          })
          .then(() => {
            return res.json(barkData);
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
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
        return res.status(404).json({ error: 'Bark not found' });
      }
      if (doc.data().userName !== req.user.userName) {
        return res.status(403).json({ error: "Unauthorized. Can not delete other user's bark" });
      } else {
        // TODO: ALso delete likes.
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: 'Bark deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};