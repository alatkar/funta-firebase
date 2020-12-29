const { admin, db } = require("../util/admin");

// Invite external users to join Funta
exports.postInviteFunta = (req, res) => {
  if (
    !req.body.members ||
    !Array.isArray(req.body.members) ||
    req.body.members.length < 1
  ) {
    return res.status(400).json({
      message: `Please provide members in array for invitation to join group ${req.params.groupId}`,
    });
  }

  let existingUsers = [];
  let invitedUsers = [];
  let invites = [];

  const emails = [...new Set(req.body.members.map((elem) => elem))];

  Promise.all(
    emails.map((email) => {
      return db
        .collection("users")
        .where("email", "==", email)
        .get()
        .then((docs) => {
          let user;
          docs.forEach((doc) => (user = doc.data().userName));
          if (user) return user;
        })
        .then((userName) => {
          if (userName) {
            existingUsers.push(userName);
          } else {
            invitedUsers.push(email);
          }
        });
    })
  )
    .then(() => {
      return Promise.all(
        invitedUsers.map((inviteEmail) => {
          let invite = {};
          invite.email = inviteEmail;
          invite.recipient = inviteEmail; // TODO: Receipient is email. User might join later, we need to mange that
          invite.createdAt = new Date().toISOString();
          invite.sender = req.user.userName;
          invite.message = `User ${invite.sender} has invited you to join Funta using email ${invite.email}`;
          if (req.body.message) {
            invite.message = req.body.message + ". " + invite.message;
          }
          invite.userName = inviteEmail;

          return db
            .collection("invitations")
            .add(invite)
            .then((doc) => {
              invite.id = doc.id;
              invites.push(invite);
            });
        })
      );
    })
    //TODO: Notification will be created for user using function "createNotificationOnInvite". May be move that code here
    .then(() => {
      console.log(
        `Created ${invitedUsers.length} invitations: ${invitedUsers}  Existing Members: ${existingUsers} Invitations: ${JSON.stringify(invites)}`
      );
      return res.json({
        message: `Created ${invitedUsers.length} invitations: ${invitedUsers}  Existing Members: ${existingUsers}`,
      });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === 400)
        return res.status(400).json({ message: `${err.message}` });
      res.status(500).json({ message: `${err}` });
    });
};
