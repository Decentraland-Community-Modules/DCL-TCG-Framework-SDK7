/* eslint-disable */ 
/**     TRADING CARD GAME - CARD TABLE
 * represents all pieces for tcg table cards
 */
export module TableCard {

  // serial data for keyword effects
  export interface CardKeywordEffectsDataObject {
    // indexing
    id:number;
    // live data
    strength:number;
    duration:number;
  }
  // serial data for status effects
  export interface ActiveStatusEffectData {
    // indexing
    ID:number;
    // live data
    Timing:number;
    Strength:number;
    Duration:number;
  }
  // serial data for card
  export interface CardSerialData {
    // indexing
    index:number;
    defIndex:number;
    // live data
    cost:number;
    healthCur:number;
    healthMax:number;
    attack:number;
    armour:number;
    keywords:CardKeywordEffectsDataObject[][];
    effects:ActiveStatusEffectData[];
  }
}