const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");
const { getUserImageUrl } = require("./users");

// Get a News
exports.getUserNotifications = (req, res) => {
  let newsItem = {};

  db.collection("notifications")
    .where("recipient", "==", req.user.userName)
    .orderBy("createdAt", "desc")
    //.limit(10)
    .get()
    .then((data) => {
      let notification = [];
      data.forEach((doc) => {
        notification.push(doc.data());
      });
      return res.json({ response: notification });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};
