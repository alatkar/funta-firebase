const { admin, db } = require("../util/admin");
const { getUserObject } = require("./users");

// Get Resources
exports.getAllResources = (req, res) => {
  let resources = [];
  db.collection("resources")
    .orderBy("createdAt", "desc")
    .limit(15)
    .get()
    .then((data) => {
      data.forEach((element) => {
        resources.push({
          resourceId: element.id,
          createdAt: element.data().createdAt,
          hashTag: element.data().hashTag,
          imageUrl: element.data().imageUrl,
          message: element.data().message,
          subject: element.data().subject,
          userId: element.data().userId,
          userName: element.data().userName,
          //externalLink: element.data().externalLink,
        });
      });
      return resources;
    })
    .then((data) => {
      const unique = [...new Set(data.map((item) => item.userName))];
      console.log("Unique users in Resources :", unique);
      return Promise.all(
        unique.map((userId) => {
          return getUserObject(userId);
        })
      );
    })
    .then((data) => {
      // Create Map of userName to userImages
      let map = [];
      data.forEach((elem) => {
        map[elem.data().userName] = elem.data().imageUrl;
        console.log("Got image uri: ", elem.data().imageUrl);
      });
      resources.forEach((resourceItem) => {
        if (map[resourceItem.userName]) {
          resourceItem.userImageUrl = map[resourceItem.userName];
        }
      });
      return res.json({response: resources});
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Get a Resource
exports.getResource = (req, res) => {
  let resource = {};

  db.doc(`/resources/${req.params.resourceId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Resource Item not found" });
      }
      resource = doc.data();
      resource.resourceId = doc.id;
      return getUserObject(resource.userName);
    })
    .then((data) => {
      if (data) {
        resource.userImageUrl = data.data().imageUrl;
      }
      return res.json({response: resource});
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Post a Resource
exports.postResource = (req, res) => {
  console.log("Body ", req.body);

  if (req.body.message.trim() === "") {
    return res.status(400).json({ message: "Body must not be empty" });
  }

  const newResource = {
    createdAt: new Date().toISOString(),
    subject: req.body.subject,
    message: req.body.message,
    // TODO: Hashtag should be required
    //hashTag: req.body.hashTag,
    userId: req.user.userId,
    userName: req.user.userName,
  };

  // imageUrl is optional
  if (req.body.imageUrl) {
    newResource.imageUrl = req.body.imageUrl;
  }

  if (req.body.hashTag) {
    newResource.hashTag = req.body.hashTag;
  }
  if (req.body.externalLink) {
    newResource.externalLink = req.body.externalLink;
  }

  if (newResource.imageUrl && !Array.isArray(newResource.imageUrl)) {
    return res.status(400).json({ message: "imageUrl must be an array" });
  }

  console.log("Creating Resource Item ", newResource);

  db.collection("resources")
    .add(newResource)
    .then((doc) => {
      const resResourceItem = newResource;
      resResourceItem.resourceId = doc.id;
      res.json({response: resResourceItem});
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Patch a Resource
exports.patchResource = (req, res) => {
  console.log(
    `Patching Resource. Body: ${Object.keys(req.body)} Resource ${req.params.resourceId}`
  );
  const document = db.doc(`/resources/${req.params.resourceId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Resource not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res.status(403).json({
          message: "Unauthorized. Can not update other user's Resource",
        });
      } else {
        return doc;
      }
    })
    .then((doc) => {
      console.log("Doc data: ", doc.data());
      // TODO: Validating if fields exist. We might need to allow to enter fields
      var fields = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (key === "imageUrl") {
          if (!Array.isArray(value)) {
            return res.status(400).json({ message: "imageUrl must be an array" });
          }
          //Allow imageUrl to be inserted if not present
          //continue;
        }
        /*if (!doc.data().hasOwnProperty(key)) {
          // TODO: Return causing error
          return res
            .status(404)
            .json({ error: `Resource property ${key} not found` });
        }*/
        if (value != null && value !== "") {
          fields[key] = value;
        }
      }
      return doc.ref.update(fields);
    })
    .then(() => {
      res.json({message: `Resource ${req.params.resourceId} updated successfully`});
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Delete a Resource
exports.deleteResource = (req, res) => {
  console.log(`Deleting resource: ${req.params.resourceId}`);
  const document = db.doc(`/resources/${req.params.resourceId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Resource not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res
          .status(403)
          .json({ message: "Unauthorized. Can not delete other user's resource" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Resource deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};
