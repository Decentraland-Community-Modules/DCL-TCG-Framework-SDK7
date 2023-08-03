/*      CARD REGISTRY
    contains access to all cards, with a variety of access methods. card entries
    contain the max number of instances each card can have, as well as their 
    available rarities.
    
    TODO:
        -extend data for storing which NFT is enabling the card (for exp gain & rarity splits)

    author: Alex Pazder
    contact: TheCryptoTrader69@gmail.com 
*/

import Dictionary, { List } from "../utilities/collections";
import { CARD_PLAY_TYPE, CardData, CardDataObject, CardTextureData, CardTextureDataObject, TEXTURE_SHEET_CARDS } from "./data/tcg-card-data";
import { CARD_FACTION_TYPE, CardFactionData, CardFactionDataObject, CardFactionSheetDataObject, CardFactionTextureData, CardFactionTextureDataObject as FactionTextureDataObject, TEXTURE_SHEET_CARD_FACTIONS } from "./data/tcg-card-faction-data";

/* linkage for a single card's data in the game */
export class CardEntry {
    //card's uid
    private id:string; 
    public get ID() { return this.id; }
    //card's data position
    private position:number;
    public get Position(): number { return this.Position; }
    //returns the card's data component
    public get DataDef(): CardDataObject { return CardData[this.position]; }

    //max allowed number of this card in the player's deck
    //  this will either be defined  by the card's tier or the player's NFT ownership
    public Count: number = 0;
    
    /** prepares card data entry for use */
    constructor(pos:number, id:string) {
        this.position = pos;
        this.id = id;
    }
}
/*  manages all general card defs and the player's allowed cards per deck 
    many functions within assume that the system has been initialized & loaded the player's data
    from the correct source/setting (defined by network type)
*/
export class PlayerCardRegistry {
    static IsDebugging:boolean = true;

    /** when true system is fully loaded and ready for use */
    private isInitialized:boolean = false;

    /** access pocketing */
    private static instance: undefined | PlayerCardRegistry;
    public static get Instance(): PlayerCardRegistry {
        //ensure instance is set
        if (PlayerCardRegistry.instance === undefined) {
            PlayerCardRegistry.instance = new PlayerCardRegistry();
        }

        return PlayerCardRegistry.instance;
    }

    //sheet registries
    //  faction
    private factionTextureRegistry: Dictionary<FactionTextureDataObject>;
    //  card
    private cardTextureRegistry: Dictionary<CardTextureDataObject>;

    //data registries
    //  faction 
    //      indexes of factions (positions in data)
    private factionRegistryIndex: Dictionary<number>;
    //  card
    //      to ALL registered data (unsorted)
    private cardRegistryAll: List<CardEntry>;
    //      id as key 
    private cardRegistryViaID: Dictionary<CardEntry>;
    //      data split via type (spell, character, field)
    private cardRegistryViaType: Dictionary<List<CardEntry>>;
    //      data split via faction
    private cardRegistryViaFaction: Dictionary<List<CardEntry>>;
    
    //overhead count functions (used to easy access for iterators)
    /** returns number of card factions */
    public static CardFactionCount() { return PlayerCardRegistry.Instance.factionRegistryIndex.size(); }
    
    /**
     * prepares the inventory for use, populating all inventory item and callback dictionaries. 
     */
    public constructor() {
        if (PlayerCardRegistry.IsDebugging) console.log("Card Registry: initializing...");

        //initialize collection sets
        //  sheets
        //      factions
        this.factionTextureRegistry = new Dictionary<FactionTextureDataObject>();
        var index = 0;
        Object.keys(TEXTURE_SHEET_CARD_FACTIONS).forEach((key) => {
            this.factionTextureRegistry.addItem(key, CardFactionTextureData[index]);
            index++;
        });
        //      cards
        this.cardTextureRegistry = new Dictionary<CardTextureDataObject>();
        var index = 0;
        Object.keys(TEXTURE_SHEET_CARDS).forEach((key) => {
            this.cardTextureRegistry.addItem(key, CardTextureData[index]);
            index++;
        });
        //  data
        //      factions
        this.factionRegistryIndex = new Dictionary<number>();
        //      card
        this.cardRegistryAll = new List<CardEntry>();
        this.cardRegistryViaID = new Dictionary<CardEntry>();
        this.cardRegistryViaType = new Dictionary<List<CardEntry>>();
        this.cardRegistryViaFaction = new Dictionary<List<CardEntry>>();
        //initialize sort by type sorting collection
        var index = 0;
        Object.keys(CARD_PLAY_TYPE).forEach((key) => {
            this.cardRegistryViaType.addItem(key, new List<CardEntry>());
            index++;
        });
        //initialize sort by faction sorting collection
        var index = 0;
        Object.keys(CARD_FACTION_TYPE).forEach((key) => {
            this.factionRegistryIndex.addItem(key, index);
            this.cardRegistryViaFaction.addItem(key, new List<CardEntry>());
            index++;
        });

        //populate registry collections
        //  process every card def
        for (var i: number = 0; i < CardData.length; i++) {
            //prepare entry
            const entry = new CardEntry(i, CardData[i].id);
            if (PlayerCardRegistry.IsDebugging) console.log("Card Registry: creating entry=" + i
                + ", type=" + CardData[i].type.toString() + ", faction=" + CardData[i].faction.toString());
            //add to registry
            this.cardRegistryAll.addItem(entry);
            this.cardRegistryViaID.addItem(CardData[i].id, entry);
            this.cardRegistryViaType.getItem(CardData[i].type.toString()).addItem(entry);
            this.cardRegistryViaFaction.getItem(CardData[i].faction.toString()).addItem(entry);
        }

        if (PlayerCardRegistry.IsDebugging) console.log("Card Registry: initialized, total count=" + this.cardRegistryAll.size());
    }

    //### FACTIONS
    /** returns faction sheet */
    public CallbackGetFactionTexture(faction: CARD_FACTION_TYPE): FactionTextureDataObject { return PlayerCardRegistry.Instance.GetFactionTexture(faction); }
    public GetFactionTexture(faction: CARD_FACTION_TYPE): FactionTextureDataObject { return this.factionTextureRegistry.getItem(this.GetFaction(faction).sheetData.sheet); }
    /** returns faction index */
    public CallbackGetFactionIndex(faction: CARD_FACTION_TYPE): number { return PlayerCardRegistry.Instance.GetFactionIndex(faction); }
    public GetFactionIndex(faction: CARD_FACTION_TYPE): number { return this.factionRegistryIndex.getItem(faction.toString()); }
    /** returns faction data object */
    public CallbackGetFaction(faction: CARD_FACTION_TYPE): CardFactionDataObject { return PlayerCardRegistry.Instance.GetFaction(faction); }
    public GetFaction(faction: CARD_FACTION_TYPE): CardFactionDataObject { return CardFactionData[this.factionRegistryIndex.getItem(faction.toString())]; }
    
    //### CARDS
    /** returns card sheet index */
    public CallbackGetCardTexture(id: string): CardTextureDataObject { return PlayerCardRegistry.Instance.GetCardTexture(id); }
    public GetCardTexture(id: string): CardTextureDataObject { return this.cardTextureRegistry.getItem(this.GetEntryByID(id).DataDef.sheetData.sheet); }
    /** returns card entry at given position */
    public CallbackGetEntryByPos(index: number): CardEntry { return PlayerCardRegistry.Instance.GetEntryByPos(index); }
    public GetEntryByPos(index: number): CardEntry { return this.cardRegistryAll.getItem(index); }
    /** returns entry of given id */
    public CallbackGetEntryByID(id: string): CardEntry { return PlayerCardRegistry.Instance.GetEntryByID(id); }
    public GetEntryByID(id: string): CardEntry { return this.cardRegistryViaID.getItem(id); }
    /** returns entry of given faction and position within the faction listing*/
    public CallbackGetEntryByFaction(faction: CARD_FACTION_TYPE, index: number): CardEntry { return PlayerCardRegistry.Instance.GetEntryByFaction(faction, index); }
    public GetEntryByFaction(faction: CARD_FACTION_TYPE, index: number): CardEntry { return this.cardRegistryViaFaction.getItem(faction.toString()).getItem(index); }
    /** returns entry of given rarity and position */
    public CallbackGetEntryByType(type: CARD_FACTION_TYPE, index: number): CardEntry { return PlayerCardRegistry.Instance.GetEntryByType(type, index); }
    public GetEntryByType(type: CARD_FACTION_TYPE, index: number): CardEntry { return this.cardRegistryViaType.getItem(type.toString()).getItem(index); }
}