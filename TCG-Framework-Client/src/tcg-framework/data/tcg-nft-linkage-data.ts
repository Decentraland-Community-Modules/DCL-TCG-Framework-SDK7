/**     TRADING CARD GAME - NFT LINKAGE DATA
    contains a listing of all contracts/tokens that can provide cards to the
    current player. 

*/

import { CARD_DATA_ID } from "./tcg-card-data";

/** what action must be taken to gain access to cards */
export enum NFT_ACTIVATION_TYPE { 
    OWN = "OWN", //cards are provided if player owns NFT
    WEAR = "WEAR", //cards are provided if player is wearing NFT
}

/** data interface for defining how many instances of a card owning an nft adds */
export interface CardProvisionDataObject {
    //targeted card
    id:CARD_DATA_ID;
    //number of instances provided
    count:number;
}

/** data interface for defining an nft contract linkage */
export interface ContractDataObject {
    //indexing
    id:CONTRACT_DATA_ID; //unique id for this contract/cardset
    type:NFT_ACTIVATION_TYPE, //what level of activation ir required
    urn:string; //targeted nft
    //added cards
    linkedCards:CardProvisionDataObject[];
}

/** listing of all contract IDs */
export enum CONTRACT_DATA_ID { 
    //### DEMO CONTRACTS
    UNLOCK_NEUTRAL_CARDS,  //provides neutral cards
    UNLOCK_VOID_CARDS,//provides void cards
}

/** listing of all cards included in the game */
export const ContractData:ContractDataObject[] = [
    //### DEMO CONTRACTS
    //## wear eyepatch -> unlocks void cards
    {
        //indexing
        id:CONTRACT_DATA_ID.UNLOCK_VOID_CARDS,
        type:NFT_ACTIVATION_TYPE.WEAR,
        urn:"urn:decentraland:off-chain:base-avatars:piratepatch",
        //added cards
        linkedCards:[
            { id:CARD_DATA_ID.SPELL_VOIDBOLT, count:3 },
            { id:CARD_DATA_ID.CHARACTER_VOID_GOLEM, count:5 },
            { id:CARD_DATA_ID.TERRAIN_VOID, count:1 },
        ],
    },
    //## own shoes of speed -> unlocks neutral cards
    {
        //indexing
        id:CONTRACT_DATA_ID.UNLOCK_NEUTRAL_CARDS,
        type:NFT_ACTIVATION_TYPE.OWN,
        urn:"urn:decentraland:matic:collections-v2:0xa7f7f6eac7057f0a3b616637289b9947bbcefbcc:2",
        //added cards
        linkedCards:[
            { id:CARD_DATA_ID.SPELL_HEAL, count:3 },
            { id:CARD_DATA_ID.CHARACTER_NEUTRAL_GOLEM, count:5 },
        ],
    },
];