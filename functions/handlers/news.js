const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");
const { getUserImageUrl } = require("./users");

// Get News
exports.getAllNews = (req, res) => {
  let news = [];
  db.collection("news")
    .orderBy("createdAt", "desc")
    .limit(15)
    .get()
    .then((data) => {
      data.forEach((element) => {
        news.push({
          newsId: element.id,
          createdAt: element.data().createdAt,
          hashTag: element.data().hashTag,
          imageUrl: element.data().imageUrl,
          message: element.data().message,
          subject: element.data().subject,
          userId: element.data().userId,
          userName: element.data().userName,
          externalLink: element.data().externalLink,
        });
      });
      return news;
    })
    .then((data) => {
      const unique = [...new Set(data.map((item) => item.userName))];
      console.log("Unique users in News :", unique);
      return Promise.all(
        unique.map((userId) => {
          return getUserImageUrl(userId);
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
      news.forEach((newsItem) => {
        if (map[newsItem.userName]) {
          newsItem.userImageUrl = map[newsItem.userName];
        }
      });
      return res.json(news);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Get a News
exports.getNews = (req, res) => {
  let newsItem = {};

  db.doc(`/news/${req.params.newsId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "News Item not found" });
      }
      newsItem = doc.data();
      newsItem.newsId = doc.id;
      return getUserImageUrl(newsItem.userName);
    })
    .then((data) => {
      if (data) {
        newsItem.userImageUrl = data.data().imageUrl;
      }
      return res.json(newsItem);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ errorCode: err.code, errordetails: err.details });
    });
};

// Post a News
exports.postNews = (req, res) => {
  console.log("Body ", req.body);

  if (req.body.message.trim() === "") {
    return res.status(400).json({ body: "Body must not be empty" });
  }

  const newNews = {
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
    newNews.imageUrl = req.body.imageUrl;
  }

  if (req.body.hashTag) {
    newNews.hashTag = req.body.hashTag;
  }
  if (req.body.externalLink) {
    newNews.externalLink = req.body.externalLink;
  }

  if (newNews.imageUrl && !Array.isArray(newNews.imageUrl)) {
    return res.status(400).json({ body: "imageUrl must be an array" });
  }

  console.log("Creating News Item ", newNews);

  db.collection("news")
    .add(newNews)
    .then((doc) => {
      const resNewsItem = newNews;
      resNewsItem.newsId = doc.id;
      res.json(resNewsItem);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: `Something went wrong ${err.message}` });
    });
};

// Patch a News
exports.patchNews = (req, res) => {
  console.log(
    `Patching News. Body: ${Object.keys(req.body)} News ${req.params.newsId}`
  );
  const document = db.doc(`/news/${req.params.newsId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "News not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res.status(403).json({
          error: "Unauthorized. Can not update other user's News",
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
            return res.status(400).json({ body: "imageUrl must be an array" });
          }
          //Allow imageUrl to be inserted if not present
          //continue;
        }
        /*if (!doc.data().hasOwnProperty(key)) {
          // TODO: Return causing error
          return res
            .status(404)
            .json({ error: `News property ${key} not found` });
        }*/
        if (value != null && value !== "") {
          fields[key] = value;
        }
      }
      return doc.ref.update(fields);
    })
    .then(() => {
      res.json(`News ${req.params.newsId} updated successfully`);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Delete a News
exports.deleteNews = (req, res) => {
  console.log(`Deleting news: ${req.params.newsId}`);
  const document = db.doc(`/news/${req.params.newsId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "News not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res
          .status(403)
          .json({ error: "Unauthorized. Can not delete other user's news" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "News deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};