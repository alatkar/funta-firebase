const { admin, db } = require("../util/admin");
const config = require("../util/config");

// Patch a comment
exports.patchComment = (req, res) => {
  console.log(
    `Patching Comment. Body: ${Object.keys(req.body)} Comment ${
      req.params.commentId
    }`
  );
  const document = db.doc(`/comments/${req.params.commentId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Comment not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res.status(403).json({
          error: "Unauthorized. Can not update other user's comment",
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
        if (!doc.data().hasOwnProperty(key)) {
          // Return causing error
          return res
            .status(404)
            .json({ error: `Comment property ${key} not found` });
        }
        if (value != null && value !== "") {
          fields[key] = value;
        }
      }
      return doc.ref.update(fields);
    })
    .then(() => {
      res.json(`Comment ${req.params.commentId} updated successfully`);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Delete a comment
exports.deleteComment = (req, res) => {
  console.log(`Deleting comment: ${req.params.commentId}`);
  const document = db.doc(`/comments/${req.params.commentId}`);
  let commentDoc = {};
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Comment not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res
          .status(403)
          .json({ error: "Unauthorized. Can not delete other user's comment" });
      } else {
        return db
          .doc(`/barks/${doc.data().barkId}`)
          .get()
          .then((barkDoc) => {
            if (!barkDoc.exists) {
              return res.status(404).json({ error: "Bark not found" });
            }
            return barkDoc.ref.update({
              commentCount: barkDoc.data().commentCount - 1,
            });
          });
      }
    })
    .then((barkDoc) => {
      return document.delete();
    })
    .then(() => {
      res.json({ message: "Comment deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
