const { admin, db } = require("../util/admin");

exports.getHelp = (req, res) => {
  let help = {};

  db.doc(`/help/${req.params.helpcanterid}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Help not found" });
      }
      help = doc.data();
      help.helpId = doc.id;
      return res.json({ response: help });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.getAllHelp = (req, res) => {
  let help = [];

  db.collection("help")
    .orderBy("createdAt", "desc")
    .limit(15)
    .get()
    .then((data) => {
      data.forEach((element) => {
        var value = element.data();
        value.id = element.id;
        help.push(value);
      });
      return res.json({ response: help });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.postHelp = (req, res) => {
  console.log("Body ", req.body);

  //if (req.body.body.trim() === '') // Doesn't work
  if (req.body.subject.trim() === "" || req.body.message.trim() === "") {
    return res
      .status(400)
      .json({ message: "Please provide category, subject and message" });
  }

  const newHelp = {
    subject: req.body.subject,
    message: req.body.message,
    createdAt: new Date().toISOString(),
    userName: req.user.userName,
    userId: req.user.userId,
  };

  console.log("Creating Help ", newHelp);

  db.collection("help")
    .add(newHelp)
    .then((doc) => {
      const resHelp = newHelp;
      resHelp.helpId = doc.id;
      return res.json({ response: resHelp });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};
