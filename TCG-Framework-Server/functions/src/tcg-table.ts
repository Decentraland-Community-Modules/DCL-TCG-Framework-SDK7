/* eslint-disable */ 
/**     TRADING CARD GAME - CARD TABLE
 * represents all pieces for processing tcg tables
 * 
 * NOTE: currently a lot of table functionality is relegated
 *  to client tables so we can support scenes with custom rules/cards
 *  considering doing a split to support a full 'strict ruleset' processing
 *  but that would mean all other scenes wanting to use that would need
 *  to have matching defs
 */
import { TableTeam } from "./tcg-team";
export module Table {
  // serial data for card table
  export interface TableData {
    // time stamp of last interaction
    lastInteraction: number;
    // indexing
    id:number;
    // live data
    owner:string; // <- can be phased out with different packets
    state:number;
    turn:number;
    round:number;
    teams:TableTeam.TableTeamData[];
  }

  // returns capsule with table defaults
  export function GenerateDefaultTable():Table.TableData {
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
    tableData.teams.push(TableTeam.GenerateDefaultTableTeam());
    tableData.teams.push(TableTeam.GenerateDefaultTableTeam());
  
    return tableData;
  }

  // starts game on the given table data
  export function StartGame(tableData:TableData):boolean {
    // ensure all players registered to game are ready to start
    for(let i=0; i<tableData.teams.length; i++) {
      if(tableData.teams[i].readyState == false) {
        return false;
      }
    }

    //set lobby state
    tableData.state = 1;

    //set turn/round state
    tableData.turn = tableData.teams.length-1;
    tableData.round = 0;

    // set up each team
    /*for(let i:number=0; i<tableData.teams.length; i++) {
      //reset team
      TableTeam.ResetTeam(tableData.teams[i]);
      
      //provide teams with initial hand cards
      // TODO: move settings for start of match/teams to config file
      for(let j:number=0; j<3; j++) {
        TableTeam.DrawCard(tableData.teams[i]);
      }
    }*/

    // start first turn
    Table.NextTurn(tableData);

    return true;
  }

  // starts the next turn on the given table data
  export function NextTurn(tableData:TableData) {
    // only process end of turn for team if game is not in start state
    if(tableData.turn != -1) {
      // process end of turn on previous team
      TableTeam.TurnStart(tableData.teams[tableData.turn]);
    }

    // push to next player's turn
    tableData.turn++;
    if(tableData.turn >= tableData.teams.length) {
      tableData.turn = 0;
      tableData.round++;
    }

    // process start of turn on next team
    TableTeam.TurnStart(tableData.teams[tableData.turn]);
  }

  // ends game on the given table data
  export function EndGame(tableData:TableData):boolean {
    // process every team to find the defeated player
    let defeated = -1;
    for(let i=0; i<tableData.teams.length; i++) {
      if(tableData.teams[i].healthCur < 0) {
        defeated = i;
        break;
      }
    }
    // halt if defeated player was not found
    if(defeated == -1) {
      return false;
    }

    //set lobby state
    tableData.state = 0;
    return true;
  }

  /** provides a server table data object based on the provided serial data */
  export function DeserializeData(data:{ [key: string]: any }):Table.TableData {
    //create data object
    let serial:Table.TableData = {
      // indexing
      id:data.id,
      // live data
      lastInteraction:data.lastInteraction = new Date().getTime(),
      owner:data.owner,
      state:data.state,
      turn:data.turn,
      round:data.round,
      teams:[],
    }

    //teams
    for(let i=0; i<data.teams.length; i++) {
      //tableData.teams.push(req.body.tableData.teams[i] as TableTeam.TableTeamData);
      serial.teams.push(TableTeam.DeserializeData(data.teams[i]));
    }

    return serial;
  }
}