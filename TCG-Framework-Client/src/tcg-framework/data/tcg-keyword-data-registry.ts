/*      FARM CROP REGISTRY
    provides sorted access to all farm crop data pieces

    author: Alex Pazder
    contact: TheCryptoTrader69@gmail.com 
*/

import Dictionary, { List } from "../../utilities/collections";
import { CardKeywordData, CardKeywordDataObject } from "./tcg-keyword-data";


/** defines a single accessory's live data in-scene */
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
/** manages the state of all accessories in the game */
export class CardKeywordRegistry {
    /** when true debugging logs will be generated (ensure is false when deploying to remove overhead) */
    private static IsDebugging: boolean = true;

    //access pocketing
    private static instance: undefined | CardKeywordRegistry;
    public static get Instance(): CardKeywordRegistry {
        //ensure instance is set
        if (CardKeywordRegistry.instance === undefined) {
            CardKeywordRegistry.instance = new CardKeywordRegistry();
        }

        return CardKeywordRegistry.instance;
    }

    //registries for data access
    //  ALL registered data
    private entryRegistry: List<CardKeywordEntry>;
    //  id as key 
    private entryRegistryViaID: Dictionary<CardKeywordEntry>;

    /** prepares registry for use, this is done automatically when the instance is first called */
    public constructor() {
        if (CardKeywordRegistry.IsDebugging) console.log("Card Keyword Entry: initializing...");

        //initialize collection sets
        this.entryRegistry = new List<CardKeywordEntry>();
        this.entryRegistryViaID = new Dictionary<CardKeywordEntry>();

        //populate registry collections
        //  process every def
        for (var i: number = 0; i < CardKeywordEntry.length; i++) {
            //prepare entry
            const entry = new CardKeywordEntry(i, CardKeywordData[i].ID.toString());
            if (CardKeywordRegistry.IsDebugging) console.log("Card Keyword Registry: creating entry=" + i + ", ID=" + CardKeywordData[i].ID);
            //add to registry
            this.entryRegistry.addItem(entry);
            this.entryRegistryViaID.addItem(entry.ID, entry);
        }

        if (CardKeywordRegistry.IsDebugging) console.log("Card Keyword Registry: initialized, total count=" + this.entryRegistry.size());
    }

    //access functions (we do not want to allow direct access to registries, as they should remain unchanged)
    //callbacks have been provided to hook up as needed, providing unintrussive plug-and-play solution (while avoiding cyclindrical dep issues)
    //NOTE: we can hand out entry references because the values on entries are readonly (cannot be modified) 

    /** returns entry at given position */
    public CallbackGetEntryByPos(index: number): CardKeywordEntry { return CardKeywordRegistry.Instance.GetEntryByPos(index); }
    public GetEntryByPos(index: number): CardKeywordEntry { return this.entryRegistry.getItem(index); }
    /** returns def at given position */
    public CallbackGetDefByPos(index: number): CardKeywordDataObject { return CardKeywordRegistry.Instance.GetDefByPos(index); }
    public GetDefByPos(index: number): CardKeywordDataObject { return this.GetEntryByPos(index).DataDef; }

    /** returns entry of given id */
    public CallbackGetEntryByID(id: string): CardKeywordEntry { return CardKeywordRegistry.Instance.GetEntryByID(id); }
    public GetEntryByID(id: string): CardKeywordEntry { return this.entryRegistryViaID.getItem(id); }
    /** returns def of given id */
    public CallbackGetDefByID(id: string): CardKeywordDataObject { return CardKeywordRegistry.Instance.GetDefByID(id); }
    public GetDefByID(id: string): CardKeywordDataObject { return this.GetEntryByID(id).DataDef; }
}