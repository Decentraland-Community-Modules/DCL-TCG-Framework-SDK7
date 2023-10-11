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
const isDebugging = false;

// ### FUNCTIONS ###
import * as functions from "firebase-functions";

// ### AUTHORIZATION ###
import admin = require("firebase-admin");

// ### ACCOUNT LOGGING ###
// service account login details
const serviceAccount = "./project-service-login.json";
// initialize admin account details 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://decentraland-tcg-server.firebaseio.com",
});
// initialize database interface object
const db = admin.firestore();

// ### DATA PROCESSES ###
// grab function interface
// const functions = require('firebase-functions'); //legacy
// server instance manager
import express = require("express");
// external interface for return data
import cors = require("cors");
// create server
const app = express();
// set action
app.use(cors({origin: true}));
// finalize and set live
exports.app = functions.https.onRequest(app);


// ### FUNCTIONAL PROCESSES ###
//  a document's title is created as: userID + "-" + difficulty
//  highscores use the player's DCL id (not username) as the collection title
//  a player can only hold a single highscore in any given difficulty
//  only 10 highscores are kept for each difficulty
//  scores sent from static/undeployed scenes will not be accepted
// get collections by difficulty
const highscoresCollections =
[
  db.collection("Highscores-VeryEasy"),
  db.collection("Highscores-Easy"),
  db.collection("Highscores-Normal"),
  db.collection("Highscores-Hard"),
  db.collection("Highscores-VeryHard"),
];

// attempts to get highscores from collection
//  returns all highscores recorded for each difficulty
app.get("/get-highscores", async (req: any, res: any) => {
  try {
    if (isDebugging) {
      console.log("attempting to return highscores...");
    }
    // get highscores for each difficulty, adding each result to the response
    const response:any = [[], [], [], [], []];
    let result;
    for (let i = 0; i < highscoresCollections.length; i++) {
      result = await highscoresCollections[i].get().then(
          (queryResult: { docs: any }) => {
            for (const doc of queryResult.docs) {
              response[i].push(doc.data());
            }
          }
      );
      if (isDebugging) {
        console.log("processed difficulty "+i.toString()+", result: "+result);
      }
    }
    if (isDebugging) {
      console.log("highscores returned!");
    }
    return res.status(200).send(response);
  // error recieved
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});

// attempts to add a highscore to the collection
app.post("/add-highscore", async (req: any, res: any) => {
  const newHighscore = JSON.parse(req.body);
  // let hs:string[] = req.body.split('"');
  try {
    const difficulty = newHighscore.difficulty;
    if (isDebugging) {
      console.log("writing new highscore for difficulty "+difficulty+"...");
    }
    const userID = newHighscore.userID;
    if (isDebugging && userID == undefined) {
      console.log("error: userID is undefined, possible corruption..."); return;
    }
    if (isDebugging) {
      console.log("creating highscore for user: "+userID);
    }

    // grab collection pointer and get highscores
    const highscoresCollection = highscoresCollections[difficulty];
    const response:any = [];
    await highscoresCollection.get().then(
        (queryResult: { docs: any }) => {
          for (const doc of queryResult.docs) {
            response.push(doc);
          }
        }
    );

    // check for dupe player
    let copyFound = false;
    let updateRequired = true;
    for (const doc of response) {
      if (isDebugging) {
        console.log("checking user: "+doc.id);
      }
      // if user already has a highscore
      if (doc.id === userID) {
        if (isDebugging) {
          console.log("user already has a highscore: old="+
          doc.data().score+", new="+newHighscore.score);
        }
        copyFound = true;

        // compare scores, allowing better (faster time) result to exist
        if (Number(doc.data().score) < Number(newHighscore.score)) {
          updateRequired = false;
        }

        break;
      }
    }
    // if player already has score
    if (copyFound) {
      // record score is better, finished
      if (!updateRequired) {
        if (isDebugging) {
          console.log("user's previous highscore is better");
        }
        return res.status(200).send("new highscore accepted");
      }

      // delete old score
      if (isDebugging) {
        console.log("removing user's previous highscore");
      }
      await highscoresCollection.doc("/" + userID + "/").delete();
    }

    // create new record
    const highscore = {
      // date/time achieved
      date: newHighscore.date,
      // current display name for user (recorded here b.c this can change)
      username: newHighscore.username,
      // DCL location
      location: newHighscore.location,
      // score
      score: newHighscore.score,
    };
    // add record to response
    response.push(highscore);
    // write new score to record
    await highscoresCollection.doc("/" + userID + "/").create(highscore);
    if (isDebugging) {
      console.log("highscore written!");
    }

    // check highscore count for that difficulty
    if (isDebugging) {
      console.log("checked highscore count: "+response.length.toString());
    }
    // if too many highscores exist
    while (response.length > 10) {
      if (isDebugging) {
        console.log("too many highscores found");
      }
      let target = 0;
      // culling can occur when parsing list, leading to length changes
      const size:number = response.length;
      // process each highscore getting highest value (slowest time)
      for (let i=size-1; i>=0; i--) {
        if (isDebugging) {
          console.log("checking user: "+response[i].id+
            ", score: "+response[i].data().score);
        }

        // remove any garbage data
        if (response[i].data().score == undefined) {
          if (isDebugging) {
            console.log("bad data found for user: "+ response[i].id);
          }
          await highscoresCollection.doc("/"+response[i].id+"/").delete();
          continue;
        }

        // compare score to current target
        if (response[i].data().score > response[target].data().score) {
          target = i;
        }
      }
      // remove score from database
      if (isDebugging) {
        console.log("user "+response[target].id+
          " had lowest score, culling...");
      }
      await highscoresCollection.doc("/"+response[target].id+
        "/").delete();
      // clear score from local array
      response[target] = response[response.length-1];
      response.pop(target);
    }

    // send success confirmation
    return res.status(200).send("new highscore accepted");
  // error recieved
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
});
