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
    deckSession:TableCard.CardDataSet[];
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

    //TODO: update for new serialization routine
    // prepare playing deck
    //  copy cards to session deck, breaking them into instances
    /*teamData.deckSession = [];
    const cards = teamData.deckRegistered.split('-');
    for(let i:number=0; i<cards.length; i++) {
      // add dummy card (gets set upon game start)
      const card = cards[i].split(':');
      teamData.deckSession[DECK_CARD_STATES.DECK].v.push({
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
    ShuffleCards(teamData.deckSession[DECK_CARD_STATES.DECK]);*/

    // draw 3 cards from session deck to hand
    DrawCard(teamData);

    // reset slot cards
    teamData.slotCards = [];
    // reset terrain card
    teamData.terrainCard = "";
  }

  /** draws the next card from the team's deck and adds it to hand */
  export function DrawCard(teamData:TableTeamData) {
    const card = teamData.deckSession[DECK_CARD_STATES.DECK].v.pop();
    if(card != undefined) {
      teamData.deckSession[DECK_CARD_STATES.HAND].v.push(card);
      return card.index;
    }
    return -1;
  }

  /** shuffles all cards in the deck, randomizing order */
  export function ShuffleCards(deck:TableCard.CardData[]) {
    let card:TableCard.CardData;
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

  /** processes the start of a turn on the given team */
  export function TurnStart(teamData:TableTeamData) {
    // add energy to team's pool
    teamData.energyCur += teamData.energyGain;
    // add card to team's hand
    TableTeam.DrawCard(teamData);
    // new team's start turn effects
    /** for(let i:number=0; i<this.cardSlotObjects.length; i++) {
      //if there is a card tied to the slot
      const slot = this.cardSlotObjects[i];
      if(slot.SlottedCard != undefined) {
        //process card's start turn effects
        slot.SlottedCard.ProcessEffectsByAffinity(STATUS_EFFECT_AFFINITY.HELPFUL);
        //update display
        slot.UpdateStatDisplay();
      }
    }*/
  }

    /** processes the end of a turn on the given team */
  export function TurnEnd(teamData:TableTeamData) { 
    // process previous team's end turn effects
    /** for(let i:number=0; i<this.cardSlotObjects.length; i++) {
      // if there is a card tied to the slot
      const slot = this.cardSlotObjects[i];
      if(slot.SlottedCard != undefined) {
        //re-enable card's action (we do this at the end of the turn so enemy has a chance to stun the character)
        slot.SlottedCard.ActionRemaining = true;
        //process card's end turn effects
        slot.SlottedCard.ProcessEffectsByAffinity(STATUS_EFFECT_AFFINITY.HARMFUL);
        //update display
        slot.UpdateStatDisplay();
      }
    }*/
  }

  /** provides a server team data object based on the provided serial data */
  export function DeserializeData(data:{ [key: string]: any }):TableTeam.TableTeamData {
    //create data object
    let serial:TableTeam.TableTeamData = {
      // indexing
      playerID:data.playerID,
      playerName:data.playerName,
      // live data
      readyState:data.readyState,
      healthCur:data.healthCur,
      energyCur:data.energyCur,
      energyGain:data.energyGain,
      deckRegistered:data.deckRegistered,
      deckSession:[],
      slotCards:[],
      terrainCard:data.terrainCard
    }

    //populate session cards
    for (let i = 0; i < data.deckSession.length; i++) {
      const elementSet:TableCard.CardDataSet = { v:[] };
      for (let j = 0; j < data.deckSession[i].v.length; j++) {
        elementSet.v.push(TableCard.DeserializeData(data.deckSession[i].v[j]));
      }
      serial.deckSession.push(elementSet);
    }

    //populate slot cards
    for (let i = 0; i < data.slotCards.length; i++) {
      serial.slotCards.push(data.slotCards[i]);
    }

    return serial;
  }
}