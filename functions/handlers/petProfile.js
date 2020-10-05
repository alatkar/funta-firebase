const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");

exports.getPetProfile = (req, res) => {
    let petProfile = {};
  
    db.doc(`/petprofiles/${req.params.petProfileId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "PetProfile not found" });
        }
        petProfile = doc.data();
        petProfile.petProfileId = doc.id;
        return res.json(petProfile);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ errorCode: err.code, errordetails: err.details });
      });
};

exports.postPetProfile = (req, res) => {
    console.log("Body ", req.body);
  
    //if (req.body.body.trim() === '') // Doesn't work
    if (req.body.petProfileName.trim() === "") {
      return res.status(400).json({ body: "Pet Profile Name must not be empty" });
    }
  
    const newPetProfile = {
      birthDay: req.body.birthDay,
      createdAt: new Date().toISOString(),          
      gender: req.body.gender,
      breed: req.body.breed,
      petProfileName: req.body.petProfileName,
      userId: req.user.userId,
      userName: req.user.userName,
    };
    
    // imageUrl is optional
    if(req.body.imageUrl)
    {
        if(Array.isArray(req.body.imageUrl)) // Should be string not array
        {
            return res.status(400).json({ body: "imageUrl must be a string" });
        }
        newPetProfile.imageUrl = req.body.imageUrl;
    }

    // TODO: Check if this name is used
       
    console.log("Creating Pet Profile ", newPetProfile);
  
    db.collection("petprofiles")
      .add(newPetProfile)
      .then((doc) => {
        const resPetProfile = newPetProfile;
        resPetProfile.petProfileId = doc.id;
        return resPetProfile;
      })
      .then( (resPetProfile) => { // Update user with petProfile
        console.log("Updating user " , req.user.userName, " with Pet profile  ", newPetProfile);
        db.doc(`/users/${req.user.userName}`)
        .get()
        .then((doc) => {
            let existingProfiles = doc.data().petProfiles;
            console.log("User " , req.user.userName, " existing Pet profiles  ", existingProfiles);
            if(!existingProfiles)
            {
                existingProfiles = [];
            }            
            existingProfiles.push(
                { 
                    petProfileId: resPetProfile.petProfileId,
                    petProfileName: resPetProfile.petProfileName
                }
            );
            doc.ref.update({petProfiles: existingProfiles})
            return res.json(resPetProfile);
        })
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: `postPetProfile: Something went wrong ${err.message}` });
      });
  };
  

// Upload a profile image for profile
exports.uploadProfileImage = (req, res) => {
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
      imageFileName = `${req.user.userName}-profile-${Math.round(
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
          console.log("Uploading profile image for user:", req.user);
          // Append token to url
          //const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media&token=${generatedToken}`;
          const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
          console.log("Uploaded profile image: ", imageUrl);
          res.json(imageUrl);
        })
        .catch((err) => {
          console.error(err);
          return res.status(500).json({ error: "something went wrong" });
        });
    });
    busboy.end(req.rawBody);
  };

  // Delete a pet profile 
 // TODO: Delete image
exports.deletePetProfile = (req, res) => {
  console.log(`Deleting PetProfile: ${req.params.petProfileId}`);
  const document = db.doc(`/petprofiles/${req.params.petProfileId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'PetProfile not found' });
      }
      if (doc.data().userName !== req.user.userName) {
        return res.status(403).json({ error: "Unauthorized. Can not delete other user's PetProfile" });
      } else {
        // TODO: ALso delete likes.
        return document.delete();
      }
    })
    .then(() => { //Update user      
      db.doc(`/users/${req.user.userName}`)
        .get()
        .then((doc) => {
          console.log(`Updating user PetProfile: ${req.params.petProfileId}`);
          
          return doc.ref.update({
            petProfiles: doc.data().petProfiles.filter(v => v.petProfileId != `${req.params.petProfileId}`)
          })
        })
    })
    .then(() => {
      res.json({ message: 'PetProfile deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};