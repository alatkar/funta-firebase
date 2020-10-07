const { admin, db } = require("../util/admin");
const config = require("../util/config");
const enumDefinations = require("../util/enums");

exports.getBizProfile = (req, res) => {
    let bizProfile = {};
  
    db.doc(`/bizprofiles/${req.params.bizProfileId}`)
      .get()
      .then((doc) => {
        if (!doc.exists) {
          return res.status(404).json({ error: "Biz Profile not found" });
        }
        bizProfile = doc.data();
        bizProfile.bizProfileId = doc.id;
        return res.json(bizProfile);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ errorCode: err.code, errordetails: err.details });
      });
};

exports.postBizProfile = (req, res) => {
    console.log("Body ", req.body);
  
    //if (req.body.body.trim() === '') // Doesn't work
    if (req.body.bizProfileName.trim() === "") {
      return res.status(400).json({ body: "Biz Profile Name must not be empty" });
    }
  
    const bizProfile = {
      inceptionDate: req.body.inceptionDate,
      createdAt: new Date().toISOString(),          
      bizType: req.body.bizType,  // TODO: Use ENUM
      description: req.body.description,
      bizProfileName: req.body.bizProfileName,
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
        bizProfile.imageUrl = req.body.imageUrl;
    }

    // TODO: Check if this name is used
       
    console.log("Creating Biz Profile ", bizProfile);
  
    db.collection("bizprofiles")
      .add(bizProfile)
      .then((doc) => {
        const resBizProfile = bizProfile;
        resBizProfile.bizProfileId = doc.id;
        return resBizProfile;
      })
      .then( (bizProfile) => { // Update user with bizProfile
        console.log("Updating user " , req.user.userName, " with biz profile  ", bizProfile);
        db.doc(`/users/${req.user.userName}`)
        .get()
        .then((doc) => {
            let existingProfiles = doc.data().bizProfiles;
            console.log("User " , req.user.userName, " existing biz profiles  ", existingProfiles);
            if(!existingProfiles)
            {
                existingProfiles = [];
            }            
            existingProfiles.push(
                { 
                    bizProfileId: bizProfile.bizProfileId,
                    bizProfileName: bizProfile.bizProfileName
                }
            );
            doc.ref.update({bizProfiles: existingProfiles})
            return res.json(bizProfile);
        })
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: `postbizProfile: Something went wrong ${err.message}` });
      });
  };

 // Delete a biz profile 
 // TODO: Delete image
exports.deleteBizProfile = (req, res) => {
  console.log(`Deleting BizProfile: ${req.params.bizProfileId}`);
  const document = db.doc(`/bizprofiles/${req.params.bizProfileId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'BizProfile not found' });
      }
      if (doc.data().userName !== req.user.userName) {
        return res.status(403).json({ error: "Unauthorized. Can not delete other user's BizProfile" });
      } else {
        // TODO: ALso delete likes.
        return document.delete();
      }
    })
    .then(() => { //Update user      
      db.doc(`/users/${req.user.userName}`)
        .get()
        .then((doc) => {
          console.log(`Updating user BizProfile: ${req.params.bizProfileId}`);
          
          return doc.ref.update({
            bizProfiles: doc.data().bizProfiles.filter(v => v.bizProfileId != `${req.params.bizProfileId}`)
          })
        })
    })
    .then(() => {
      res.json({ message: 'BizProfile deleted successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.patchBizProfile = (req, res) => {
  //console.log(`Patching PetProfile Body: ${Object.keys(req.body)}`);
  const document = db.doc(`/bizprofiles/${req.params.bizProfileId}`);
  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'BizProfile not found' });
      }
      if (doc.data().userName !== req.user.userName) {
        return res.status(403).json({ error: "Unauthorized. Can not update other user's BizProfile" });
      } else {
        return doc;
      }
    })
    .then((doc) => { //Update user  
      console.log("Doc data: ", doc.data());
      // TODO: Validating if fields exist. We might need to allow to enter fields
      for (const [key, value] of Object.entries(req.body)) {
        if(key === "imageUrl") { //Allow imageUrl to be inserted if not present
          continue;
        }
        if(!doc.data().hasOwnProperty(key))
        {
          // TODO: Return causing error
          return res.status(404).json({ error: `BizProfile property ${key} not found` });
        }
        //console.log(`${key}: ${value}`);
      }      
      return doc.ref.update(req.body)      
    })
    .then(() => {
      res.json(`Biz Profile ${req.params.bizProfileId} updated successfully`);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};