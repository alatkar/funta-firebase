// JHelpers
const isEmpty = (string) => {
  if (string.trim() === "") return true;
  else return false;
};

const isEmail = (email) => {
  const regEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(regEx)) return true;
  return false;
};

exports.validateSignupData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(data.email)) {
    errors.email = "Must be valid";
  }
  if (isEmpty(data.password)) errors.password = "Must not be empty";
  if (data.password !== data.confirmPassword)
    errors.password = `Passwords must match: ${data.password} ${data.confirmPassword}`;
  if (isEmpty(data.userName)) errors.userName = "Must not be empty";
  else {
    if (data.userName.indexOf(" ") != -1)
      errors.userName = "No spaces allowed in username";
    if (data.userName.toLowerCase() != data.userName)
      errors.userName = errors.userName
        ? errors.userName + ". Only lower case characters are allowed"
        : "Only lower case characters are allowed";
    var regex = /[ !@#$%^&*()+\=\[\]{};':"\\|,<>\/?]/g;
    if (regex.test(data.userName))
      errors.userName = errors.userName
        ? errors.userName + ". Special charactes are not allowed"
        : "Special charactes are not allowed";
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.validateLoginData = (data) => {
  let errors = {};

  if (isEmpty(data.email)) errors.email = "Must not be empty";
  if (isEmpty(data.password)) errors.password = "Must not be empty";

  return {
    errors,
    valid: Object.keys(errors).length === 0 ? true : false,
  };
};

exports.reduceUserDetails = (data, prevData) => {
  let userDetails = {};

  if (data.bio && !isEmpty(data.bio.trim())) userDetails.bio = data.bio;
  if (data.website && !isEmpty(data.website.trim())) {
    // https://website.com
    if (data.website.trim().substring(0, 4) !== "http") {
      userDetails.website = `http://${data.website.trim()}`;
    } else userDetails.website = data.website;
  }
  if (data.location && !isEmpty(data.location.trim()))
    userDetails.location = data.location;
    
  if (
    data.imageUrl &&
    !isEmpty(data.imageUrl.trim()) &&
    (!prevData.imageUrl || prevData.imageUrl != data.imageUrl.trim())
  ) {
    userDetails.imageUrl = data.imageUrl;
    // Update imageUrlSmall: and thumbnail:
    let loc = data.imageUrl.lastIndexOf(".");
    var extension = data.imageUrl.substring(loc + 1, loc + 5).toLowerCase();
    if (extension != "jfif") {
      var result = data.imageUrl.splice(loc, 0, "_200x200");
      userDetails.thumbnail = result;
      result = data.imageUrl.splice(loc, 0, "_600x600");
      userDetails.imageUrlSmall = result;
    } else {
      userDetails.imageUrlSmall = "";
      userDetails.thumbnail = "";
    }
  }

  return userDetails;
};

String.prototype.splice = function (idx, rem, str) {
  return this.slice(0, idx) + str + this.slice(idx + Math.abs(rem));
};
