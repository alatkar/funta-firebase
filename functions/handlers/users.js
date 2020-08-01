const { db } = require('../util/admin');
const config = require('../util/config');
const firebase = require('firebase');

const { validateSignupData, validateLoginData } = require("../util/validators");

firebase.initializeApp(config);

exports.loginUser = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  // Data validation
  const { valid, errors } = validateLoginData(user);
  if (!valid) return res.status(400).json(errors);

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
      if (err.code === "auth/wrong-password")
        return res
          .status(403)
          .json({ general: "Wrong credentials, please try again" });
      else return res.status(500).json({ error: err.code });
    });
}

exports.signupUser = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    userName: req.body.userName,
  };

  // Data validation
  const { valid, errors } = validateSignupData(newUser);
  if (!valid) return res.status(400).json(errors);

  let token, userId;
  db.doc(`/users/${newUser.userName}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ userName: "This user already exists" });
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
        userName: newUser.userName,
        email: newUser.email,
        userId: userId,
        createdAt: new Date().toISOString(),
      };
      db.doc(`/users/${newUser.userName}`).set(userCred);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        return res
          .status(400)
          .json({ email: `Email ${newUser.email} is already in use` });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
}
