const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");

exports.getCategory = (req, res) => {
  var cats = ["LIFEEVENTS", "BREEDS"];
  if(!cats.includes(req.params.category))
  {
    return res
      .status(400)
      .json({ message: `Not a valid category. Only Categories allowed are ${cats}` });
  }  

  if(req.params.category === "LIFEEVENTS")
  {
    return res.json({ response: ["Birth", "Adoption", "Accident", "Medical", "Death"] });
  }
  if(req.params.category === "BREEDS")
  {
    return res.json({ response: ["Birth", "Adoption", "Accident", "Medical", "Death"] });
  }
  else
  {
    return res
      .status(400)
      .json({ message: `Not a valid category. Only Categories allowed are ${cats}` });
  }

  db.doc(`/categories/${req.params.category}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Category type not found" });
      }
      category = doc.data();
      //category.categoryId = doc.id;
      return res.json({ response: category });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.getAllCategories = (req, res) => {
  let categories = [];

  db.collection("categories")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      data.forEach((element) => {
        var value = element.data();
        value.id = element.id;
        categories.push(value);
      });
      return res.json({ response: categories });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

function isAlphabeticString(str) {
  return /^[a-zA-Z]+$/.test(str);
}

exports.postCategory = (req, res) => {

  // All should be Alphabetic
  if(!isAlphabeticString(req.params.category) || !isAlphabeticString(req.body.type))
  {
    return res
      .status(400)
      .json({ message: `Not valid data. Only alphabets are accepted in Category, type and subType` });
  }
  if(req.body.subType && !isAlphabeticString(req.body.subType))
  {
    return res
      .status(400)
      .json({ message: `Not valid data. Only alphabets are accepted in Category, type and subType` });
  }

  // Crude check to maintain only needed Categories. Add new category here
  var cats = ["SERVICES", "PRODUCTS", "LIFEEVENTS"];
  if(!cats.includes(req.params.category))
  {
    return res
      .status(400)
      .json({ message: `Not a valid category. Only Categories allowed are ${cats}` });
  }  

  console.log("Body ", req.body);

  //if (req.body.body.trim() === '') // Doesn't work
  if (req.body.type.trim() === "" || req.body.description.trim() === "") {
    return res
      .status(400)
      .json({ message: "Please provide type and description" });
  }

  const categories = { 
  };

  const newCategory = {
    type: req.body.type.toUpperCase(),
    name: req.body.name,    
    description: req.body.description,
    createdAt: new Date().toISOString(),
    //userName: req.user.userName,
    //userId: req.user.userId,
  };
  
  if(req.body.subType)
  {
    newCategory.subType = req.body.subType.toUpperCase();
  }

  const data = [];
  data.push(newCategory);
  categories.types = data;

  console.log("Creating Category ", newCategory);

  db.doc(`/categories/${req.params.category}`)
    .set(categories)
    .then(() => {
      return res.json({ response: categories });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Patch a Resource
exports.patchCategory = (req, res) => {
  console.log(
    `Patching Category. Body: ${Object.keys(req.body)} Category ${
      req.params.type
    }`
  );

  //if (req.body.body.trim() === '') // Doesn't work
  if (
    req.body.type.trim() === "" ||
    req.body.type.trim() === "" ||
    req.body.description.trim() === ""
  ) {
    return res
      .status(400)
      .json({ message: "Please provide type and description" });
  }

  const newCategory = {
    type: req.body.type,
    description: req.body.description,
    createdAt: new Date().toISOString(),
    userName: req.user.userName,
    userId: req.user.userId,
  };

  const document = db.doc(`/categories/${req.params.type}`);
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
            return res
              .status(400)
              .json({ message: "imageUrl must be an array" });
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
      res.json({
        message: `Resource ${req.params.resourceId} updated successfully`,
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};
