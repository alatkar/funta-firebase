const { admin, db } = require("../util/admin");

// Invite to group: Only admind can request users.
// User should already be registered. So can invite only site users
// Add user into "invites" array in the Group.
// Respond with dumplicate or unknown users
exports.postInviteToJoinEvent = (req, res) => {
  if (
    !req.body.members ||
    !Array.isArray(req.body.members) ||
    req.body.members.length < 1
  ) {
    return res.status(400).json({
      message: `Please provide members in array for invitation to join event ${req.params.eventId}`,
    });
  }

  let invites = [];
  let eventDoc = {};

  db.doc(`/barks/${req.params.eventId}`)
    .get()
    .then((doc) => {
      eventDoc = doc;
      const invitedUserNames = [
        ...new Set(req.body.members.map((elem) => elem)),
      ];

      return Promise.all(
        invitedUserNames.map((elem) => {
          return db
            .doc(`/users/${elem}`)
            .get()
            .then((doc) => {
              if (doc.exists) return doc.data().userName;
            })
            .then((userName) => {
              if (userName) {
                let message = `User ${req.user.userName} has invited you to the event ${req.params.eventId}`;
                if (req.body.message) {
                  message = req.body.message + ". " + message;
                }
                invites.push(userName);
                return db
                  .collection("notifications")
                  .add({
                    createdAt: new Date().toISOString(),
                    recipient: userName,
                    sender: req.user.userName,
                    barkId: req.params.eventId,
                    type: "EVENTINVITE",
                    message: message,
                    read: false,
                  })
                  .then((doc) => {
                    console.log(
                      `Notification created ${doc.id} of type EVENTINVITE from ${req.user.userName} to ${userName}`
                    );
                  });
              }
              return;
            });
        })
      );
    })
    .then(() => {
      return res.json({ message: `Invitations created for users: ${invites}` });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === 400)
        return res.status(400).json({ message: `${err.message}` });
      res.status(500).json({ message: `${err}` });
    });
};
