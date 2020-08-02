const { db } = require("../util/admin");

exports.getAllBarks = (req, res) => {
  db.collection("barks")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let barks = [];
      data.forEach((element) => {
        // TODO: Use spread syntax if it is allowed
        barks.push({
          barkId: element.id,
          message: element.data().message,
          userName: element.data().userName,
          userId: element.data().userId,
          createdAt: element.data().createdAt,
        });
      });
      return res.json(barks);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.postBark = (req, res) => {
  console.log("Body ", req.body);

  //if (req.body.body.trim() === '') // Doesn't work
  if (req.body.message.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newBark = {
    message: req.body.message,
    userName: req.user.userName,
    imageUrl: req.user.imageUrl,
    userId: req.user.userId,
    //createdAt: admin.firestore.Timestamp.fromDate(new Date())
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  };

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
  if (req.body.comment.trim() === "")
    return res.status(400).json({ comment: "Must not be empty" });

  const newComment = {
    comment: req.body.comment,
    createdAt: new Date().toISOString(),
    barkId: req.params.barkId,
    userName: req.user.userName,
    userImage: req.user.imageUrl,
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