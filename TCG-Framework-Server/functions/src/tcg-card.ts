/* eslint-disable */ 
/**     TRADING CARD GAME - CARD TABLE
 * represents all pieces for tcg table cards
 */
export module TableCard {

  // serial data for keyword effects
  export interface CardKeywordData {
    // indexing
    id:number;
    // live data
    strength:number;
    duration:number;
  }
  // serial data for keyword sets
  // NOTE: firebase does not allow for multi-layered arrays, this is work around
  export interface CardKeywordDataSet {
    v:TableCard.CardKeywordData[];
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
  export interface CardData {
    // indexing
    index:number;
    defIndex:number;
    // live data
    cost:number;
    healthCur:number;
    healthMax:number;
    attack:number;
    armour:number;
    keywords:TableCard.CardKeywordDataSet[];
    effects:TableCard.ActiveStatusEffectData[];
  }
  // serial data for card sets
  // NOTE: firebase does not allow for multi-layered arrays, this is work around
  export interface CardDataSet {
    v:TableCard.CardData[];
  }

  /** provides a server card data object based on the provided serial data */
  export function DeserializeData(data:{ [key: string]: any }):TableCard.CardData {
    //create data object
    let serial:TableCard.CardData = {
      //indexing
      index:data.index,
      defIndex:data.defIndex,
      //live data
      cost:data.cost,
      healthCur:data.healthCur,
      healthMax:data.healthMax,
      attack:data.attack,
      armour:data.armour,
      keywords:[],
      effects:[],
    };

    //keywords
    for (let i = 0; i < data.keywords.length; i++) {
      const elementSet:TableCard.CardKeywordDataSet = { v:[] };
      for (let j = 0; j < data.keywords[i].v.length; j++) {
        elementSet.v.push({
          id:data.keywords[i].v[j].id,
          strength:data.keywords[i].v[j].strength,
          duration:data.keywords[i].v[j].duration,
        });
      }
      serial.keywords.push(elementSet);
    }

    //effects
    for (let i = 0; i < data.effects.length; i++) {
      serial.effects.push({
        ID:data.effects[i].ID,
        Timing:data.effects[i].Timing,
        Strength:data.effects[i].Strength,
        Duration:data.effects[i].Duration,
      });
    }

    return serial;
  }
}