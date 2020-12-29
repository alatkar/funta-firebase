const { admin, db } = require("./admin");

// Auth
module.exports = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    console.log("Unauthorized. Missing token");
    return res.status(403).json({ error: "Unauthorized. Missing token" });
  }

  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      console.log("Decoded Toke:", req.user);
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      console.log("Data:", data.data);
      req.user.userName = data.docs[0].data().userName;
      req.user.userId = data.docs[0].data().userId;
      req.user.imageUrl = data.docs[0].data().imageUrl;
      console.log("User Name in request: ", req.user.userName);
      return next();
    })
    .catch((err) => {
      console.error("Error verifying token", err);
      if (err.code == "auth/id-token-expired") {
        res
          .status(403)
          .json({message: `Login token has expired. Please sign in again.`});
      } else {
        res.status(403).json(err);
      }
    });
};
