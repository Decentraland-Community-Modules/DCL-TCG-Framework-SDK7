/* eslint-disable */ 
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
// tcg imports
import { Table } from "./tcg-table";
import { TableTeam } from "./tcg-team";
//import { TableCard } from "./tcg-card";

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

// get -> requests a single information piece
// pings the server, returns a simple piece of text
app.get("/hello-world", (req, res) => {
  return res.status(200).send("Hello World UwU");
});

// post -> send data that should be added to the database
// creates a single entry in a collection, using attributes from provided data
app.post("/api/create", (req, res) => {
  // interactions with the database are timed/can time-out, so async is required
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // get required document
      const document = db.collection("cards").doc("/"+req.body.cardID+"/");
      //  process document to derive player's stats
      const documentData = await document.get();
      // load values into player data
      const documentJSON = documentData.data();

      // if document exists
      if(documentJSON) {
        // update document data
        await document.update({
          name: req.body.name,
          desc: req.body.desc,
        });
      } else {
        // create document data
        await document.create({
          name: req.body.name,
          desc: req.body.desc,
        });
      }

      // if nothing failed, we'll return a successful response
      return res.status(200).send();
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.sendStatus(500);
    }
  })();
});

// get -> send request to get entry from database
// read

// put ->
// update

// delete ->
// 

// ### FUNCTION - CREATE DEFAULT PROFILE ###
// returns capsule with profile defaults
function GenerateDefaultProfile() {
  return {
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
  };
}

// ### ROUTE - GET PROFILE ###
// send playerID -> return player's profile (if none exists, generates new profile)
app.get("/api/get-profile/:playerID", (req, res) => {
  (async () => { 
    try {
      // ping decentraland to ensure player is actually in-game


      // define document reference for profile
      const documentRef = db.collection("player-profiles").doc("/"+req.params.playerID+"/");
      // get document instance from reference
      const documentData = await documentRef.get();
      // get document data
      let documentJSON = documentData.data();

      // check for profile existance
      if (!documentJSON) {
        // populate default profile
        documentJSON = GenerateDefaultProfile();
        // write player defaults to store
        await documentRef.create(documentJSON);
      }

      // update last login to current time
      await documentRef.update({
        LastLogin: new Date().getTime(),
      });

      // if nothing failed, return a successful response
      return res.status(200).send(documentJSON);
    } catch (error) {
      console.log(error);
      return res.status(500);
    }
  })();
});

// ### ROUTE - GET EXPERIENCE ###
// send playerID -> return profile's experience
app.get("/api/get-exp/:playerID", (req, res) => {
  (async () => { 
    try {
      // ping decentraland to ensure player is actually in-game


      // define document reference for profile
      const documentRef = db.collection("player-profiles").doc("/"+req.params.playerID+"/");
      // get document instance from reference
      const documentData = await documentRef.get();
      // get document data
      let documentJSON = documentData.data();

      // check for profile existance
      if (!documentJSON) {
        // populate default profile
        documentJSON = GenerateDefaultProfile();
        // write player defaults to store
        await documentRef.create(documentJSON);
      }

      // trim response to just player's experience
      if(documentJSON.hasOwnProperty("Experience")) {
        documentJSON = { Experience: documentJSON.Experience };
      } else {
        documentJSON = { Experience: -1 };
      }

      // if nothing failed, return a successful response
      return res.status(200).send(documentJSON);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  })();
});

// ### ROUTE - SAVE DECK ###
// send playerID, deckID, deckSerial -> saves deck serial to deck slot in player profile
app.post("/api/set-deck", (req, res) => {
  // interactions with the database are timed/can time-out, so async is required
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // define document reference for profile
      const documentRef = db.collection("player-profiles").doc("/"+req.body.playerID+"/");
      // get document instance from reference
      const documentData = await documentRef.get();
      // get document data
      let documentJSON = documentData.data();

      // check for profile existance
      if (!documentJSON) {
        // populate default profile
        documentJSON = GenerateDefaultProfile();
        // write player defaults to store
        await documentRef.create(documentJSON);
      }

      // write deck serial to targeted deck element
      await documentRef.update({
        ["Deck"+req.body.deckID]: req.body.deckSerial,
      });

      // if nothing failed, we'll return a successful response
      return res.status(200).send();
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.sendStatus(500);
    }
  })();
});

// ### CONSTANTS - CARD TABLE ###
// how long a table can remain inactive before it resets (conversion from milliseconds to minutes)
const TABLE_INTERACTION_TIMEOUT:number = 5 * 60000;

// ### INTERFACES - CARD TABLE ###


// ### FUNCTIONS - CARD TABLE ###
// returns capsule with table defaults
function generateDefaultTableTeam():TableTeam.TableTeamData {
  const tableTeamData:TableTeam.TableTeamData = { 
    playerID: "", playerName: "",
    readyState: false,
    healthCur: 0,
    energyCur: 0, energyGain: 0,
    deckRegistered: "",
    deckSession: [],
    slotCards: [],
    terrainCard: "",
  }
  return tableTeamData;
}
// returns capsule with table defaults
function generateDefaultTable():Table.TableData {
  const tableData:Table.TableData = {
    lastInteraction: new Date().getTime(),
    // indexing
    id: 0,
    // live data
    owner: "",
    state: 0,
    turn: 0,
    round: 0,
    // teams registered to table
    teams: []
  }

  // TODO: maybe gen table teams to allow for modular sizes (ex: 2v2)
  tableData.teams.push(generateDefaultTableTeam());
  tableData.teams.push(generateDefaultTableTeam());

  return tableData;
}
// returns the targeted table from the collection
async function getTable(realmID:string, tableID:string):Promise<Table.TableData> {
  // interactions calls can fail/throw errors, so try-catch is required
  try {
    // define document reference for card table
    const documentRef = db.collection("card-tables").doc("/"+realmID+"&"+tableID+"/");
    // get document instance from reference
    const documentData = await documentRef.get();
    // get document data
    let documentJSON = documentData.data() as Table.TableData;

    // check for table's existance
    if (!documentJSON) {
      // populate default table
      documentJSON = generateDefaultTable();
      // set table id
      documentJSON.id = Number.parseInt(tableID);
      // write player defaults to store
      await documentRef.create(documentJSON);
    }

    // check for interaction time-out
    const curTime = new Date().getTime();
    const lastTime = documentJSON.lastInteraction;
    const timeDifference = curTime - lastTime;
    // console.log("expiry check: curTime="+curTime+", lastTime="+documentJSON.lastInteraction+", testTime="+timeDifference);
    if (timeDifference > TABLE_INTERACTION_TIMEOUT) {
      // populate default table
      documentJSON = generateDefaultTable();
      // set table id
      documentJSON.id = Number.parseInt(tableID);
      // write player defaults to store
      await documentRef.update(documentJSON as { [key: string]: any });
    }

    // if nothing failed, we'll return a successful response
    return documentJSON;
  } catch (error) {
    // if failure, record error and return fail status
    console.log(error);
    return generateDefaultTable();
  }
}
// updates the targeted table with the provided table data
async function updateTable(realmID:string, tableID:string, tableData:Table.TableData) {
  // interactions calls can fail/throw errors, so try-catch is required
  try {
    // define document reference for card table
    const documentRef = db.collection("card-tables").doc("/"+realmID+"&"+tableID+"/");
    // attempt to update 
    await documentRef.update(tableData as { [key: string]: any });

    // if nothing failed, we'll return a successful response
    return;
  } catch (error) {
    // if failure, record error and return fail status
    console.log(error);
    return;
  }
}

// ### ROUTE - GET GAME TABLE ###
// send: realmID, tableID
// returns table's data (used for syncing table to players)
app.post("/api/get-table", (req, res) => {
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // get table data
      const tableData:Table.TableData = await getTable(req.body.realmID, req.body.tableID);

      // if nothing failed, we'll return a successful response
      return res.status(200).send(tableData);
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.sendStatus(500);
    }
  })();
});

// ### ROUTE - SET GAME TABLE ###
// send: realmID, tableID, tableData
// sets table's data (used for localized/customized rule sets)
app.post("/api/set-table", (req, res) => {
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // get table data
      const tableData:Table.TableData = await getTable(req.body.realmID, req.body.tableID);

      // update interaction time-out
      tableData.lastInteraction = new Date().getTime();
      // take new values in from provided table serial
      tableData.id = req.body.tableData.id;
      tableData.owner = req.body.tableData.owner;
      tableData.state = req.body.tableData.state;
      tableData.turn = req.body.tableData.turn;
      tableData.round = req.body.tableData.round;
      tableData.teams = req.body.tableData.teams;
      
      // attempt to update document with new table
      await updateTable(req.body.realmID, req.body.tableID, tableData);

      // return successful response
      return res.status(200).send({ result:true });
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.status(500).send({ result:false });
    }
  })();
});

// ### ROUTE - JOIN GAME TABLE ###
// send: realmID, tableID, teamID, playerID
// attempts to add player to target team on table
app.post("/api/join-table", (req, res) => {
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // get table data
      const tableData:Table.TableData = await getTable(req.body.realmID, req.body.tableID);
      // get team data
      const teamData:TableTeam.TableTeamData = tableData.teams[req.body.teamID];

      // halt if table is not idle or targeted team is not empty
      if(tableData.state != 0 || teamData.playerID !== "") {
        // return failed response
        return res.status(200).send({ result:false });
      }

      // update interaction time-out
      tableData.lastInteraction = new Date().getTime();
      // place player into team
      teamData.playerID = req.body.playerID;
      teamData.playerName = req.body.playerName;

      // attempt to update document with new table
      await updateTable(req.body.realmID, req.body.tableID, tableData);

      // return successful response
      return res.status(200).send({ result:true });
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.status(500).send({ result:false });
    }
  })();
});

// ### ROUTE - LEAVE GAME TABLE ###
// send playerID, tableID, teamID
// attempts to remove player from target team on table
app.post("/api/leave-table", (req, res) => {
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // get table data
      const tableData:Table.TableData = await getTable(req.body.realmID, req.body.tableID);
      // get team data
      const teamData:TableTeam.TableTeamData = tableData.teams[req.body.teamID];

      // halt if table is not idle or tageted team is empty
      if(tableData.state != 0 || teamData.playerID === "") {
        // return failed response
        return res.status(200).send({ result:false });
      }

      // update interaction time-out
      tableData.lastInteraction = new Date().getTime();
      // place player into team
      teamData.playerID = "";
      teamData.playerName = "";
      // set ready stats
      teamData.readyState = false;
      teamData.deckRegistered = "";

      // attempt to update document with new table
      await updateTable(req.body.realmID, req.body.tableID, tableData);
      
      // return successful response
      return res.status(200).send({ result:true });
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.status(500).send({ result:false });
    }
  })();
});

// ### ROUTE - SET READY STATE ###
// send playerID, tableID, state, deckSerial
// attempts to set the ready state and deck serial on target table's team
app.post("/api/set-ready-state", (req, res) => {
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // get table data
      const tableData:Table.TableData = await getTable(req.body.realmID, req.body.tableID);
      // get team data
      const teamData:TableTeam.TableTeamData = tableData.teams[req.body.teamID];

      // halt if table is not idle or tageted team is empty
      if(tableData.state != 0 || teamData.playerID === "") {
        // return failed response
        return res.status(200).send({ result:false });
      }

      // update interaction time-out
      tableData.lastInteraction = new Date().getTime();
      // set ready stats
      teamData.readyState = req.body.state;
      teamData.deckRegistered = req.body.deckSerial;

      // attempt to update document with new table
      await updateTable(req.body.realmID, req.body.tableID, tableData);
      
      // return successful response
      return res.status(200).send({ result:true });
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.status(500).send({ result:false });
    }
  })();
});

// ### ROUTE - START GAME TABLE ###
// send playerID, tableID
// attempts to start game on target table
app.post("/api/start-game", (req, res) => {
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // get table data
      const tableData:Table.TableData = await getTable(req.body.realmID, req.body.tableID);

      // halt if table is not idle
      if(tableData.state != 0) {
        // return failed response
        return res.status(200).send({ result:false });
      }

      // halt if either team is empty or not ready
      for(let i=0; i<tableData.teams.length; i++) {
        if(tableData.teams[i].playerID == "" || tableData.teams[i].readyState == false) {
          // return failed response
          return res.status(200).send({ result:false });
        }
      }

      // update interaction time-out
      tableData.lastInteraction = new Date().getTime();
      
      // start game on table
      Table.StartGame(tableData);

      // attempt to update document with new table
      await updateTable(req.body.realmID, req.body.tableID, tableData);
      
      // return successful response
      return res.status(200).send({ result:true });
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.status(500).send({ result:false });
    }
  })();
});

// ### ROUTE - NEXT TURN ###
// send playerID, tableID -> attempts to end game on target table
app.post("/api/next-turn", (req, res) => {
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // get table data
      const tableData:Table.TableData = await getTable(req.body.realmID, req.body.tableID);

      // halt if table is not idle
      if(tableData.state != 0) {
        // return failed response
        return res.status(200).send({ result:false });
      }

      // halt if either team is empty or not ready
      for(let i=0; i<tableData.teams.length; i++) {
        if(tableData.teams[i].playerID == "" || tableData.teams[i].readyState == false) {
          // return failed response
          return res.status(200).send({ result:false });
        }
      }

      // update interaction time-out
      tableData.lastInteraction = new Date().getTime();
      
      // start game on table
      Table.StartGame(tableData);

      // attempt to update document with new table
      await updateTable(req.body.realmID, req.body.tableID, tableData);
      
      // return successful response
      return res.status(200).send({ result:true });
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.status(500).send({ result:false });
    }
  })();
});

// ### ROUTE - END GAME TABLE ###
// send playerID, tableID -> attempts to end the current turn on target table
app.post("/api/end-game", (req, res) => {
  (async () => {
    // interactions calls can fail/throw errors, so try-catch is required
    try {
      // get table data
      const tableData:Table.TableData = await getTable(req.body.realmID, req.body.tableID);

      // halt if table is not idle
      if(tableData.state != 0) {
        // return failed response
        return res.status(200).send({ result:false });
      }

      // halt if either team is empty or not ready
      for(let i=0; i<tableData.teams.length; i++) {
        if(tableData.teams[i].playerID == "" || tableData.teams[i].readyState == false) {
          // return failed response
          return res.status(200).send({ result:false });
        }
      }

      // update interaction time-out
      tableData.lastInteraction = new Date().getTime();
      
      // start game on table
      Table.StartGame(tableData);

      // attempt to update document with new table
      await updateTable(req.body.realmID, req.body.tableID, tableData);
      
      // return successful response
      return res.status(200).send({ result:true });
    } catch (error) {
      // if failure, record error and return fail status
      console.log(error);
      return res.status(500).send({ result:false });
    }
  })();
});

// export api to cloud functions, executes upon new request
exports.app = functions.https.onRequest(app);
