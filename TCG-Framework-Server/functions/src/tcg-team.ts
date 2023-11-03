/* eslint-disable */ 
/**     TRADING CARD GAME - CARD TABLE
 * represents all pieces for tcg table teams
 * 
 * NOTE: this system is built to be dynamic/conforms to the card
 *  defs as set in the connecting scene. this makes starting a game
 *  a 2-step process:
 *    1 - create base details for team & deck card layouts
 *    2 - take in full defs from players per turn
 *  this lets us skip over updating server card/status defs on the server
 *  and allows the srver to process games that might be using 
 */
import { TableCard } from "./tcg-card";
export module TableTeam {

  /** serial data for card table team */
  export interface TableTeamData {
    // indexing
    playerID:string;
    playerName:string;
    // live data
    readyState:boolean;
    healthCur:number;
    energyCur:number;
    energyGain:number;
    deckRegistered:string;
    deckSession:TableCard.CardSerialData[][];
    slotCards:string[];
    terrainCard:string;
  }

  /** index per targeted collection */
  export enum DECK_CARD_STATES {
    DECK,
    HAND,
    FIELD,
    TERRAIN,
    DISCARD,
  };

  /** resets the given team data */
  export function ResetTeam(teamData:TableTeamData) {
    // reset values
    teamData.healthCur = 24;
    teamData.energyCur = 3;
    teamData.energyGain = 1;

    // prepare playing deck
    //  copy cards to session deck, breaking them into instances
    teamData.deckSession = [[],[],[],[],[]];
    const cards = teamData.deckRegistered.split('-');
    for(let i:number=0; i<cards.length; i++) {
      // add dummy card
      const card = cards[i].split(':');
      teamData.deckSession[DECK_CARD_STATES.DECK].push({
        // indexing
        index:parseInt(card[0]),
        defIndex:parseInt(card[1]),
        // live data
        cost:0,
        healthCur:0,
        healthMax:0,
        attack:0,
        armour:0,
        keywords:[],
        effects:[]
      });
    }
    //  shuffle cards in session deck
    ShuffleCards(teamData.deckSession[DECK_CARD_STATES.DECK]);

    // draw 3 cards from session deck to hand
    DrawCard(teamData);

    // reset slot cards
    teamData.slotCards = [];
    // reset terrain card
    teamData.terrainCard = "";
  }

  //draws the next card from the team's deck and adds it to hand
  export function DrawCard(teamData:TableTeamData) {
    const card = teamData.deckSession[DECK_CARD_STATES.DECK].pop();
    if(card != undefined) {
      teamData.deckSession[DECK_CARD_STATES.HAND].push(card);
      return card.index;
    }
    return -1;
  }

  /** shuffles all cards in the deck, randomizing order */
  export function ShuffleCards(deck:TableCard.CardSerialData[]) {
    let card:TableCard.CardSerialData;
    let swap:number;
    let count = deck.length;
    for (let i = 0; i < deck.length; i++) 
    {
      swap = Math.floor(Math.random() * count);
      card = deck[swap];
      deck[swap] = deck[0];
      deck[0] = card;
    }
  }
}