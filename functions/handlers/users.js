const { admin, db } = require("../util/admin");
const config = require("../util/config");
const firebase = require("firebase");
const enumDefinations = require("../util/enums");
const { getGroupObject } = require("./groups");

const {
  validateSignupData,
  validateLoginData,
  reduceUserDetails,
} = require("../util/validators");

firebase.initializeApp(config);

exports.getUserByEmail = (req, res) => {
  var auth = firebase.auth();
  let email = req.params.email;
  admin
    .auth()
    .getUserByEmail(email)
    .then(function (userRecord) {
      // See the tables above for the contents of userRecord
      console.log("Successfully fetched user data:", userRecord.toJSON());
      return userRecord;
    })
    .then((userRecord) => {
      return db.collection("users").where("userId", "==", userRecord.uid).get();
    })
    .then((docs) => {
      let user;
      docs.forEach((doc) => (user = doc.data()));
      return res.json({ response: user });
    })
    .catch(function (error) {
      console.log("Error fetching user data:", error);
    });
};

exports.sendPassWordResetEmail = (req, res) => {
  var auth = firebase.auth();
  db.collection("users")
    .where("email", "==", req.params.email)
    .get()
    .then((docs) => {
      let user;
      docs.forEach((doc) => (user = doc.data()));
      return user;
    })
    .then((doc) => {
      return auth
        .sendPasswordResetEmail(doc.email)
        .then(function () {
          console.log("Email sent");
          return res.json({
            message:
              "Please check your email for the password reset instructions",
          });
          // Email sent.
        })
        .catch(function (error) {
          console.error(err);
          // An error happened.
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};
/*
exports.sendPassWordResetEmail = (req, res) => {
  var auth = firebase.auth();
  db.doc(`/users/${req.params.userName}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return doc;
      } else {
        return res
          .status(404)
          .json({ message: `User ${req.params.userName} not found` });
      }
    })
    .then((doc) => {
      return auth
        .sendPasswordResetEmail(doc.data().email)
        .then(function () {
          console.log("Email sent");
          return res.json({
            message:
              "Please check your email for the password reset instructions",
          });
          // Email sent.
        })
        .catch(function (error) {
          console.error(err);
          // An error happened.
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};
*/
exports.loginUser = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  // Data validation
  const { valid, errors } = validateLoginData(user);
  if (!valid) return res.status(400).json({ errors });

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      //"auth/wrong-password"
      //"auth/user-not-found"
      //if (err.code === "auth/wrong-password")
      return res.status(403).json({
        error: `${err}`,
        general: `Wrong credentials, please try again.`,
        //general: `Wrong credentials, please try again. Code: ${err}`,
      });
      //else return res.status(500).json({ error: err.code });
    });
};

exports.signupUser = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    userName: req.body.userName,
    userType: req.body.userType,
    isNonProfitOrganization: req.body.isNonProfitOrganization,
  };

  // Data validation
  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return res.status(400).json({ errors });

  let noImage = "no-img.png";

  // Sanitize User Type
  let value = req.body.userType
    ? req.body.userType.toUpperCase()
    : enumDefinations.userType.INDIVIDUAL;
  switch (value) {
    case enumDefinations.userType.INDIVIDUAL:
    case enumDefinations.userType.ORGANIZATION:
      newUser.userType = value;
      break;
    default:
      console.log(
        "User Type is incorrect for user ",
        newUser.userName,
        " Setting userType as ",
        enumDefinations.userType.INDIVIDUAL
      );
      newUser.userType = enumDefinations.userType.INDIVIDUAL;
  }
  // Sanitize Organization Type: By default set as false;
  let isNonProfitOrganization = req.body.isNonProfitOrganization
    ? req.body.isNonProfitOrganization
    : false;
  newUser.isNonProfitOrganization = isNonProfitOrganization;

  let token, userId;
  db.doc(`/users/${newUser.userName}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({
          errors: { userName: `The user ${newUser.userName} already exists` },
        });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCred = {
        createdAt: new Date().toISOString(),
        email: newUser.email,
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImage}?alt=media`,
        userId: userId,
        userName: newUser.userName,
        userType: newUser.userType,
        isNonProfitOrganization: newUser.isNonProfitOrganization,
      };
      return db.doc(`/users/${newUser.userName}`).set(userCred);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({
          errors: { email: `Email ${newUser.email} is already in use` },
        });
      } else {
        return res.status(500).json({
          error: err.code,
          general: `Something went wrong, please try again. Code: ${err.code}`,
        });
      }
    });
};

// Get any user details
exports.getUserDetails = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.userName}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.user = doc.data();
        return db
          .collection("barks")
          .where("userName", "==", req.params.userName)
          .orderBy("createdAt", "desc")
          .get();
      } else {
        return res.status(404).json({ message: "User not found" });
      }
    })
    .then((data) => {
      // Send smallest possible image for the userImage
      let imageUrl = userData.user.imageUrl;
      if (userData.user.thumbnail) imageUrl = userData.user.thumbnail;
      else if (userData.user.imageUrlSmall)
        imageUrl = userData.user.imageUrlSmall;

      userData.barks = [];
      data.forEach((doc) => {
        let barkCat = "GENERAL";
        if (doc.data().barkCategory) {
          barkCat = doc.data().barkCategory;
        }
        let bark = doc.data();
        bark.barkId = doc.id;
        bark.barkCategory = barkCat;
        bark.userImageUrl = imageUrl;
        bark.groupId = bark.groupId;
        bark.groupName = bark.groupId; // TODO: Need group name
        userData.barks.push(
          bark
          /*{
          message: doc.data().body,
          createdAt: doc.data().createdAt,
          userName: doc.data().userHandle,
          imageUrl: doc.data().imageUrl,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          barkId: doc.id,
        }*/
        );
      });
      return;
    })
    .then(() => {
      if (userData.user.groups && userData.user.groups.length > 0) {
        const unique = [
          ...new Set(userData.user.groups.map((item) => item.groupId)),
        ];
        return Promise.all(
          unique.map((groupId) => {
            return getGroupObject(groupId);
          })
        );
      } else return;
    })
    .then((groups) => {
      if (groups) {
        let i = 0;
        groups.forEach((elem) => {
          userData.user.groups[i].groupName = elem.data().groupName;
          userData.user.groups[i].imageUrl = elem.data().imageUrl;
          if (elem.data().thumbnail) {
            userData.user.groups[i].imageUrl = elem.data().thumbnail;
          } else if (elem.data().imageUrlSmall) {
            userData.user.groups[i].imageUrl = elem.data().imageUrlSmall;
          }
          ++i;
        });
      } else return;
    })
    .then(() => {
      //Get Pet Profiles  if present
      //console.log("userData..", userData);
      if (userData.user.petProfiles)
        return Promise.all(
          userData.user.petProfiles.map((petProfile) => {
            return db.doc(`/petprofiles/${petProfile.petProfileId}`).get();
          })
        );
    })
    .then((profiles) => {
      //console.log("Pet profile..", profiles);
      userData.user.petProfiles = [];
      if (profiles) {
        profiles.forEach((prof) => {
          let profile = prof.data();
          profile.petProfileId = prof.id;
          userData.user.petProfiles.push(profile);
        });
      }
    })
    .then(() => {
      //Get Biz Profiles if present
      if (userData.user.bizProfiles)
        return Promise.all(
          userData.user.bizProfiles.map((bizProfile) => {
            return db.doc(`/bizprofiles/${bizProfile.bizProfileId}`).get();
          })
        );
    })
    .then((profiles) => {
      //console.log("Biz profile..", profiles);
      userData.user.bizProfiles = [];
      if (profiles) {
        profiles.forEach((prof) => {
          let profile = prof.data();
          profile.bizProfileId = prof.id;
          userData.user.bizProfiles.push(profile);
        });
      }
      return res.json({ response: userData });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Get user image
exports.getUserObject = async (userName) => {
  //console.log("getUserObject: getting data for :", userName);
  return (
    db
      .doc(`/users/${userName}`)
      .get()
      /*.then((doc) => {
      if (doc.exists) {        
        console.log("getUserObject: found data ", doc.data().imageUrl);
        return doc.data().imageUrl;
      } 
      else
         return null;
    })*/
      .catch((err) => {
        console.error("getUserImage Error ", err);
      })
  );
};

// Get own user details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.userName}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.userDetails = doc.data();
        return db
          .collection("likes")
          .where("userName", "==", req.user.userName)
          .get();
      } else {
        return res
          .status(400)
          .json({ message: `User ${req.user.userName} not found` });
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      return (
        db
          .collection("notifications")
          .where("recipient", "==", req.user.userName)
          .orderBy("createdAt", "desc")
          //.limit(10)
          .get()
      );
    })
    .then((data) => {
      userData.notifications = [];
      data.forEach((doc) => {
        userData.notifications.push({
          recipient: doc.data().recipient,
          sender: doc.data().sender,
          createdAt: doc.data().createdAt,
          barkId: doc.data().barkId,
          type: doc.data().type,
          read: doc.data().read,
          notificationId: doc.id,
          message: doc.data().message,
          groupId: doc.data().groupId ? doc.data().groupId : null,
          state: doc.data().state ? doc.data().state : null,
        });
      });
      return;
    })
    .then(() => {
      //Get Pet Profiles  if present
      if (userData.userDetails.petProfiles)
        return Promise.all(
          userData.userDetails.petProfiles.map((petProfile) => {
            return db.doc(`/petprofiles/${petProfile.petProfileId}`).get();
          })
        );
    })
    .then((profiles) => {
      //console.log("Pet profile..", profiles);
      userData.userDetails.petProfiles = [];
      if (profiles) {
        profiles.forEach((prof) => {
          let profile = prof.data();
          profile.petProfileId = prof.id;
          userData.userDetails.petProfiles.push(profile);
        });
      }
    })
    .then(() => {
      //Get Biz Profiles if present
      if (userData.userDetails.bizProfiles)
        return Promise.all(
          userData.userDetails.bizProfiles.map((bizProfile) => {
            return db.doc(`/bizprofiles/${bizProfile.bizProfileId}`).get();
          })
        );
    })
    .then((profiles) => {
      //console.log("Biz profile..", profiles);
      userData.userDetails.bizProfiles = [];
      if (profiles) {
        profiles.forEach((prof) => {
          let profile = prof.data();
          profile.bizProfileId = prof.id;
          userData.userDetails.bizProfiles.push(profile);
        });
      }
      return res.json({ response: userData });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Add user details
// @deprecated
exports.addUserDetails = async (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  // TODO: Why can't I use userId?
  db.doc(`/users/${req.user.userName}`)
    .update(userDetails)
    .then(() => {
      return res.json({
        message: "@deprecated  @deprecated Details added successfully",
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.patchUser = (req, res) => {
  //console.log(`Patching PetProfile Body: ${Object.keys(req.body)}`);
  const document = db.doc(`/users/${req.user.userName}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "User not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res.status(403).json({
          message: "Unauthorized. Can not update other user's PetProfile",
        });
      } else {
        return doc;
      }
    })
    .then((doc) => {
      //Update user
      //console.log("Doc data: ", doc.data());
      // TODO: Validating if fields exist. We might need to allow to enter fields
      /*
      for (const [key, value] of Object.entries(req.body)) {
        if (key === "imageUrl") {
          //Allow imageUrl to be inserted if not present
          continue;
        }
        if (!doc.data().hasOwnProperty(key)) {
          return res
            .status(404)
            .json({ message: `PetProfile property ${key} not found` });
        }
        //console.log(`${key}: ${value}`);        
      }*/
      let userDetails = reduceUserDetails(req.body, doc.data());
      return doc.ref.update(userDetails);
    })
    .then(() => {
      res.json({ message: `User ${req.user.userName} updated successfully` });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Upload a profile image for user
exports.uploadUserImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;
  let imageExtension;
  // TODO: String for image token
  //let generatedToken = uuid();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ message: "Wrong file type submitted" });
    }
    // my.image.png => ['my', 'image', 'png']
    imageExtension = filename
      .split(".")
      [filename.split(".").length - 1].toLowerCase();
    // 32756238461724837.png
    imageFileName = `${req.user.userName}-${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;

    // TODO: Following doesn't work as file can't be overwritten
    imageFileName = `${req.user.userName}.${imageExtension}`;

    // Save file as timestamp
    imageFileName = `${Math.round(
      new Date().getTime()
    ).toString()}.${imageExtension}`;

    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    let destination = `${req.user.userName}/user/${imageFileName}`;
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
        destination: destination,
      })
      .then((obj) => {
        let file = encodeURIComponent(obj[0].name);

        console.log("Uploading image for user:", req.user);
        // Append token to url
        //const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${file}?alt=media`;

        let strChange = file.replace(
          `.${imageExtension}`,
          `_600x600.${imageExtension}`
        );
        const imageUrlSmall = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${strChange}?alt=media`;
        strChange = file.replace(
          `.${imageExtension}`,
          `_200x200.${imageExtension}`
        );
        const thumbnail = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${strChange}?alt=media`;
        return db
          .doc(`/users/${req.user.userName}`)
          .update({ imageUrl, imageUrlSmall, thumbnail });
      })
      .then(() => {
        return res.json({ message: "image uploaded successfully" });
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ message: `${err}` });
      });
  });
  busboy.end(req.rawBody);
};

exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({
        message: `${req.body.length} Notifications marked read`,
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};
