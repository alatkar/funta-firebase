const functions = require("firebase-functions");
const app = require("express")();
const fireBaseAuth = require("./util/fireBaseAuth");
const { db } = require("./util/admin");

//APIs
const {
  getBark,
  getAllBarks,
  postBark,
  deleteBark,
  commentOnBark,
  likeBark,
  unlikeBark,
} = require("./handlers/barks");
const {
  loginUser,
  signupUser,
  getAuthenticatedUser,
  uploadImage,
  addUserDetails,
} = require("./handlers/users");

///// APIS /////

// Get Barks routes
app.get("/barks", getAllBarks);
app.post("/barks", fireBaseAuth, postBark);
app.get("/barks/:barkId", deleteBark);
app.delete("/barks/:barkId", fireBaseAuth, postBark);

app.post("/barks/:barkId/comment", fireBaseAuth, commentOnBark);
app.get("/barks/:barkId/like", fireBaseAuth, likeBark); //Actually updates
app.get("/barks/:barkId/unlike", fireBaseAuth, unlikeBark); //Actually updates

// Users route
app.get("/user", fireBaseAuth, getAuthenticatedUser);
app.post("/signup", signupUser);
app.post("/login", loginUser);
app.post("/user/image", fireBaseAuth, uploadImage);
app.post("/user", fireBaseAuth, addUserDetails);

// Export Route starting with api as /api/barks
exports.api = functions.https.onRequest(app);

// Notifications
exports.createNotificationOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate((snapshot) => {
    console.log("Notification received for creating like ", snapshot);
    return db
      .doc(`/barks/${snapshot.data().barkId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().userName !== snapshot.data().userName) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userName,
            sender: snapshot.data().userName,
            type: "like",
            read: false,
            barkId: doc.id,
          });
        }
      })
      .then(() => {
        return;
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.deleteNotificationOnUnLike = functions
  .firestore.document("likes/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.createNotificationOnComment = functions
  .firestore.document("comments/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/barks/${snapshot.data().barkId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userName !== snapshot.data().userName
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userName,
            sender: snapshot.data().userName,
            type: "comment",
            read: false,
            screamId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });
