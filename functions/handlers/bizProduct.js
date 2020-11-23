const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");

exports.getBizProduct = (req, res) => {
  let bizProfile = {};

  db.doc(`/products/${req.params.productId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Product not found" });
      }
      product = doc.data();
      product.productId = doc.id;
      return res.json({response: product});
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

exports.postBizProduct = (req, res) => {
  console.log("Body ", req.body);

  //if (req.body.body.trim() === '') // Doesn't work
  if (req.body.productName.trim() === "") {
    return res.status(400).json({ message: "Biz Product Name must not be empty" });
  }

  const bizProduct = {
    inceptionDate: req.body.inceptionDate,
    createdAt: new Date().toISOString(),
    productType: req.body.productType, // TODO: Use ENUM
    description: req.body.description,
    productName: req.body.productName,
    userId: req.user.userId,
    userName: req.user.userName,
    bizProfileId: req.params.bizProfileId,
  };

  // imageUrl is optional
  if (req.body.imageUrl) {
    if (!Array.isArray(req.body.imageUrl)) {
      // Should be an array
      return res.status(400).json({ message: "imageUrl must be an array" });
    }
    bizProduct.imageUrl = req.body.imageUrl;
  }

  // TODO: Check if this name is used for same user

  console.log("Creating Biz Product ", bizProduct);
  let profileDoc = {};
  const document = db.doc(`/bizprofiles/${req.params.bizProfileId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Biz Profile not found" });
      }
      if (doc.data().bizType !== "PRODUCT") {
        return res
          .status(400)
          .json({ message: "Profle type should be PRODUCT to add new Product" });
      } else {
        profileDoc.document = doc;
        return doc;
      }
    })
    .then((profileDoc) => {
      console.log("Received Biz Profile ", profileDoc.data());
      return db
        .collection("products")
        .add(bizProduct)
        .then((doc) => {
          const resbizProduct = bizProduct;
          resbizProduct.productId = doc.id;
          console.log("Added Product ", resbizProduct);
          return resbizProduct;
        });
    })
    .then((resbizProduct) => {
      // Update Biz Profile with bizProduct
      // TODO: What if the profile doesn't exists
      console.log(
        "Updating biz profile ",
        req.params.bizProfileId,
        profileDoc.document.data(),
        " with biz product  ",
        resbizProduct
      );
      let existingProducts = profileDoc.document.data().products;
      console.log(
        "Biz Profile ",
        req.params.bizProfileId,
        " existing biz profiles  ",
        existingProducts
      );

      if (!existingProducts) {
        existingProducts = [];
      }
      existingProducts.push({
        productId: bizProduct.productId,
        productName: bizProduct.productName,
      });
      profileDoc.document.ref.update({ products: existingProducts });
      return res.json({response: bizProduct});
    })
    .catch((err) => {
      console.error(err);
      res
        .status(500)
        .json({ error: `postbizProduct: Something went wrong ${err.message}` });
    });
};

exports.patchBizProduct = (req, res) => {
  console.log(`Patching Product Body: ${Object.keys(req.body)} product ${req.params.productId}`);
  const document = db.doc(`/products/${req.params.productId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res
          .status(403)
          .json({
            message: "Unauthorized. Can not update other user's Product",
          });
      } else {
        return doc;
      }
    })
    .then((doc) => {
      console.log("Doc data: ", doc.data());
      // TODO: Validating if fields exist. We might need to allow to enter fields
      for (const [key, value] of Object.entries(req.body)) {
        if (key === "imageUrl") {
          //Allow imageUrl to be inserted if not present
          continue;
        }
        if (!doc.data().hasOwnProperty(key)) {
          // TODO: Return causing error
          return res
            .status(404)
            .json({ message: `Product property ${key} not found` });
        }
      }
      return doc.ref.update(req.body);
    })
    .then(() => {
      res.json({message: `Product ${req.params.productId} updated successfully`});
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Delete a biz profile
// TODO: Delete image
exports.deleteBizProduct = (req, res) => {
  let bizProfileId;
  console.log(`Deleting Product: ${req.params.productId}`);
  const document = db.doc(`/products/${req.params.productId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ message: "Product not found" });
      }
      if (doc.data().userName !== req.user.userName) {
        return res
          .status(403)
          .json({ message: "Unauthorized. Can not delete other user's product" });
      } else {
        bizProfileId = doc.data().bizProfileId;
        return document.delete();
      }
    })
    .then(() => {
      //Update user
      db.doc(`/bizprofiles/${bizProfileId}`)
        .get()
        .then((doc) => {
          console.log(
            `Updating biz profile ${bizProfileId} to remone product ${req.params.productId}`
          );

          return doc.ref.update({
            products: doc
              .data()
              .products.filter((v) => v.productId != `${req.params.productId}`),
          });
        });
    })
    .then(() => {
      res.json({ message: "product deleted successfully" });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: `${err}` });
    });
};

// Upload a profile image for profile
exports.uploadProductImage = (req, res) => {
  console.log("Uploading image for profile:", req);
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageToBeUploaded = {};
  let imageFileName;
  // TODO: String for image token
  //let generatedToken = uuid();

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong file type submitted" });
    }
    // my.image.png => ['my', 'image', 'png']
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    // 32756238461724837.png
    imageFileName = `${req.user.userName}-product-${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket(config.storageBucket)
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
            //Generate token to be appended to imageUrl
            //firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        console.log("Uploading product image for user:", req.user);
        // Append token to url
        //const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
        console.log("Uploaded product image: ", imageUrl);
        res.json(imageUrl);
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "something went wrong" });
      });
  });
  busboy.end(req.rawBody);
};
