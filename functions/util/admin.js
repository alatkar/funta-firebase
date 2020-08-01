const admin = require("firebase-admin");

var serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://funta-33071.firebaseio.com"
});

const db = admin.firestore();

module.exports = { admin, db };
