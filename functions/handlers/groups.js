const { admin, db } = require("../util/admin");

exports.getGroup = (req, res) => {
  let groupData = {};

  db.doc(`/groups/${req.params.groupId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Group not found" });
      }
      groupData = doc.data();
      groupData.groupId = req.params.groupId;

      return db
        .collection("barks")
        .orderBy("createdAt", "desc") //fails with Index error
        .where("groupId", "==", req.params.groupId)
        .get();
    })
    .then((data) => {
      groupData.barks = [];
      data.forEach((doc) => {
        let barkToPush = doc.data();
        barkToPush.groupId = req.params.groupId;
        barkToPush.groupName = groupData.groupName;
        barkToPush.groupImageUrl = groupData.imageUrl;
        barkToPush.barkId = doc.id;
        groupData.barks.push(barkToPush);
      });
      return res.json({ response: groupData });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.getAllGroups = (req, res) => {
  let groupData = [];

  db.collection("groups")
    .orderBy("createdAt", "desc")
    // TODO: Add filter or limit
    .get()
    .then((data) => {
      data.forEach((element) => {
        groupData.push({
          groupName: element.data().groupName,
          groupId: element.id,
          admins: element.data().admins,
          imageUrl: element.data().imageUrl,
          members: element.data().members,
          userCreated: element.data().userName,
          createdAt: element.data().createdAt,
          location: element.data().location,
          description: element.data().description,
        });
      });
      return res.json({ response: groupData });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.postGroup = (req, res) => {
  console.log("Body ", req.body);

  //if (req.body.body.trim() === '') // Doesn't work
  if (req.body.groupName.trim() === "") {
    return res.status(400).json({ message: "Group Name must not be empty" });
  }

  const newGroup = {
    groupName: req.body.groupName,
    groupId: req.body.groupName.replace(/\s/g, "."),
    createdAt: new Date().toISOString(),
    description: req.body.description,
    userId: req.user.userId,
    userName: req.user.userName,
    invitations: [],
    waitList: [],
  };

  newGroup.members = [];
  newGroup.members.push(req.user.userName);
  newGroup.admins = [];
  newGroup.admins.push(req.user.userName);

  // imageUrl is optional
  if (req.body.imageUrl) {
    if (Array.isArray(req.body.imageUrl)) {
      // Should be string not array
      return res.status(400).json({ message: "imageUrl must be a string" });
    }
    newGroup.imageUrl = req.body.imageUrl;
  }

  if (req.body.location) {
    newGroup.location = req.body.location;
  }

  // TODO: Check if this name is used

  console.log("Creating Group ", newGroup);

  db.doc(`/groups/${newGroup.groupId}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ message: `The Group ${newGroup.groupName} already exists` });
      } else {
        db.doc(`/groups/${newGroup.groupId}`)
          .set(newGroup)
          .then((doc) => {
            return newGroup;
          })
          .then((resNewGroup) => {
            // Update user with group
            console.log(
              "Updating user ",
              req.user.userName,
              " with Group  ",
              newGroup
            );
            db.doc(`/users/${req.user.userName}`)
              .get()
              .then((doc) => {
                let existingGroups = doc.data().groups;
                console.log(
                  "User ",
                  req.user.userName,
                  " existing groups  ",
                  existingGroups
                );
                if (!existingGroups) {
                  existingGroups = [];
                }
                existingGroups.push({
                  groupId: resNewGroup.groupId,
                  isAdmin: true,
                });
                doc.ref.update({ groups: existingGroups });
                return res.json({ response: resNewGroup });
              });
          });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Patch a group
exports.patchGroup = (req, res) => {
  console.log(
    `Patching Group. Body: ${Object.keys(req.body)} Group ${req.params.groupId}`
  );
  const document = db.doc(`/groups/${req.params.groupId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (!doc.data().admins.includes(req.user.userName)) {
        return res.status(403).json({
          message: `Unauthorized. User ${req.user.userName} is not administrator of the Group ${req.params.groupId}`,
        });
      } else {
        return doc;
      }
    })
    .then((doc) => {
      console.log("Doc data: ", doc.data());

      var fields = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (key === "imageUrl") {
          if (Array.isArray(value)) {
            return res
              .status(400)
              .json({ message: "imageUrl must be a string" });
          }
        }

        if (
          !(key === "imageUrl" || key === "description" || key === "location")
        ) {
          // TODO: Return causing error
          return res
            .status(404)
            .json({ error: `Group property ${key} can not be updated` });
        }

        if (value != null && value !== "") {
          fields[key] = value;
        }
      }
      return doc.ref.update(fields);
    })
    .then(() => {
      res.json({ message: `Group ${req.params.groupId} updated successfully` });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Delete Group: First remove from all memebrs. Then delete group
// TODO: Create member notification
exports.deleteGroup = (req, res) => {
  console.log(`Deleting group: ${req.params.groupId}`);
  const document = db.doc(`/groups/${req.params.groupId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (!doc.data().admins.includes(req.user.userName)) {
        return res.status(403).json({
          message: "Unauthorized. You need to be an admin to delete a group",
        });
      } else {
        let members = doc.data().admins.concat(doc.data().members);
        members = [...new Set(members.map((item) => item))];

        return Promise.all(
          members.map((mem) => {
            return db
              .doc(`/users/${mem}`)
              .get()
              .then((doc) => {
                let existingGroups = doc.data().groups;
                existingGroups = existingGroups.filter(
                  (el) => el.groupId != req.params.groupId
                );
                doc.ref.update({ groups: existingGroups });
              });
          })
        );
      }
    })
    .then(() => {
      return document.delete();
    })
    .then(() => {
      res.json({ message: `Group ${req.params.groupId} deleted successfully` });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.getGroupObject = async (groupId) => {
  //console.log("getUserObject: getting data for :", groupId);
  return (
    db
      .doc(`/groups/${groupId}`)
      .get()
      .catch((err) => {
        console.error("getUserImage Error ", err);
      })
  );
};