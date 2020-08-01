const { db } = require("../util/admin");

exports.getAllBarks = (req, res) => {
  db.collection('barks')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      let barks = [];
      data.forEach((element) => {
        // TODO: Use spread syntax if it is allowed
        barks.push({
          barkId: element.id,
          message: element.data().message,
          userName: element.data().userName,
          userId: element.data().userId,
          createdAt: element.data().createdAt,
        });
      });
      return res.json(barks);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.postBark = (req, res) => {
  console.log("Body ", req.body);

  //if (req.body.body.trim() === '') // Doesn't work
  if (req.body.message.trim() === '') {
    return res.status(400).json({body: 'Body must not be empty'});
  }

  const newBark = {
    message: req.body.message,
    userName: req.user.userName,
    userId: req.user.userId,
    //createdAt: admin.firestore.Timestamp.fromDate(new Date())
    createdAt: new Date().toISOString(),
  };

  console.log("Creating bark ", newBark);

  db.collection('barks')
    .add(newBark)
    .then((doc) => {      
      res.json({ message: `document ${doc.id} create successfully!` });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: `Something went wrong ${err.message}` });      
    });
};
