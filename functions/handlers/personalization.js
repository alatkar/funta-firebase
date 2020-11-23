const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");

exports.getPersonalPetProfile = (req, res) => {
  let petProfile = [];

  db.collection("petprofiles")
    .orderBy("createdAt", "desc")
    .limit(2)
    .get()
    .then((data) => {
        data.forEach((element) => {
            let elem = element.data();
            elem.petProfileId = element.id
            petProfile.push(elem);
        })
      return petProfile;
    })
    .then( (data) => {
        res.json({response: data});
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};


exports.getPersonalProducts = (req, res) => {
    let products = [];
  
    db.collection("products")
      .orderBy("createdAt", "desc")
      .limit(2)
      .get()
      .then((data) => {
          data.forEach((element) => {
              let elem = element.data();
              elem.productId = element.id;
              products.push(elem);
          })
        return products;
      })
      .then( (data) => {
          res.json({response: data});
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ message: `${err}` });
      });
  };

  exports.getPersonalServices = (req, res) => {
    let products = [];
  
    db.collection("bizprofiles")
      .where("bizType", "==", "SERVICE")
      .orderBy("createdAt", "desc")
      .limit(2)
      .get()
      .then((data) => {
          data.forEach((element) => {
              let elem = element.data();
              elem.bizProfileId = element.id;
              products.push(elem);
          })
        return products;
      })
      .then( (data) => {
          res.json({response: data});
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ message: `${err}` });
      });
  };