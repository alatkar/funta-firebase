const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");

// Invite to group: Only admind can request users.
// User should already be registered. So can invite only site users
// Add user into "invites" array in the Group.
// Respond with dumplicate or unknown users
exports.postInviteToJoinGroup = (req, res) => {
  if (
    !req.body.members ||
    !Array.isArray(req.body.members) ||
    req.body.members.length < 1
  ) {
    return res.status(400).json({
      message: `Please provide members in array for invitation to join group ${req.params.groupId}`,
    });
  }

  let invitations = [];
  let alreadyInvited = [];
  let alreadyMember = [];
  let unknownUsers = [];
  let invites = [];
  let groupDoc = {};

  db.doc(`/groups/${req.params.groupId}`)
    .get()
    .then((doc) => {
      groupDoc = doc;
      let admins = doc.data().admins;
      if (admins.filter((elem) => elem === req.user.userName).length == 0) {
        const error = new Error(
          `Only admins can invite members to join the group ${req.params.groupId}`
        );
        error.code = 400;
        throw error;
      } else {
        const invitedUserNames = [
          ...new Set(req.body.members.map((elem) => elem)),
        ];

        if (doc.data().invitations) {
          invitations = doc.data().invitations;
        } else {
          invitations = [];
        }
        
        return Promise.all(
          invitedUserNames.map((elem) => {
            return db
              .doc(`/users/${elem}`)
              .get()
              .then((doc) => {
                if (doc.exists) return doc.data().userName;
              })
              .then((userName) => {
                let members = groupDoc.data().members;
                if (userName) {
                  if (
                    invitations.filter((e) => e.userName == userName).length !=
                    0
                  ) {
                    alreadyInvited.push(userName);
                  } else if (
                    groupDoc.data().members.filter((e) => e == userName)
                      .length != 0
                  ) {
                    alreadyMember.push(userName);
                  } else {
                    let message = `User ${req.user.userName} has invited you to the join ${req.params.groupId}`;
                    if (req.body.message) {
                      message = req.body.message + ". " + message;
                    }
                    invitations.push({
                      userName: userName,
                      message: message,
                    });
                    invites.push({
                      userName: userName,
                      message: message,
                    });

                    return db
                      .collection("notifications")
                      .add({
                        createdAt: new Date().toISOString(),
                        recipient: userName,
                        sender: req.user.userName,
                        groupId: req.params.groupId,
                        type: "GROUPINVITE",
                        message: message,
                        read: false
                      })
                      .then((doc) => {
                        console.log(`Notification created ${doc.id} of type GROUPINVITE from ${req.user.userName} to ${userName}`);
                      });
                  }
                } else {
                  unknownUsers.push(elem);
                }
                return;
              });
          })
        );
      }
    })
    .then(() => {
      if (invites.length > 0) {
        console.log(
          `Created invitations ${JSON.stringify(invites)} to join the group ${
            req.params.groupId
          } [Users with already pending inviations: ${alreadyInvited}] [Already member: ${alreadyMember}] [Unknown users: ${unknownUsers}]`
        );
        return groupDoc.ref.update({ invitations: invitations });
      }
      return;
    })
    //TODO: Notification will be created for user using function "createNotificationOnInvite". May be move that code here
    .then(() => {
      let members = invites.map((elem) => elem.userName);
      return res.json({
        message: `[Invitations created for users: ${members} ] [Users with already pending inviations: ${alreadyInvited}] [Users already members: ${alreadyMember}] [Unknown users: ${unknownUsers}]`,
      });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === 400)
        return res.status(400).json({ message: `${err.message}` });
      res.status(500).json({ message: `${err}` });
    });
};

// Join group: Check if user exists in "invitation" array.
// Add group to user and clean user entry from invitations
exports.postAcceptInviteJoinGroup = (req, res) => {
  let members = [];
  let groupDoc = {};
  db.doc(`/groups/${req.params.groupId}`)
    .get()
    .then((doc) => {
      groupDoc = doc;
      members = doc.data().members;
      if (members.includes(req.user.userName)) {
        const error = new Error(
          `User ${req.user.userName} is already member of group ${req.params.groupId}`
        );
        error.code = 400;
        throw error;
      }
      let admins = doc.data().admins;
      if (admins.includes(req.user.userName)) {
        const error = new Error(
          `User ${req.user.userName} is already admin member of group ${req.params.groupId}. But is not added as member. Please investigate`
        );
        error.code = 400;
        throw error;
      }
      members.push(req.user.userName);
      let invitations = doc.data().invitations;
      invitations = invitations.filter((e) => e.userName !== req.user.userName);
      return groupDoc.ref.update({
        members: members,
        invitations: invitations,
      });
    })
    .then(() => {
      return db
        .doc(`/users/${req.user.userName}`)
        .get()
        .then((doc) => {
          let existingGroups = doc.data().groups;
          if (!existingGroups) {
            existingGroups = [];
          }
          if (
            existingGroups.filter((e) => e.groupId === req.params.groupId)
              .length == 0
          ) {
            existingGroups.push({
              groupId: req.params.groupId,
              isAdmin: false,
            });
            return doc.ref.update({ groups: existingGroups });
          } else {
            console.log(
              `User ${req.user.userName} is aleady member of group ${req.params.groupId}`
            );
          }
        });
    })
    .then(() => {
      return res.json({
        message: `You have been added into the group ${req.params.groupId}. Group members are: ${members}`,
      });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === 400)
        return res.status(400).json({ message: `${err.message}` });
      res.status(500).json({ message: `${err}` });
    });
};

// Deny Join group: Check if user exists in "invitation" array.
// Clean user entry from invitations
// User might be member. User needs to use "Leave Group" functionality
// TODO: Should we notify person who invited this user?
exports.postDenyInviteJoinGroup = (req, res) => {
  let members = [];
  let groupDoc = {};
  db.doc(`/groups/${req.params.groupId}`)
    .get()
    .then((doc) => {
      groupDoc = doc;
      members = doc.data().members;
      if (members.includes(req.user.userName)) {
        const error = new Error(
          `User ${req.user.userName} is already member of group ${req.params.groupId}`
        );
        error.code = 400;
        throw error;
      }
      let admins = doc.data().admins;
      if (admins.includes(req.user.userName)) {
        const error = new Error(
          `User ${req.user.userName} is already admin member of group ${req.params.groupId}. But is not added as member. Please investigate`
        );
        error.code = 400;
        throw error;
      }

      let invitations = doc.data().invitations;
      invitations = invitations.filter((e) => e.userName !== req.user.userName);
      return groupDoc.ref.update({
        invitations: invitations,
      });
    })
    .then(() => {
      return res.json({
        message: `You have denied invitation to join the group ${req.params.groupId}`,
      });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === 400)
        return res.status(400).json({ message: `${err.message}` });
      res.status(500).json({ message: `${err}` });
    });
};
