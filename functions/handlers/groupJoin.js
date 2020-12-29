const { admin, db } = require("../util/admin");

// User requests to join a group. Add user into Group object with array of Join requests
// Create notifications for all the admins
exports.postRequestJoinGroup = (req, res) => {
    let groupDoc = {};
    let message = `User ${req.user.userName} has requested to join the group ${req.params.groupId}`;
    db.doc(`/groups/${req.params.groupId}`)
      .get()
      .then((doc) => {
        groupDoc = doc;
        let members = doc.data().members;
        
        if (members.filter((e) => e == req.user.userName).length > 0) {
          const error = new Error(
            `User ${req.user.userName} is already member of the group ${req.params.groupId}`
          );
          error.code = 400;
          throw error;
        }
        
        if (doc.data().admins.filter((e) => e == req.user.userName).length > 0) {
          const error = new Error(
            `User ${req.user.userName} is already admin member of the group ${req.params.groupId}. But is not added as member. Please investigate`
          );
          error.code = 400;
          throw error;
        }
        let waitList = doc.data().waitList;
  
        if (waitList) {
          if (
            waitList.filter((e) => e.userName === req.user.userName).length > 0
          ) {
            const error = new Error(
              `User ${req.user.userName} is already in the wait list of the group ${req.params.groupId}.`
            );
            error.code = 400;
            throw error;
          }
        }
      })
      .then(() => {
        if (req.body.message) {
          message = req.body.message + ". " + message;
        }
        let waitList = groupDoc.data().waitList;
        if (!waitList) {
          waitList = [];
        }

        waitList.push({ userName: req.user.userName, message: `${message}` });
        return groupDoc.ref.update({ waitList: waitList });
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
              type: "GROUPJOIN",
              message: message,
              read: false
            });
          })
        );
      })
      .then(() => {
        return res.json({
          message: `Your request to join group ${req.params.groupId} has been received. You will be notified when the group admins approve/deny your request.`,
        });
      })
      .catch((err) => {
        console.error(err);
        if (err.code === 400)
          return res.status(400).json({ message: `${err.message}` });
        res.status(500).json({ message: `${err}` });
      });
  };
  
  // Admins will see the requests on group page. Only they can approve or deny with optional message
  // Remove the name from Wait List after the admin's action
  // Add group into user's groups
  // Create notification for the user: You are now member or your request has bben denied
  // Remove the notification from other admins (?)
  exports.postAcceptRequestToJoinGroup = (req, res) => {
    let groupDoc = {};
    db.doc(`/groups/${req.params.groupId}`)
      .get()
      .then((doc) => {
        let admins = doc.data().admins;
        if (admins.filter((e) => e == req.user.userName).length == 0) {
          const error = new Error(
            `Only admins can approve or deny members to join the group ${req.params.groupId}`
          );
          error.code = 400;
          console.error(error.message);
          throw error;
        }

        let members = doc.data().members;
        if (members.filter((e) => e == req.params.userName).length > 0) {
          const error = new Error(
            `User ${req.user.userName} is already member of group ${req.params.groupId}`
          );
          error.code = 400;
          throw error;
        }
        
        groupDoc = doc;
        let waitList = doc
          .data()
          .waitList.filter((e) => e.userName != req.params.userName);

        members.push(req.params.userName);

        return doc.ref.update({ waitList: waitList, members: members });
      })
      .then(() => {
        return db
          .doc(`/users/${req.params.userName}`)
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
              doc.ref.update({ groups: existingGroups });
            } else {
              console.log(
                `User ${req.params.userName} is aleady member of group ${req.params.groupId}`
              );
            }
          });
      })
      .then(() => {
        return db.collection("notifications").add({
          createdAt: new Date().toISOString(),
          recipient: req.params.userName,
          sender: req.user.userName,
          groupId: req.params.groupId,
          type: "GROUP-JOIN-APPROVED",
          message: `Congratulations! Your request to join the group has been approved by ${req.user.userName} , with message ${req.body.message}`,
          read: false,
          state: "open",
        });
      })
      .then(() => {
        return res.json({
          message: `You have approved request of ${req.params.userName} to join the group ${req.params.groupId}`,
        });
      })
      .catch((err) => {
        console.error(err);
        if (err.code === 400)
          return res.status(400).json({ message: `${err.message}` });
        res.status(500).json({ message: `${err}` });
      });
  };
  
  exports.postDenyRequestToJoinGroup = (req, res) => {
    db.doc(`/groups/${req.params.groupId}`)
      .get()
      .then((doc) => {
        let admins = doc.data().admins;
        if (admins.filter((e) => e == req.user.userName).length == 0) {
          const error = new Error(
            `Only admins can approve or deny members to join the group ${req.params.groupId}`
          );
          error.code = 400;
          console.error(error.message);
          throw error;
        }
        //TODO: Check if member was in waitList. If not, can't deny
        let waitList = doc
          .data()
          .waitList.filter((e) => e.userName != req.params.userName);
        return doc.ref.update({ waitList: waitList });
      })
      .then(() => {
        return db.collection("notifications").add({
          createdAt: new Date().toISOString(),
          recipient: req.params.userName,
          sender: req.user.userName,
          groupId: req.params.groupId,
          type: "GROUP-JOIN-DENIED",
          message: `Unfortunately, your request to join the group has been denied by ${req.user.userName}, with message ${req.body.message}`,
          read: false,
          state: "open",
        });
      })
      .then(() => {
        return res.json({
          message: `You have denied request of ${req.params.userName} to join the group ${req.params.groupId}`,
        });
      })
      .catch((err) => {
        console.error(err);
        if (err.code === 400)
          return res.status(400).json({ message: `${err.message}` });
        res.status(500).json({ message: `${err}` });
      });
  };