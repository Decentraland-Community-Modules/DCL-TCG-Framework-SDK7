import { CARD_DATA_ID, CardProvisionDataObject } from "./tcg-card-data";
/**     TRADING CARD GAME - LEVEL UNLOCKS DATA
    contains a listing of all cards that can be unlocked through experience/levels

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
/** data interface for defining an nft contract linkage */
export interface LevelUnlockDataObject {
    //indexing
    level:number; //level required to unlock card set//provided cards
    //added cards
    providedCards:CardProvisionDataObject[]; 
}

/** listing of all cards included in the game */
export const LevelUnlockData:LevelUnlockDataObject[] = [
    //### DEMO LEVEL UNLOCKS
    //## starter cards
    {
        //indexing
        level: 0,
        //added cards
        providedCards:[
            //provide fire cards
            { id:CARD_DATA_ID.SPELL_FIREBOLT, count:3 },
            { id:CARD_DATA_ID.CHARACTER_FIRE_GOLEM, count:5 },
            //provide ice cards
            { id:CARD_DATA_ID.SPELL_ICEBOLT, count:3 },
            { id:CARD_DATA_ID.CHARACTER_ICE_GOLEM, count:5 },
            //provide electric cards
            { id:CARD_DATA_ID.SPELL_LIGHTNINGBOLT, count:3 },
            { id:CARD_DATA_ID.CHARACTER_ELECTRIC_GOLEM, count:5 },
        ],
    },
    //## account progression
    {
        //indexing
        level: 1,
        //added cards
        providedCards:[
            //provide fire cards
            { id:CARD_DATA_ID.TERRAIN_FIRE, count:1 },
        ],
    },
    {
        //indexing
        level: 2,
        //added cards
        providedCards:[
            //provide ice cards
            { id:CARD_DATA_ID.TERRAIN_ICE, count:1 },
        ],
    },
    {
        //indexing
        level: 3,
        //added cards
        providedCards:[
            //provide electric cards
            { id:CARD_DATA_ID.TERRAIN_ELECTRIC, count:1 },
        ],
    },
];