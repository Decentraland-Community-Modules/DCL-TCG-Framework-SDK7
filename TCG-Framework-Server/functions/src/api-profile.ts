/* eslint-disable */ 
/**     TRADING CARD GAME - PLAYER PROFILE
 * contains all details for player accounts, including: custom decks, 
 *  progression, and stats. 
 */
export module Profile {

  // serial data for keyword effects
  export interface ProfileData {
    // last time player was logged in
    LastLogin:number;
    // progression
    Experience:number;
    // decks
    Deck0:string;
    Deck1:string;
    Deck2:string;
    Deck3:string;
    Deck4:string;
    //records
    GamesPlayed:number;
  }

  // returns capsule with profile defaults
  export function GenerateDefaultProfile(): ProfileData {
    const profileData:ProfileData = {
      // last time player was logged in
      LastLogin: new Date().getTime(),
      // progression
      Experience: 0,
      // decks
      Deck0: "",
      Deck1: "",
      Deck2: "",
      Deck3: "",
      Deck4: "",
      //records
      GamesPlayed: 0
    }
    
    return profileData;
  }
}
