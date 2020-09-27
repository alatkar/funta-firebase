const functions = require("firebase-functions");
const app = require("express")();
const fireBaseAuth = require("./util/fireBaseAuth");

const cors = require('cors');
app.use(cors());

const { db } = require("./util/admin");

//APIs
const {
  getBark,
  getAllBarks,
  uploadBarkImage,
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
  getUserDetails,
  markNotificationsRead,
} = require("./handlers/users");
const {
  getPetProfile,
  postPetProfile,
  uploadProfileImage
} = require("./handlers/petProfile");
const {
  getBizProfile,
  postBizProfile
} = require("./handlers/bizProfile");

///// APIS /////

// Get Barks routes
app.get("/barks", getAllBarks);
app.post("/barks", fireBaseAuth, postBark);
app.post("/barks/image", fireBaseAuth, uploadBarkImage);
app.get("/barks/:barkId", getBark);
app.delete("/barks/:barkId", fireBaseAuth, deleteBark);

app.post("/barks/:barkId/comment", fireBaseAuth, commentOnBark);
app.get("/barks/:barkId/like", fireBaseAuth, likeBark); //Actually updates
app.get("/barks/:barkId/unlike", fireBaseAuth, unlikeBark); //Actually updates

// Users route
app.get("/user", fireBaseAuth, getAuthenticatedUser);
app.post("/signup", signupUser);
app.post("/login", loginUser);
app.post("/user/image", fireBaseAuth, uploadImage);
app.post("/user", fireBaseAuth, addUserDetails);
app.get("/user/:userName", getUserDetails);

app.post("/notifications", fireBaseAuth, markNotificationsRead);

// Pet Profile Route
app.get("/petprofile/:petProfileId", fireBaseAuth, getPetProfile);
app.post("/petprofile", fireBaseAuth, fireBaseAuth, postPetProfile);
app.post("/profile/image", fireBaseAuth, uploadProfileImage);
// app.get("/petprofile/:profileName", fireBaseAuth, getPetProfile); //Don't need this
//app.get("/petprofile/:userName/:profileName", getPetProfilePublic); //Public API
//app.delete("/petprofile/:profileName", fireBaseAuth, deletePetProfile);

// Biz Profile Route
app.get("/bizprofile/:bizProfileId", fireBaseAuth, getBizProfile);
app.post("/bizprofile", fireBaseAuth, postBizProfile);



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
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.deleteNotificationOnUnLike = functions.firestore
  .document("likes/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.createNotificationOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/barks/${snapshot.data().barkId}`)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().userName !== snapshot.data().userName) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userName,
            sender: snapshot.data().userName,
            type: "comment",
            read: false,
            barkId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

/* 
We don't need this.
We were putting user imgae as Bark image. If user image is changed. This function will change image Url in all barks.

exports.onUserImageChange = functions.firestore
  .document("/users/{userId}")
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("image has changed");
      const batch = db.batch();
      return db
        .collection("barks")
        .where("userName", "==", change.before.data().userName)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const bark = db.doc(`/barks/${doc.id}`);
            batch.update(bark, { imageUrl: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });
*/

exports.onBarkDelete = functions
  //.region("europe-west1")
  .firestore.document("/barks/{barkId}")
  .onDelete((snapshot, context) => {
    const barkId = context.params.barkId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("barkId", "==", barkId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection("likes").where("barkId", "==", barkId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("barkId", "==", barkId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => console.error(err));
  });
