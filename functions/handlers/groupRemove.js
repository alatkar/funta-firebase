const { admin, db } = require("../util/admin");

exports.postRemoveMemberFromGroup = (req, res) => {
  if (
    !req.body.members ||
    !Array.isArray(req.body.members) ||
    req.body.members.length < 1
  ) {
    return res.status(400).json({
      message: `Please provide members in array to be removed from the group ${req.params.groupId}`,
    });
  }

  let toBeRemoved = [];
  let adminCantRemoved = [];
  let notInGroup = [];
  let unknownUsers = [];
  let groupDoc = {};

  db.doc(`/groups/${req.params.groupId}`)
    .get()
    .then((doc) => {
      groupDoc = doc;
      let admins = doc.data().admins;
      if (admins.filter((elem) => elem === req.user.userName).length == 0) {
        const error = new Error(
          `Only admins can remove members from the group ${req.params.groupId}`
        );
        error.code = 400;
        throw error;
      }
      const membersToBeRemoved = [
        ...new Set(req.body.members.map((elem) => elem)),
      ];

      let members = doc.data().members;

      return Promise.all(
        membersToBeRemoved.map((elem) => {
          return db
            .doc(`/users/${elem}`)
            .get()
            .then((doc) => {
              if (doc.exists) {
                let userName = doc.data().userName;                
                if (userName) {
                  if (admins.filter((e) => e == userName).length != 0) {
                    adminCantRemoved.push(userName);
                  } else if (members.filter((e) => e == userName).length != 0) {
                    toBeRemoved.push(userName);
                    let message = `User ${req.user.userName} has removed you from the join ${req.params.groupId}`;
                    if (req.body.message) {
                      message = req.body.message + ". " + message;
                    }
                    return db
                      .collection("notifications")
                      .add({
                        createdAt: new Date().toISOString(),
                        recipient: userName,
                        sender: req.user.userName,
                        groupId: req.params.groupId,
                        type: "GROUP-REMOVE",
                        message: message,
                        read: false,
                      })
                      .then(() => {
                        return db
                          .doc(`/users/${userName}`)
                          .get()
                          .then((doc) => {
                            let existingGroups = doc.data().groups;
                            existingGroups = existingGroups.filter(
                              (e) => e.groupId !== req.params.groupId
                            );
                            return doc.ref.update({
                              groups: existingGroups,
                            });
                          });
                      });
                  } else {
                    notInGroup.push(userName);
                  }
                }
              } else {
                unknownUsers.push(elem);
              }
              return;
            });
        })
      );
    })
    .then(() => {
      if (toBeRemoved.length > 0) {
        let members = groupDoc.data().members;
        members = members.filter((item) => !toBeRemoved.includes(item));
        return groupDoc.ref.update({ members: members });
      }
      return;
    })
    .then(() => {
      return res.json({
        message: `[Users removed: ${toBeRemoved} ] [Admin can't be removed: ${adminCantRemoved}] [Users not in group: ${notInGroup}] [Unknown users: ${unknownUsers}]`,
      });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === 400)
        return res.status(400).json({ message: `${err.message}` });
      res.status(500).json({ message: `${err}` });
    });
};
