import Dictionary, { List } from "../../utilities/collections";
import { STATUS_EFFECT_ID, StatusEffectData, StatusEffectDataObject } from "./tcg-status-effect-data";

/*      TRADING CARD GAME - CARD STATUS EFFECTS REGISTRY
    provides sorted access to all farm crop data pieces

    author: Alex Pazder
    contact: TheCryptoTrader69@gmail.com 
*/

/** defines a single status effect */
export class StatusEffectEntry {
    /** id data object referenced by this entry */
    private id: string;
    public get ID(): string { return this.id; }
    /** positional index of data object */
    private position: number;
    public get Position(): number { return this.position; }
    /** provide data reference */
    public get DataDef(): StatusEffectDataObject { return StatusEffectData[this.position]; }

    constructor(pos: number, id: string) {
        this.position = pos;
        this.id = id;
    }
}
/** manages all status effects */
export class SatusEffectRegistry {
    /** when true debugging logs will be generated (ensure is false when deploying to remove overhead) */
    private static IsDebugging: boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    private static debugTag:string = "Card Effect Registry: ";

    //access pocketing
    private static instance: undefined | SatusEffectRegistry;
    public static get Instance(): SatusEffectRegistry {
        //ensure instance is set
        if (SatusEffectRegistry.instance === undefined) {
            SatusEffectRegistry.instance = new SatusEffectRegistry();
        }

        return SatusEffectRegistry.instance;
    }

    //sheet registries
    //private textureRegistry: Dictionary<CardKeywordTextureDataObject>;

    //registries for data access
    //  ALL registered data
    private entryRegistry: List<StatusEffectEntry>;
    //  id as key 
    private entryRegistryViaID: Dictionary<StatusEffectEntry>;

    /** prepares registry for use, this is done automatically when the instance is first called */
    public constructor() {
        if (SatusEffectRegistry.IsDebugging) console.log(SatusEffectRegistry.debugTag+"initializing...");

        //initialize collection sets
        this.entryRegistry = new List<StatusEffectEntry>();
        this.entryRegistryViaID = new Dictionary<StatusEffectEntry>();

        //populate registry collections
        //  process every def
        for (var i: number = 0; i < StatusEffectData.length; i++) {
            //prepare entry
            const entry = new StatusEffectEntry(i, StatusEffectData[i].id.toString());
            if (SatusEffectRegistry.IsDebugging) console.log(SatusEffectRegistry.debugTag+"creating entry=" + i + ", ID=" + StatusEffectData[i].id);
            //add to registry
            this.entryRegistry.addItem(entry);
            this.entryRegistryViaID.addItem(entry.ID, entry);
        }

        if (SatusEffectRegistry.IsDebugging) console.log(SatusEffectRegistry.debugTag+"initialized, total count=" + this.entryRegistry.size());
    }

    //access functions (we do not want to allow direct access to registries, as they should remain unchanged)
    //callbacks have been provided to hook up as needed, providing unintrussive plug-and-play solution (while avoiding cyclindrical dep issues)
    //NOTE: we can hand out entry references because the values on entries are readonly (cannot be modified) 
    
    /** returns entry at given position */
    public CallbackGetEntryByPos(index: number): StatusEffectEntry { return SatusEffectRegistry.Instance.GetEntryByPos(index); }
    public GetEntryByPos(index: number): StatusEffectEntry { return this.entryRegistry.getItem(index); }
    /** returns def at given position */
    public CallbackGetDefByPos(index: number): StatusEffectDataObject { return SatusEffectRegistry.Instance.GetDefByPos(index); }
    public GetDefByPos(index: number): StatusEffectDataObject { return this.GetEntryByPos(index).DataDef; }

    /** returns entry of given id */
    public CallbackGetEntryByID(id: STATUS_EFFECT_ID): StatusEffectEntry { return SatusEffectRegistry.Instance.GetEntryByID(id); }
    public GetEntryByID(id: STATUS_EFFECT_ID): StatusEffectEntry { return this.entryRegistryViaID.getItem(id.toString()); }
    /** returns def of given id */
    public CallbackGetDefByID(id: STATUS_EFFECT_ID): StatusEffectDataObject { return SatusEffectRegistry.Instance.GetDefByID(id); }
    public GetDefByID(id:STATUS_EFFECT_ID): StatusEffectDataObject { return this.GetEntryByID(id).DataDef; }
}