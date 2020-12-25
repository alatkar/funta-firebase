const functions = require("firebase-functions");
const app = require("express")();
const fireBaseAuth = require("./util/fireBaseAuth");
const firebase = require("firebase");

const cors = require("cors");
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

const {postEventInterest} = require("./handlers/eventInterest");

const {postInviteToJoinEvent} = require("./handlers/eventInvite");

const { patchComment, deleteComment } = require("./handlers/comments");
const {
  loginUser,
  signupUser,
  getAuthenticatedUser,
  uploadUserImage,
  addUserDetails,
  getUserDetails,
  markNotificationsRead,
  sendPassWordResetEmail,
  patchUser,
  getUserByEmail,
} = require("./handlers/users");
const {
  getPetProfile,
  patchPetProfile,
  postPetProfile,
  uploadProfileImage,
  deletePetProfile,
} = require("./handlers/petProfile");
const {
  getBizProfile,
  patchBizProfile,
  postBizProfile,
  deleteBizProfile,
} = require("./handlers/bizProfile");
const {
  getBizProduct,
  patchBizProduct,
  postBizProduct,
  uploadProductImage,
  deleteBizProduct,
} = require("./handlers/bizProduct");
const {
  getAllNews,
  getNews,
  postNews,
  patchNews,
  deleteNews,
} = require("./handlers/news");
const {
  getAllResources,
  getResource,
  postResource,
  patchResource,
  deleteResource,
} = require("./handlers/resources");

const { uploadImage } = require("./handlers/images");

const {
  getPersonalPetProfile,
  getPersonalProducts,
  getPersonalServices,
} = require("./handlers/personalization");

const {
  postContactus,
  getContactus,
  getAllContactus,
} = require("./handlers/contactus");

const { postHelp, getHelp, getAllHelp } = require("./handlers/help");

const {
  getAllGroups,
  getGroup,
  patchGroup,
  postGroup,
  deleteGroup,
} = require("./handlers/groups");

const {
  postRequestJoinGroup,
  postAcceptRequestToJoinGroup,
  postDenyRequestToJoinGroup,
} = require("./handlers/groupJoin");

const {
  postInviteToJoinGroup,
  postAcceptInviteJoinGroup,
  postDenyInviteJoinGroup,
} = require("./handlers/groupInvite");

const {
  postLeaveGroup
} = require("./handlers/groupLeave");

const {
  postRemoveMemberFromGroup
} = require("./handlers/groupRemove");

const { postInviteFunta } = require("./handlers/invite");

const { getUserNotifications } = require("./handlers/notifications");

const { postSearchByUserName } = require("./handlers/search");

const {
  getAllCategories,
  getCategory,
  postCategory,
} = require("./handlers/categories");

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

// Events
app.post("/events/:eventId/interest", fireBaseAuth, postEventInterest);
app.post("/events/:eventId/invite", fireBaseAuth, postInviteToJoinEvent);

// Users route
app.get("/user", fireBaseAuth, getAuthenticatedUser);
app.post("/signup", signupUser);
app.post("/login", loginUser);
app.post("/user/image", fireBaseAuth, uploadUserImage);
app.post("/user", fireBaseAuth, addUserDetails);
app.patch("/user", fireBaseAuth, patchUser);
app.get("/user/getuserbyemail/:email", getUserByEmail);
app.get("/user/:userName", getUserDetails);
app.post("/user/resetpassword/:email", sendPassWordResetEmail);

app.post("/notifications", fireBaseAuth, markNotificationsRead);
app.get("/notifications", fireBaseAuth, getUserNotifications);

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
app.post("/product/:bizProfileId", fireBaseAuth, postBizProduct); //Needs to know the profile this product belongs
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

// Contact Us
app.get("/contactus/:contactusId", fireBaseAuth, getContactus);
app.get("/contactus", fireBaseAuth, getAllContactus);
app.post("/contactus", fireBaseAuth, postContactus);

// Help
app.get("/help/:helpId", fireBaseAuth, getHelp);
app.get("/help", fireBaseAuth, getAllHelp);
app.post("/help", fireBaseAuth, postHelp);

// Groups
app.get("/groups", getAllGroups); // type, description
//app.get("/group", fireBaseAuth, getAllGroups); // type, description
app.get("/groups/:groupId", getGroup);
app.patch("/groups/:groupId", fireBaseAuth, patchGroup);
app.delete("/groups/:groupId", fireBaseAuth, deleteGroup);
app.post("/groups", fireBaseAuth, postGroup);

app.post("/groups/:groupId/invite", fireBaseAuth, postInviteToJoinGroup);
app.post("/groups/:groupId/accept", fireBaseAuth, postAcceptInviteJoinGroup);
app.post("/groups/:groupId/deny", fireBaseAuth, postDenyInviteJoinGroup);
app.post("/groups/:groupId/remove", fireBaseAuth, postRemoveMemberFromGroup);

app.post("/groups/:groupId/join", fireBaseAuth, postRequestJoinGroup);
app.post(
  "/groups/:groupId/accept/:userName",
  fireBaseAuth,
  postAcceptRequestToJoinGroup
);
app.post(
  "/groups/:groupId/deny/:userName",
  fireBaseAuth,
  postDenyRequestToJoinGroup
);
app.post("/groups/:groupId/leave", fireBaseAuth, postLeaveGroup);

app.post("/invite", fireBaseAuth, postInviteFunta);

app.post("/search/user/:userName", fireBaseAuth, postSearchByUserName);

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

exports.onBarkDelete = functions.firestore //.region("europe-west1")
  .document("/barks/{barkId}")
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

// TODO: Bark created for group. Create notification for all members
exports.onBarkCreate = functions.firestore //.region("europe-west1")
  .document("/barks/{barkId}")
  .onCreate((snapshot, context) => {
    const barkId = context.params.barkId;
    const batch = db.batch();
    return;
    /*return db
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
      */
  });

exports.createNotificationOnInvite = functions.firestore
  .document("invitations/{id}")
  .onCreate((snapshot) => {
    var actionCodeSettings = {
      // URL you want to redirect back to. The domain (www.example.com) for this
      // URL must be in the authorized domains list in the Firebase Console.
      url: "https://funta-33071.web.app/signup",
      // This must be true.
      handleCodeInApp: true,
      /*,
      iOS: {
        bundleId: 'com.example.ios'
      },
      android: {
        packageName: 'com.example.android',
        installApp: true,
        minimumVersion: '12'
      },
      dynamicLinkDomain: 'funta-33071.web.app'*/
    };

    return db
      .doc(`/users/${snapshot.data().recipient}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
          return doc.id;
        } else {
          //Send Signup email if user not found
          console.log(
            `Sending email to ${snapshot.data().email} to join the site`
          );
          return firebase
            .auth()
            .sendSignInLinkToEmail(snapshot.data().email, actionCodeSettings);
        }
      })
      .then(() => {
        let recipient = snapshot.data().email;
        if (snapshot.data().recipient) recipient = snapshot.data().recipient;

        return db
          .collection("notifications")
          .add({
            createdAt: new Date().toISOString(),
            email: snapshot.data().email,
            recipient: recipient,
            sender: snapshot.data().sender,
            groupId: snapshot.data().groupId,
            type: "GROUPINVITE",
            message: snapshot.data().message,
            read: false,
            state: "open",
          })
          .then((doc) => {
            console.log(
              `Notification created ${doc.id} of type GROUPINVITE from ${
                snapshot.data().sender
              } to ${snapshot.data().email}`
            );
          });
      })
      .catch((err) => console.error(err));
  });
