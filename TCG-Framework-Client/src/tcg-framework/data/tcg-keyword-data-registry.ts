/*      TRADING CARD GAME - KEYWORD DATA
    provides sorted access to all farm crop data pieces

    author: Alex Pazder
    contact: TheCryptoTrader69@gmail.com 
*/

import Dictionary, { List } from "../../utilities/collections";
import { CARD_KEYWORD_ID, CardKeywordData, CardKeywordDataObject } from "./tcg-keyword-data";
import { CardKeywordTextureData, CardKeywordTextureDataObject } from "./tcg-keyword-texture-data";


/** defines a keyword */
export class CardKeywordEntry {
    /** id data object referenced by this entry */
    private id: string;
    public get ID(): string { return this.id; }
    /** positional index of data object */
    private position: number;
    public get Position(): number { return this.position; }
    /** provide data reference */
    public get DataDef(): CardKeywordDataObject { return CardKeywordData[this.position]; }

    constructor(pos: number, id: string) {
        this.position = pos;
        this.id = id;
    }
}
/** manages all keywords */
export class CardKeywordRegistry {
    /** when true debugging logs will be generated (ensure is false when deploying to remove overhead) */
    private static IsDebugging: boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    private static debugTag:string = "Card Keyword Registry: ";

    //access pocketing
    private static instance: undefined | CardKeywordRegistry;
    public static get Instance(): CardKeywordRegistry {
        //ensure instance is set
        if (CardKeywordRegistry.instance === undefined) {
            CardKeywordRegistry.instance = new CardKeywordRegistry();
        }

        return CardKeywordRegistry.instance;
    }

    //sheet registries
    private textureRegistry: Dictionary<CardKeywordTextureDataObject>;

    //registries for data access
    //  ALL registered data
    private entryRegistry: List<CardKeywordEntry>;
    //  id as key 
    private entryRegistryViaID: Dictionary<CardKeywordEntry>;

    /** prepares registry for use, this is done automatically when the instance is first called */
    public constructor() {
        if (CardKeywordRegistry.IsDebugging) console.log(CardKeywordRegistry.debugTag+"initializing...");

        //initialize texture collections
        this.textureRegistry = new Dictionary<CardKeywordTextureDataObject>();
        for(let i:number=0; i<CardKeywordTextureData.length; i++) {
            this.textureRegistry.addItem(CardKeywordTextureData[i].id.toString(), CardKeywordTextureData[i]);
        }

        //initialize collection sets
        this.entryRegistry = new List<CardKeywordEntry>();
        this.entryRegistryViaID = new Dictionary<CardKeywordEntry>();

        //populate registry collections
        //  process every def
        for (var i: number = 0; i < CardKeywordData.length; i++) {
            //prepare entry
            const entry = new CardKeywordEntry(i, CardKeywordData[i].id.toString());
            if (CardKeywordRegistry.IsDebugging) console.log(CardKeywordRegistry.debugTag+"creating entry=" + i + ", ID=" + CardKeywordData[i].id);
            //add to registry
            this.entryRegistry.addItem(entry);
            this.entryRegistryViaID.addItem(entry.ID, entry);
        }

        if (CardKeywordRegistry.IsDebugging) console.log(CardKeywordRegistry.debugTag+"initialized, total count=" + this.entryRegistry.size());
    }

    //access functions (we do not want to allow direct access to registries, as they should remain unchanged)
    //callbacks have been provided to hook up as needed, providing unintrussive plug-and-play solution (while avoiding cyclindrical dep issues)
    //NOTE: we can hand out entry references because the values on entries are readonly (cannot be modified) 

    /** returns keyword sheet */
    public CallbackGetKeywordTexture(keyword:CARD_KEYWORD_ID): CardKeywordTextureDataObject { return CardKeywordRegistry.Instance.GetKeywordTexture(keyword); }
    public GetKeywordTexture(keyword:CARD_KEYWORD_ID): CardKeywordTextureDataObject { return this.textureRegistry.getItem(this.GetDefByID(keyword).sheetData.id.toString()); }
    
    /** returns entry at given position */
    public CallbackGetEntryByPos(index: number): CardKeywordEntry { return CardKeywordRegistry.Instance.GetEntryByPos(index); }
    public GetEntryByPos(index: number): CardKeywordEntry { return this.entryRegistry.getItem(index); }
    /** returns def at given position */
    public CallbackGetDefByPos(index: number): CardKeywordDataObject { return CardKeywordRegistry.Instance.GetDefByPos(index); }
    public GetDefByPos(index: number): CardKeywordDataObject { return this.GetEntryByPos(index).DataDef; }

    /** returns entry of given id */
    public CallbackGetEntryByID(id: CARD_KEYWORD_ID): CardKeywordEntry { return CardKeywordRegistry.Instance.GetEntryByID(id); }
    public GetEntryByID(id: CARD_KEYWORD_ID): CardKeywordEntry { return this.entryRegistryViaID.getItem(id.toString()); }
    /** returns def of given id */
    public CallbackGetDefByID(id: CARD_KEYWORD_ID): CardKeywordDataObject { return CardKeywordRegistry.Instance.GetDefByID(id); }
    public GetDefByID(id:CARD_KEYWORD_ID): CardKeywordDataObject { return this.GetEntryByID(id).DataDef; }
}