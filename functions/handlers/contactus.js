const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");

exports.getContactus = (req, res) => {
  let contactus = {};

  db.doc(`/contactus/${req.params.contactusId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Contactus not found" });
      }
      contactus = doc.data();
      contactus.contactusId = doc.id;
      return res.json({ response: contactus });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.getAllContactus = (req, res) => {
  let contactus = [];

  db.collection("contactus")
    .orderBy("createdAt", "desc")
    .limit(15)
    .get()
    .then((data) => {
      data.forEach((element) => {
        var value = element.data();
        value.id = element.id;
        contactus.push(value);
      });
      return res.json({ response: contactus });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.postContactus = (req, res) => {
  console.log("Body ", req.body);

  //if (req.body.body.trim() === '') // Doesn't work
  if (req.body.category.trim() === "" || req.body.subject.trim() === "" || req.body.message.trim() === "") {
    return res
      .status(400)
      .json({ message: "Please provide category, subject and message" });
  }

  const newContactus = {
    category: req.body.category,
    subject: req.body.subject,
    message: req.body.message,
    createdAt: new Date().toISOString(),
    userName: req.user.userName,
    userId: req.user.userId,
  };

  console.log("Creating Contact Us ", newContactus);

  db.collection("contactus")
    .add(newContactus)
    .then((doc) => {
      const resContactus = newContactus;
      resContactus.contactusId = doc.id;
      return res.json({ response: resContactus });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};
