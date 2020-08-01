const functions = require('firebase-functions');
const app = require('express')();
const fireBaseAuth = require('./util/fireBaseAuth');

//APIs
const { getAllBarks, postBark } = require('./handlers/barks');
const { loginUser, signupUser } = require('./handlers/users');

///// APIS /////

// Get Barks routes
app.get('/barks', getAllBarks);
app.post('/barks', fireBaseAuth, postBark);
// Users route
app.post('/signup', signupUser);
app.post('/login', loginUser);

// Export Route starting with api as /api/barks
exports.api = functions.https.onRequest(app);
