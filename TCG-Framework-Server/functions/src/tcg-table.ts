/* eslint-disable */ 
/**     TRADING CARD GAME - CARD TABLE
 * represents all pieces for tcg tables
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
    owner:string;
    state:number;
    turn:number;
    round:number;
    teams:TableTeam.TableTeamData[];
  }

  // starts game on the given table data
  export function StartGame(tableData:TableData) {

    //set lobby state
    tableData.state = 1;

    //set entry table state
    tableData.turn = tableData.teams.length-1;
    tableData.round = 0;

    //process each team
    /*for(let i:number=0; i<tableData.teams.length; i++) {
      //reset team
      TableTeam.ResetTeam(tableData.teams[i]);
      
      //provide teams with initial hand cards
      for(let j:number=0; j<STARTING_CARD_COUNT; j++) {
        tableData.teamObjects[i].DrawCard();
      }
    }*/
  }

  // starts the next turn on the given table data
  export function NextTurn(tableData:TableData) {

    //update turn state
  }

  // ends game on the given table data
  export function EndGame(tableData:TableData) {

    //set lobby state
    tableData.state = 0;
  }
}