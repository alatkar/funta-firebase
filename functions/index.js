const functions = require("firebase-functions");
const app = require("express")();
const fireBaseAuth = require("./util/fireBaseAuth");

//APIs
const { getBark, getAllBarks, postBark } = require("./handlers/barks");
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
app.get('/barks/:barkId', getBark);

// Users route
app.get("/user", fireBaseAuth, getAuthenticatedUser);
app.post("/signup", signupUser);
app.post("/login", loginUser);
app.post("/user/image", fireBaseAuth, uploadImage);
app.post("/user", fireBaseAuth, addUserDetails);

// Export Route starting with api as /api/barks
exports.api = functions.https.onRequest(app);
