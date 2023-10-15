/**     TRADING CARD GAME - GAME SERVER
 * primary processing segment for processing the tcg framework's server.
 *
 * core functionality:
 *  - player exp/levels
 *  - player decks/card sets
 *  - game table management (join, leave, start, game processes)
 *
 * note: file requires strict syntax
 */

// ensure debug is off before deploy
// const isDebugging = false;

// ### REQUIRED IMPORTS ###
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";

// import * as profile from "./api-profile";

// ### ACCOUNT LOGGING ###
// service account login details
// import * as serviceAccount from "../permissions.json";
const serviceAccount = require("../permissions.json");
// initialize admin account details
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://decentraland-tcg-server.firebaseio.com",
});

// create database instance
const db = admin.firestore();

// create app instance
const app = express();
app.use(cors({origin: true}));

// ### ROUTE - EXAMPLES ###
// you can either keep these or remove them,
// they are provided purely for reference/examples

// get (requests a single information piece)
// ping, returns a simple piece of text
app.get("/hello-world", (req, res) => {
  return res.status(200).send("Hello World UwU");
});

// post (send data that should be added to the database)
// create, \
app.post("/api/create", (req, res) => {
  // interactions with the database are timed/can time-out, so async is required
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // attempt to create new element in document
      await db.collection("cards").doc("/"+req.body.id+"/").create({
        name: req.body.name,
        desc: req.body.desc,
      });

      // if nothing failed, we'll return a successful response
      return res.status(200).send();
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.status(500);
    }
  })();
});

// get
// read

// put
// update

// delete
//

// ### ROUTE - profile ###
// returns the profile at the given id's location
app.get("/api/get-profile/:id", (req, res) => {
  (async () => {
    try {
      // ping decentraland to ensure player is actually in-game

      // create return capsule
      /* let playerData = {
        // last time player was logged in
        LastLogin: -1,
        // progression
        Experience: 0,
        // decks
        Deck0: "",
        Deck1: "",
        Deck2: "",
        Deck3: "",
        Deck4: "",
      };*/

      // get required document
      const document = db.collection("player-profiles").doc(req.params.id);
      //  process document to derive player's stats
      let playerData = await document.get();
      // load values into player data
      let response = playerData.data();
      
      /* if (playerData) {

        // update last login to current time
        // document.update({ LastLogin: new Date() });
      } else {
        // write player defaults to store
        // document.update(playerData);
      }

      // attempt to create new element in document
      await db.collection("cards").doc("/"+req.body.id+"/").create({
        name: req.body.name,
        desc: req.body.desc,
      });*/

      // if nothing failed, we'll return a successful response
      return res.status(200).send(response);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  })();
});


// export api to cloud functions, executes upon new request
exports.app = functions.https.onRequest(app);
