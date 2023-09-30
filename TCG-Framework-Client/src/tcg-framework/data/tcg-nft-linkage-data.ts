/**     TRADING CARD GAME - NFT LINKAGE DATA
    contains a listing of all contracts/tokens that can provide cards to the
    current player. 

*/

import { CARD_DATA_ID } from "./tcg-card-data";

/** data interface for defining how many instances of a card owning an nft adds */
export interface CardProvisionDataObject {
    //targeted card
    id:CARD_DATA_ID;
    //number of instances provided
    count:number
}

/** data interface for defining an nft contract linkage */
export interface ContractDataObject {
    //indexing
    id:CONTRACT_DATA_ID; //unique id for this card
    //added cards
    linkedCards:CardProvisionDataObject[];
}

/** listing of all contract IDs */
export enum CONTRACT_DATA_ID { 
    //### DEMO CONTRACTS
    DCL_HAT,    //void cards
    DCL_SHIRT,  //fire cards
    DCL_SHOES   //electric cards
}

/** listing of all cards included in the game */
export const ContractData:ContractDataObject[] = [
    //### DEMO CONTRACTS
    //## DEMO HAT
    {
        //indexing
        id:CONTRACT_DATA_ID.DCL_HAT, //unique id for this card
        //added cards
        linkedCards:[
            { id:CARD_DATA_ID.SPELL_VOIDBOLT, count:3 },
            { id:CARD_DATA_ID.CHARACTER_VOID_GOLEM, count:5 },
            { id:CARD_DATA_ID.TERRAIN_VOID, count:1 }
        ],
    },
    //## DEMO SHIRT
    {
        //indexing
        id:CONTRACT_DATA_ID.DCL_SHIRT, //unique id for this card
        //added cards
        linkedCards:[
            { id:CARD_DATA_ID.SPELL_FIREBOLT, count:3 },
            { id:CARD_DATA_ID.CHARACTER_FIRE_GOLEM, count:5 },
            { id:CARD_DATA_ID.TERRAIN_FIRE, count:1 }
        ],
    },
    //## DEMO SHOES
    {
        //indexing
        id:CONTRACT_DATA_ID.DCL_SHOES, //unique id for this card
        //added cards
        linkedCards:[
            { id:CARD_DATA_ID.SPELL_ICEBOLT, count:3 },
            { id:CARD_DATA_ID.CHARACTER_ICE_GOLEM, count:5 },
            { id:CARD_DATA_ID.TERRAIN_ICE, count:1 }
        ],
    },
];