const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");

// User are Interested, MayBe or default (Not Interested)
// When interest is shown, we will add them in corresponding array interested or mayBe
// If not interested, we will remove user from both arrays
// Person creating event gets notification for each action
// TODO: what about person creating Event
exports.postEventInterest = (req, res) => {
  let barkData = {};
  let optionChanged = false;

  if (!req.body.interest) {
    return res
      .status(404)
      .json({ message: "Please provide interest option for event!" });
  }

  db.doc(`/barks/${req.params.eventId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        const error = new Error(`Event not found`);
        error.code = 404;
        throw error;
      }

      barkData = doc.data();

      if (!barkData.barkCategory && barkData.barkCategory != "EVENT") {
        const error = new Error(`This bark is not an event!`);
        error.code = 404;
        throw error;
      }

      let interested = doc.data().interested;
      if (!interested) interested = [];

      let mayBe = doc.data().mayBe;
      if (!mayBe) mayBe = [];

      let userinterested =
        interested.filter((elem) => elem == req.user.userName).length >
        0;

      let usermayBe =
        mayBe.filter((elem) => elem == req.user.userName).length > 0;

      if (req.body.interest == "NOTINTERESTED") {
        // No
        if (userinterested)
          interested = interested.filter((elem) => elem != req.user.userName);

        if (usermayBe)
          mayBe = mayBe.filter((elem) => elem != req.user.userName);
      } else if (req.body.interest == "INTERESTED") {
        // Interested
        if (!userinterested) interested.push(req.user.userName);
        mayBe = mayBe.filter((elem) => elem != req.user.userName);
      } else if (req.body.interest == "MAYBE") {
        // Check for duplicate
        if (!usermayBe) mayBe.push(req.user.userName);
        interested = interested.filter((elem) => elem != req.user.userName);
      }

      return doc.ref.update({ interested: interested, mayBe: mayBe });
    })
    .then(() => {
      let message = `is NOT interested in joining`;
      if (req.body.interest == "INTERESTED") message = `is interested in joining`;
      else if (req.body.interest == "MAYBE") message = `might join`;
      return db.collection("notifications").add({
        createdAt: new Date().toISOString(),
        recipient: barkData.userName,
        sender: req.user.userName,
        barkId: req.params.eventId,
        type: "EVENT",
        message: `User ${req.user.userName} ${message} the event ${barkData.subject}`,
        read: false,
      });
    })
    .then(() => {
      return res.json({
        message: `Your response to the event "${barkData.subject}" have been updated`,
      });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === 400)
        return res.status(400).json({ message: `${err.message}` });
      res.status(500).json({ message: `${err}` });
    });
};
