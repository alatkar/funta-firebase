const { admin, db } = require("../util/admin");

exports.postSearchByUserName = (req, res) => {
  let users = [];
  db.collection("users")
    .orderBy("userName")
    .startAt(req.params.userName)
    .get()
    .then((docs) => {
      docs.forEach((doc) => users.push(doc.data().userName));
      return users;
    })
    .then(() => {
      return res.json({
        response: {users},
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};
