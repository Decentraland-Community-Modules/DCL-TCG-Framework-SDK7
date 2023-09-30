import { getUserData } from '~system/UserIdentity';
import { getRealm } from '~system/Runtime';
import { CONTRACT_DATA_ID, ContractData, ContractDataObject } from './tcg-nft-linkage-data';
import Dictionary, { List } from '../../utilities/collections';
import { CardData } from './tcg-card-data';
import { CardDataRegistry } from './tcg-card-registry';
    
/*      TRADING CARD GAME - NFT LINKAGE REGISTRY

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
/* linkage for a single nft linkage contract's data in the game */
export class NFTLinkageEntry {
    //card's uid
    private id:CONTRACT_DATA_ID; 
    public get ID() { return this.id; }
    //card's data position
    private position:number;
    public get Position():number { return this.Position; }
    //returns the card's data component
    public get DataDef():ContractDataObject { return ContractData[this.position]; }
    
    //when true, nft belonging to contract is owned by the local player/has access to provided cards
    public IsOwned:boolean = false;

    /** prepares card data entry for use */
    constructor(pos:number, id:CONTRACT_DATA_ID) {
        this.position = pos;
        this.id = id;
    }
}
/*  manages all general card defs and the player's allowed cards per deck 
    many functions within assume that the system has been initialized & loaded the player's data
    from the correct source/setting (defined by network type)
*/
export class NFTLinkageRegistry {
    /** when true debug logs are generated (toggle off when you deploy) */
    static IsDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    static debugTag:string = "TCG NFT Link Registry: ";

    /** represents the current load-state of the module, when true system is refreshing NFT contract ownership rights */
    private isLoading:boolean = false;
    public get IsLoading() { return this.isLoading; }

    /** access pocketing */
    private static instance: undefined | NFTLinkageRegistry;
    public static get Instance(): NFTLinkageRegistry {
        //ensure instance is set
        if (NFTLinkageRegistry.instance === undefined) {
            NFTLinkageRegistry.instance = new NFTLinkageRegistry();
        }

        return NFTLinkageRegistry.instance;
    }

    //data registries
    //  to ALL registered data (unsorted)
    private registryAll: List<NFTLinkageEntry>;
    //  id as key 
    private registryViaID: Dictionary<NFTLinkageEntry>;
    
    /**
     * prepares the inventory for use, populating all inventory item and callback dictionaries. 
     */
    public constructor() {
        if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.IsDebugging+"initializing...");

        //initialize card collections
        this.registryAll = new List<NFTLinkageEntry>();
        this.registryViaID = new Dictionary<NFTLinkageEntry>();

        //populate registry collections
        //  process every card def
        for (var i: number = 0; i < ContractData.length; i++) {
            //prepare entry
            const entry = new NFTLinkageEntry(i, ContractData[i].id);
            if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.IsDebugging+"creating entry=" + i + ", id=" + ContractData[i].id.toString());
            //add to registry
            this.registryAll.addItem(entry);
            this.registryViaID.addItem(ContractData[i].id.toString(), entry);
        }

        if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.IsDebugging+"initialized, total count=" + this.registryAll.size());
    }

    /** recalculates what what cards/how many cards the player is allowed to add to their decks */
    public CalculateCardProvisionCounts() {
        //reset all counts for cards in registry
        for(let i:number=0; i < CardData.length; i++) {
            CardDataRegistry.Instance.GetEntryByPos(i).CountAllowed = 0;
        }

    }

    /** attempts to collect the player's data */
    public async fetchPlayerData() {
        //attempt to process json
        try {
            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"attempting to fetch player data");
            //get user data
            const userData = await getUserData({});
            if(!userData.data) return;
            //get realm info
            const realmInfo = await getRealm({});
            if(!realmInfo.realmInfo) return;
            
            //create url 
            const url = realmInfo.realmInfo.baseUrl+"/lambdas/profile/"+userData.data.userId;
            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"making call using url: "+url);
            
            //attempt to pull json from url
            const json = (await fetch(url)).json();
            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"full response: "+json);

            //console.log('player is wearing :'+json[0].metadata.avatars[0].avatar.wearables);
            //console.log('player owns :'+json[0].metadata.avatars[0].inventory);
        } catch {
            console.log('an error occurred while reaching for player data');
        }
    }

    /** attempts to collect the player's wearable data */
    public async fetchWearablesData() {
        try {
            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"attempting to fetch player wearable data");
            //get user data
            const userData = await getUserData({});
            if(!userData.data) return;
            //get realm info
            const realmInfo = await getRealm({});
            if(!realmInfo.realmInfo) return;

            //create url
            const url = realmInfo.realmInfo.baseUrl+"/lambdas/collections/wearables-by-owner/"+userData.data.userId+"includeDefinitions";
            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"making call using url: "+url);

            //attempt to pull json from url
            const json = (await fetch(url)).json();
            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"full response: "+json);
        } catch {
            console.log('an error occurred while reaching for wearables data');
        }
    }

    //### CONTRACTS
    /** returns contract entry at given position */
    public CallbackGetEntryByPos(index: number): NFTLinkageEntry { return NFTLinkageRegistry.Instance.GetEntryByPos(index); }
    public GetEntryByPos(index: number): NFTLinkageEntry { return this.registryAll.getItem(index); }
    /** returns entry of given id */
    public CallbackGetEntryByID(id: string): NFTLinkageEntry { return NFTLinkageRegistry.Instance.GetEntryByID(id); }
    public GetEntryByID(id: string): NFTLinkageEntry { return this.registryViaID.getItem(id); }
}