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