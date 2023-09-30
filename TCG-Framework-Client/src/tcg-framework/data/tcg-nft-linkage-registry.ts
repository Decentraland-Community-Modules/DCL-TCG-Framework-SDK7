import { getUserData } from '~system/UserIdentity';
import { getRealm } from '~system/Runtime';
import { CONTRACT_DATA_ID, ContractData, ContractDataObject } from './tcg-nft-linkage-data';
import Dictionary, { List } from '../../utilities/collections';
import { CardData } from './tcg-card-data';
import { CardDataRegistry } from './tcg-card-registry';
import { STARTING_CARD_PROVISION } from '../config/tcg-config';
import { executeTask } from '@dcl/sdk/ecs';
    
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
        if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"initializing...");

        //initialize card collections
        this.registryAll = new List<NFTLinkageEntry>();
        this.registryViaID = new Dictionary<NFTLinkageEntry>();

        //populate registry collections
        //  process every card def
        for (var i: number = 0; i < ContractData.length; i++) {
            //prepare entry
            const entry = new NFTLinkageEntry(i, ContractData[i].id);
            if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"creating entry=" + i + ", id=" + ContractData[i].id.toString());
            //add to registry
            this.registryAll.addItem(entry);
            this.registryViaID.addItem(ContractData[i].id.toString(), entry);
        }

        if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"initialized, total count=" + this.registryAll.size());
    }

    /** recalculates what what cards/how many cards the player is allowed to add to their decks */
    public async CalculateCardProvisionCounts() {
        try {
            if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"recalculating card provisions...");
            //reset all counts for cards in registry
            for(let i:number=0; i < CardData.length; i++) {
                CardDataRegistry.Instance.GetEntryByPos(i).CountAllowed = 0;
            }

            //provide default card set
            for(let i:number=0; i < STARTING_CARD_PROVISION.length; i++) {
                CardDataRegistry.Instance.GetEntryByID(STARTING_CARD_PROVISION[i].id).CountAllowed += STARTING_CARD_PROVISION[i].count;
            }

            //refresh nft ownership
            await this.assertOwnedNFTs();

            //process all contract entries
            var logOwnership = "";
            for(let i:number=0; i < this.registryAll.size(); i++) {
                //if nft is owned by player
                const contractEntry = this.registryAll.getItem(i);
                if(contractEntry.IsOwned) {
                    //provide all associated cards
                    for(let j:number=0; j < contractEntry.DataDef.linkedCards.length; j++) {
                        CardDataRegistry.Instance.GetEntryByID(contractEntry.DataDef.linkedCards[j].id).CountAllowed += contractEntry.DataDef.linkedCards[j].count;
                    }
                    logOwnership += "\n\t" + i + " owned=true";
                } else {
                    logOwnership += "\n\t" + i + " owned=false";
                }
            }
            if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"recalculated card provisions!\ncontracts by pos:"+logOwnership);
        } catch (error) {
            console.log(NFTLinkageRegistry.debugTag+"an error occurred while recalculating player card provisions:\n"+error);
        }
    }

    /** attempts reassert what nfts the local player owns */
    public async assertOwnedNFTs() {
        //attempt to process json
        try {
            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"reasserting owned NFT sets...");

            //reset nft ownership (all entries to false)
            for (var i: number = 0; i < this.registryAll.size(); i++) {
                this.registryAll.getItem(i).IsOwned = false;
            }

            //get user data
            const userData = await getUserData({});
            if(!userData) {
                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"<ERROR> failed to get user data");
                return;
            }
            if(!userData.data) {
                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"<ERROR> failed to get user data return");
                return;
            }
            //get realm info
            const realmInfo = await getRealm({});
            if(!realmInfo) {
                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"<ERROR> failed to get realm data");
                return;
            }
            if(!realmInfo.realmInfo) {
                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"<ERROR> failed to get realm data return");
                return;
            }

            //create url 
            const url = realmInfo.realmInfo.baseUrl+"/lambdas/profile/"+userData.data.userId;
            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"making call using url: "+url);
            
            //attempt to pull json from url
            const json = (await fetch(url)).json();
            if(!json) {
                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"<ERROR> failed to process fetch into json output");
                return;
            }
            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"full response: "+json);

            //TODO: process all contracts vs returned ownership data from player

            //console.log('player is wearing :'+json[0].metadata.avatars[0].avatar.wearables);
            //console.log('player owns :'+json[0].metadata.avatars[0].inventory);
        } catch (error) {
            console.log(NFTLinkageRegistry.debugTag+"an error occurred while processing contracts:\n"+error);
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