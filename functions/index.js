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
  patchBark,
  deleteBark,
  commentOnBark,
  likeBark,
  unlikeBark,
} = require("./handlers/barks");
const {
  patchComment,
  deleteComment
} = require("./handlers/comments");
const {
  loginUser,
  signupUser,
  getAuthenticatedUser,
  uploadUserImage,
  addUserDetails,
  getUserDetails,
  markNotificationsRead,
} = require("./handlers/users");
const {
  getPetProfile,
  patchPetProfile,
  postPetProfile,
  uploadProfileImage,
  deletePetProfile
} = require("./handlers/petProfile");
const {
  getBizProfile,
  patchBizProfile,
  postBizProfile,
  deleteBizProfile
} = require("./handlers/bizProfile");
const {
  getBizProduct,
  patchBizProduct,
  postBizProduct,
  uploadProductImage,
  deleteBizProduct
} = require("./handlers/bizProduct");
const {
  getAllNews,
  getNews,
  postNews,
  patchNews,
  deleteNews
} = require("./handlers/news");
const {
  getAllResources,
  getResource,
  postResource,
  patchResource,
  deleteResource
} = require("./handlers/resources");

const {
  uploadImage
} = require("./handlers/images");


const {
  getPersonalPetProfile,
  getPersonalProducts,
  getPersonalServices
} = require("./handlers/personalization");

///// APIS /////

// Get Barks routes
app.get("/barks", getAllBarks);
app.post("/barks", fireBaseAuth, postBark);
app.post("/barks/image", fireBaseAuth, uploadBarkImage);
app.patch("/barks/:barkId", fireBaseAuth, patchBark);
app.get("/barks/:barkId", getBark);
app.delete("/barks/:barkId", fireBaseAuth, deleteBark);

app.post("/barks/:barkId/comment", fireBaseAuth, commentOnBark);
app.get("/barks/:barkId/like", fireBaseAuth, likeBark); //Actually updates
app.get("/barks/:barkId/unlike", fireBaseAuth, unlikeBark); //Actually updates

// Comments
app.patch("/comments/:commentId", fireBaseAuth, patchComment);
app.delete("/comments/:commentId", fireBaseAuth, deleteComment);

// Users route
app.get("/user", fireBaseAuth, getAuthenticatedUser);
app.post("/signup", signupUser);
app.post("/login", loginUser);
app.post("/user/image", fireBaseAuth, uploadUserImage);
app.post("/user", fireBaseAuth, addUserDetails);
app.get("/user/:userName", getUserDetails);

app.post("/notifications", fireBaseAuth, markNotificationsRead);

// Pet Profile Route
app.get("/petprofile/:petProfileId", /*fireBaseAuth,*/ getPetProfile);
app.patch("/petprofile/:petProfileId", fireBaseAuth, patchPetProfile);
app.post("/petprofile", fireBaseAuth, fireBaseAuth, postPetProfile);
app.post("/profile/image", fireBaseAuth, uploadProfileImage);
app.delete("/petprofile/:petProfileId", fireBaseAuth, deletePetProfile);
// app.get("/petprofile/:profileName", fireBaseAuth, getPetProfile); //Don't need this
//app.get("/petprofile/:userName/:profileName", getPetProfilePublic); //Public API
//app.delete("/petprofile/:profileName", fireBaseAuth, deletePetProfile);

// Biz Profile Route
app.get("/bizprofile/:bizProfileId", /*fireBaseAuth,*/ getBizProfile);
app.patch("/bizprofile/:bizProfileId", fireBaseAuth, patchBizProfile);
app.post("/bizprofile", fireBaseAuth, postBizProfile);
app.delete("/bizprofile/:bizProfileId", fireBaseAuth, deleteBizProfile);

// Biz Product
app.post("/product/image", fireBaseAuth, uploadProductImage);
app.get("/product/:productId", getBizProduct);
app.patch("/product/:productId", fireBaseAuth, patchBizProduct);
app.post("/product/:bizProfileId", fireBaseAuth, postBizProduct);  //Needs to know the profile this product belongs
app.delete("/product/:productId", fireBaseAuth, deleteBizProduct);

// Get News routes
app.get("/news", getAllNews);
app.get("/news/:newsId", getNews);
app.post("/news", fireBaseAuth, postNews);
app.patch("/news/:newsId", fireBaseAuth, patchNews);
app.delete("/news/:newsId", fireBaseAuth, deleteNews);

// Get Resources routes
app.get("/resource", getAllResources);
app.get("/resource/:resourceId", getResource);
app.post("/resource", fireBaseAuth, postResource);
app.patch("/resource/:resourceId", fireBaseAuth, patchResource);
app.delete("/resource/:resourceId", fireBaseAuth, deleteResource);

// Images
app.post("/image/:imageType", fireBaseAuth, uploadImage);

// Personalization
app.get("/personalization/profiles", getPersonalPetProfile);
app.get("/personalization/products", getPersonalProducts);
app.get("/personalization/services", getPersonalServices);

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
