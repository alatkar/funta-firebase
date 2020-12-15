const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");

exports.postLeaveGroup = (req, res) => {
    let groupDoc = {};
    db.doc(`/groups/${req.params.groupId}`)
      .get()
      .then((doc) => {
        groupDoc = doc;
        let members = doc.data().members;
        if (members.filter((elem) => elem == req.user.userName).length == 0) {
          const error = new Error(
            `User ${req.user.userName} is not a member of group ${req.params.groupId}`
          );
          error.code = 400;
          throw error;
        }
        let admins = doc.data().admins;
        if (admins.filter((elem) => elem == req.user.userName).length > 0) {
          const error = new Error(
            `User ${req.user.userName} is admin member of the group ${req.params.groupId}. Admins can not leave group. Please investigate`
          );
          error.code = 400;
          throw error;
        }
        members = members.filter((elem) => elem !== req.user.userName)
        return doc.ref.update({
          members: members,
        });
      })
      .then(() => {
        let admins = groupDoc.data().admins;
        return Promise.all(
          admins.map((admin) => {
            return db.collection("notifications").add({
              createdAt: new Date().toISOString(),
              recipient: admin,
              sender: req.user.userName,
              groupId: req.params.groupId,
              type: "GROUPLEAVE",
              message: `Member ${req.user.userName} has left group ${req.params.groupId} with comment: ${req.body.message}`,
              read: false,
              state: "open",
            });
          })
        );
      })
      .then(() => {
        return db
          .doc(`/users/${req.user.userName}`)
          .get()
          .then((doc) => {
            let existingGroups = doc.data().groups;
            existingGroups = existingGroups.filter((e) => e.groupId !== req.params.groupId);
              return doc.ref.update({ groups: existingGroups });
          });
      })
      .then(() => {
        return res.json({
          message: `You have been successfully removed from the group ${req.params.groupId}`,
        });
      })
      .catch((err) => {
        console.error(err);
        if (err.code === 400)
          return res.status(400).json({ message: `${err.message}` });
        res.status(500).json({ message: `${err}` });
      });
  };
  