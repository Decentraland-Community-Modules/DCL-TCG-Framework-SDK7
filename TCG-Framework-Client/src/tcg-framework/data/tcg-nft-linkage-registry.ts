import { GetUserDataResponse, getUserData } from '~system/UserIdentity';
import { getRealm } from '~system/Runtime';
import { CONTRACT_DATA_ID, ContractData, ContractDataObject, NFT_ACTIVATION_TYPE } from './tcg-nft-linkage-data';
import Dictionary, { List } from '../../utilities/collections';
import { CardData } from './tcg-card-data';
import { CardDataRegistry } from './tcg-card-registry';
import { STARTING_CARD_PROVISION } from '../config/tcg-config';
import { Entity, TextAlignMode, TextShape, Transform, engine } from '@dcl/sdk/ecs';
import { Quaternion } from '@dcl/sdk/math';
import { onProfileChanged } from '@dcl/sdk/observables';
import { UserData } from '~system/Players';
    
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
    //debugging entity (b.c dcl sucks at displaying logs when deployed)
    private dLogEntity:Entity = engine.addEntity();

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

    public userID:string = "";

    //data registries
    //  to ALL registered data (unsorted)
    private registryAll: List<NFTLinkageEntry>;
    //  id as key 
    private registryViaID: Dictionary<NFTLinkageEntry>;
    private registryViaType: Dictionary<List<NFTLinkageEntry>>;
    
    /**
     * prepares the inventory for use, populating all inventory item and callback dictionaries. 
     */
    public constructor() {
        //setup 3D debug log 
        Transform.create(this.dLogEntity, {
            position: {x:0.1, y:1.8, z:10},
            rotation: Quaternion.fromEulerDegrees(0,-90,0),
            scale: {x:0.1, y:0.1, z:0.1}
        });
        TextShape.create(this.dLogEntity, {
            text: "<LOG TEXT>",
            fontSize: 4,
            textAlign: TextAlignMode.TAM_MIDDLE_LEFT,
            textWrapping: false,
            width: 24, height:8
        });

        if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"initializing...");

        //initialize card collections
        this.registryAll = new List<NFTLinkageEntry>();
        this.registryViaID = new Dictionary<NFTLinkageEntry>();
        this.registryViaType = new Dictionary<List<NFTLinkageEntry>>();

        //populate registry collections
        //  process every card def
        for (var i: number = 0; i < ContractData.length; i++) {
            //prepare entry
            const entry = new NFTLinkageEntry(i, ContractData[i].id);
            if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"creating entry=" + i + ", id=" + ContractData[i].id.toString());
            //ensure type registry exists
            if(!this.registryViaType.containsKey(ContractData[i].type.toString()))
                this.registryViaType.addItem(ContractData[i].type.toString(), new List<NFTLinkageEntry>());
            //add to registry
            this.registryAll.addItem(entry);
            this.registryViaID.addItem(ContractData[i].id.toString(), entry);
            this.registryViaType.getItem(ContractData[i].type.toString()).addItem(entry);
        }

        if (NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"initialized, total count=" + this.registryAll.size());

        //assign event => refresh card ownership whenever player changes their equipped items 
        onProfileChanged.add((profileData) => {
            NFTLinkageRegistry.Instance.CalculateCardProvisionCounts();    
        });
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
            TextShape.getMutable(this.dLogEntity).text = "THIS LOG DISPLAYS THE LATEST LOAD ATTMEPT FOR CHECKING PLAYER-OWNED NFTS & WEARABLES";

            //reset nft ownership (all entries to false)
            for (var i: number = 0; i < this.registryAll.size(); i++) {
                this.registryAll.getItem(i).IsOwned = false;
            }

            //get user data
            TextShape.getMutable(this.dLogEntity).text += "\n\tcalculating cards for userID="+this.userID;
            /*this.userData = await getUserData({});
            if(!this.userData || !this.userData.data) {
                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"<ERROR> failed to get user data");
                return;
            }*/

            //## process all items player is wearing
            await this.ProcessCardsetsWear();

            //process ownership of all contracts based on whether the player owns the required NFT
            await this.ProcessCardsetsOwn();

            TextShape.getMutable(this.dLogEntity).text += "\nNFT CARDSET PROCESSING COMPLETED!";
        } catch (error) {
            console.log(NFTLinkageRegistry.debugTag+"an error occurred while processing contracts:\n"+error);
            TextShape.getMutable(this.dLogEntity).text += "\nfailed, error:\n"+error;
        }
    }

    public async ProcessCardsetsWear() {
        //attempt to process json
        try {
            TextShape.getMutable(this.dLogEntity).text += "\n\n\tprocessing player's worn NFTs: (current test, unlock void cards by wearing: eye-patch)";
            //## process all items player is wearing
            const listWorn = this.registryViaType.getItem(NFT_ACTIVATION_TYPE.WEAR.toString());
            if(listWorn) {

                //  create url 
                const urlWear = "https://peer.decentraland.org/lambdas/profiles/"+this.userID;
                //DEBUGGING URL => const urlWear = "https://peer.decentraland.org/lambdas/profiles/0xC24789C6f165329290Ddd3fBEac3b6842a294003";
                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"making call using url: "+urlWear);
                TextShape.getMutable(this.dLogEntity).text += "\n\tgetting currently worn through url="+urlWear;
                
                //get player's inventory
                let resultWear = await fetch(urlWear);
                if(!resultWear) {
                    if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"<ERROR> failed to get player's inventory");
                    return;
                }

                //attempt to pull json from url
                let jsonWear = await resultWear.json();
                if(!jsonWear || !jsonWear["avatars"] || !jsonWear["avatars"]["0"]) {
                    if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"<ERROR> failed to process fetch into json output");
                    return;
                }

                //process provided listing
                const wearables = jsonWear["avatars"]["0"]["avatar"]["wearables"].toString().split(',');
                wearables.forEach((dclNFT: any) => {
                    console.log(dclNFT)
                    //process all wearable nfts
                    for(let j:number=0; j < listWorn.size(); j++) {
                        const entry = listWorn.getItem(j);
                        if (entry.DataDef.urn === dclNFT) {
                            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"contract="+entry.ID+" unlocked cards by wearing NFT="+dclNFT);
                            TextShape.getMutable(this.dLogEntity).text += "\n\t\tunlocked cardset="+entry.ID+" by wearing NFT="+dclNFT;
                            entry.IsOwned = true;
                            break;
                        }
                    }
                });

                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"finished processing player's worn NFTs!");
            } else {
                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"no cardsets are locked behind wearing NFTs, skipping check");
            }
        } catch (error) {
            console.log(NFTLinkageRegistry.debugTag+"an error occurred while processing contracts:\n"+error);
            TextShape.getMutable(this.dLogEntity).text += "\nfailed, error:\n"+error;
        }
    }
    
    public async ProcessCardsetsOwn() {
        //attempt to process json
        try {
            //process ownership of all contracts based on whether the player owns the required NFT
            TextShape.getMutable(this.dLogEntity).text += "\n\n\tprocessing player's owned NFTs: (current test, unlock neutral cards by owning: shoes of speed)";
            const listOwned = this.registryViaType.getItem(NFT_ACTIVATION_TYPE.OWN.toString());
            if(listOwned) {
                //  create url 
                const urlOwn = "https://peer.decentraland.org/lambdas/collections/wearables-by-owner/"+this.userID//+"?includeDefinitions";
                //DEBUGGING URL => const urlOwn = "https://peer.decentraland.org/lambdas/collections/wearables-by-owner/0xC24789C6f165329290Ddd3fBEac3b6842a294003?includeDefinitions";
                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"making call using url: "+urlOwn);
                TextShape.getMutable(this.dLogEntity).text += "\n\tgetting currently worn through url="+urlOwn;
                
                //get player's inventory
                let resultOwn = await fetch(urlOwn);
                if(!resultOwn) {
                    if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"<ERROR> failed to get player's inventory");
                    return;
                }

                //attempt to pull json from url
                let jsonOwn = await resultOwn.json();
                if(!jsonOwn) {
                    if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"<ERROR> failed to process fetch into json output");
                    return;
                }

                //process provided listing
                jsonOwn.forEach((dclNFT: any) => {
                    //process all wearable nfts
                    for(let j:number=0; j < listOwned.size(); j++) {
                        const entry = listOwned.getItem(j);
                        if (entry.DataDef.urn === dclNFT["urn"]) {
                            if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"contract="+entry.ID+" required player to wear NFT="+dclNFT["urn"]);
                            TextShape.getMutable(this.dLogEntity).text += "\n\t\tunlocked cardset="+entry.ID+" by owning NFT="+dclNFT["urn"];
                            entry.IsOwned = true;
                            break;
                        }
                    }
                });

                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"finished processing player's owned NFTs!");
            } else {
                if(NFTLinkageRegistry.IsDebugging) console.log(NFTLinkageRegistry.debugTag+"no cardsets are locked behind owning NFTs, skipping check");
            }
        } catch (error) {
            console.log(NFTLinkageRegistry.debugTag+"an error occurred while processing contracts:\n"+error);
            TextShape.getMutable(this.dLogEntity).text += "\nfailed, error:\n"+error;
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