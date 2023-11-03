import { CARD_DATA_ID, CardProvisionDataObject } from "./tcg-card-data";

/**     TRADING CARD GAME - CONTRACT UNLOCK DATA
    contains a listing of all cards that can be unlocked through wearing/owning NFTs from contracts

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/

/** defines all interaction levels for NFT cotnracts */
export enum CONTRACT_ACTIVATION_TYPE { 
    OWN = "OWN", //cards are provided if player owns NFT
    WEAR = "WEAR", //cards are provided if player is wearing NFT
}

/** data interface for defining an nft contract that provides cards to the player */
export interface ContractUnlockDataObject {
    //indexing
    id:CONTRACT_DATA_ID; //unique id
    type:CONTRACT_ACTIVATION_TYPE, //activation type
    urn:string; //targeted nft address
    //added cards
    providedCards:CardProvisionDataObject[];
}

/** listing of all NFT contract IDs */
export enum CONTRACT_DATA_ID { 
    //### DEMO CONTRACTS
    UNLOCK_NEUTRAL_CARDS, //provides neutral cards
    UNLOCK_VOID_CARDS, //provides void cards
}

/** listing of all NFT contracts that can unlock cards */
export const ContractUnlockData:ContractUnlockDataObject[] = [
    //### DEMO CONTRACTS
    //## wear eyepatch -> unlocks void cards
    {
        //indexing
        id:CONTRACT_DATA_ID.UNLOCK_VOID_CARDS,
        type:CONTRACT_ACTIVATION_TYPE.WEAR,
        urn:"urn:decentraland:off-chain:base-avatars:piratepatch",
        //added cards
        providedCards:[
            { id:CARD_DATA_ID.SPELL_VOIDBOLT, count:3 },
            { id:CARD_DATA_ID.CHARACTER_VOID_GOLEM, count:5 },
            { id:CARD_DATA_ID.TERRAIN_VOID, count:1 },
        ],
    },
    //## own shoes of speed -> unlocks neutral cards
    {
        //indexing
        id:CONTRACT_DATA_ID.UNLOCK_NEUTRAL_CARDS,
        type:CONTRACT_ACTIVATION_TYPE.OWN,
        urn:"urn:decentraland:matic:collections-v2:0xa7f7f6eac7057f0a3b616637289b9947bbcefbcc:2",
        //added cards
        providedCards:[
            { id:CARD_DATA_ID.SPELL_HEAL, count:3 },
            { id:CARD_DATA_ID.CHARACTER_NEUTRAL_GOLEM, count:5 },
        ],
    },
];