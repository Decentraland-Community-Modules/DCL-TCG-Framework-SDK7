import { CONTRACT_DATA_ID, ContractUnlockData, ContractUnlockDataObject, CONTRACT_ACTIVATION_TYPE } from './tcg-contract-unlocks-data';
import { Dictionary, List } from '../../utilities/collections';
import { CARD_UNLOCK_TYPE, CardDataRegistry } from './tcg-card-registry';
import { Entity, TextAlignMode, TextShape, Transform, engine } from '@dcl/sdk/ecs';
import { Quaternion } from '@dcl/sdk/math';
import { onProfileChanged } from '@dcl/sdk/observables';
import * as utils from '@dcl-sdk/utils';

/*      TRADING CARD GAME - CONTRACT UNLOCK REGISTRY

    registry containing entries for all contracts that unlock cards

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/

/* linkage for a single nft's contract data in the game */
export class ContractUnlockEntry {
    //card's uid
    private id:CONTRACT_DATA_ID; 
    public get ID() { return this.id; }
    //card's data position
    private position:number;
    public get Position():number { return this.Position; }
    //returns the card's data component
    public get DataDef():ContractUnlockDataObject { return ContractUnlockData[this.position]; }
    
    //when true, nft belonging to contract is owned by the local player/has access to provided cards
    public IsOwned:boolean = false;

    /** prepares card data entry for use */
    constructor(pos:number, id:CONTRACT_DATA_ID) {
        this.position = pos;
        this.id = id;
    }
}
/* manages entries for all contract unlockables */
export class ContractUnlockRegistry {
    /** when true debug logs are generated (toggle off when you deploy) */
    static IsDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    static debugTag:string = "TCG Contract Unlock Registry: ";
    //debugging entity (b.c dcl sucks at displaying logs when deployed)
    private dLogEntity:Entity = engine.addEntity();

    /** represents the current load-state of the module, when true system is still processing */
    private isLoading:boolean = false;
    public get IsLoading() { return this.isLoading; }

    /** returns the user's id */
    public GetUserID = ():string => { return ""; }

    /** access pocketing */
    private static instance: undefined | ContractUnlockRegistry;
    public static get Instance(): ContractUnlockRegistry {
        //ensure instance is set
        if (ContractUnlockRegistry.instance === undefined) {
            ContractUnlockRegistry.instance = new ContractUnlockRegistry();
        }

        return ContractUnlockRegistry.instance;
    }

    //data registries
    //  to ALL registered data (unsorted)
    private registryAll: List<ContractUnlockEntry>;
    //  id as key 
    private registryViaID: Dictionary<ContractUnlockEntry>;
    //  data split via activation type (owning, wearing)
    private registryViaType: Dictionary<List<ContractUnlockEntry>>;
    
    /** prepares instanced registry for use */
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

        if (ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"initializing...");

        //initialize card collections
        this.registryAll = new List<ContractUnlockEntry>();
        this.registryViaID = new Dictionary<ContractUnlockEntry>();
        this.registryViaType = new Dictionary<List<ContractUnlockEntry>>();

        //populate registry collections
        //  process every type
        Object.keys(CONTRACT_ACTIVATION_TYPE).forEach((key, value) => {
            //add type listing
            if (ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"creating type {key=" + key+", value="+value+"}");
            this.registryViaType.addItem(key.toString(), new List<ContractUnlockEntry>());
        });
        //  process every def
        for (var i: number = 0; i < ContractUnlockData.length; i++) {
            //prepare entry
            const entry = new ContractUnlockEntry(i, ContractUnlockData[i].id);
            if (ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"creating entry {index=" + i + ", id=" + ContractUnlockData[i].id.toString()
                +", type="+ContractUnlockData[i].type.toString()+"}");
            //add to registry
            this.registryAll.addItem(entry);
            this.registryViaID.addItem(ContractUnlockData[i].id.toString(), entry);
            this.registryViaType.getItem(ContractUnlockData[i].type.toString()).addItem(entry);
        }

        if (ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"initialized, total count=" + this.registryAll.size());

        //assign event => refresh card ownership whenever player changes their equipped items 
        onProfileChanged.add((profileData) => {
            utils.timers.setTimeout(function () {
                ContractUnlockRegistry.Instance.CalculateCardProvisionCounts();   
            }, 10000);
        });
    }

    /** recalculates how many cards the player is allowed to add to their decks */
    public async CalculateCardProvisionCounts() {
        try {
            if (ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"recalculating card provisions...");

            //reset all card allowcations for contracts
            CardDataRegistry.Instance.ResetAllowedCount(CARD_UNLOCK_TYPE.CONTRACT);

            //refresh nft ownership
            await this.assertOwnedNFTs();

            //process all contract entries
            var logOwnership = "";
            for(let i:number=0; i < this.registryAll.size(); i++) {
                //if contract is owned by player
                const contractEntry = this.registryAll.getItem(i);
                if(contractEntry.IsOwned) {
                    //provide all associated cards
                    for(let j:number=0; j < contractEntry.DataDef.providedCards.length; j++) {
                        CardDataRegistry.Instance.GetEntryByID(contractEntry.DataDef.providedCards[j].id).AddCount(CARD_UNLOCK_TYPE.CONTRACT, contractEntry.DataDef.providedCards[j].count);
                    }
                    logOwnership += "\n\t" + i + " owned=true";
                } else {
                    logOwnership += "\n\t" + i + " owned=false";
                }
            }
            if (ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"recalculated card provisions!\ncontracts by pos:"+logOwnership);
        } catch (error) {
            console.log(ContractUnlockRegistry.debugTag+"an error occurred while recalculating player card provisions:\n"+error);
        }
    }

    /** attempts reassert what nft contracts the local player owns */
    public async assertOwnedNFTs() {
        //attempt to process json
        try {
            if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"reasserting owned NFT sets...");
            TextShape.getMutable(this.dLogEntity).text = "THIS LOG DISPLAYS THE LATEST LOAD ATTMEPT FOR CHECKING PLAYER-OWNED NFTS & WEARABLES"
                +"\n\tcalculating cards for userID="+this.GetUserID();

            //reset nft ownership (all entries to false)
            for (var i: number = 0; i < this.registryAll.size(); i++) {
                this.registryAll.getItem(i).IsOwned = false;
            }

            //process all contracts owned by the player
            await this.ProcessContractRewardsOwn();
            //process all contracts worn by the player
            await this.ProcessContractRewardsWorn();

            TextShape.getMutable(this.dLogEntity).text += "\nNFT CARDSET PROCESSING COMPLETED!";
        } catch (error) {
            console.log(ContractUnlockRegistry.debugTag+"an error occurred while processing contracts:\n"+error);
            TextShape.getMutable(this.dLogEntity).text += "\nfailed, error:\n"+error;
        }
    }
    
    /** process all contracts that require the nft to be owned */
    public async ProcessContractRewardsOwn() {
        //attempt to process json
        try {
            //process ownership of all contracts based on whether the player owns the required NFT
            TextShape.getMutable(this.dLogEntity).text += "\n\n\tprocessing player's owned NFTs: (current test, unlock neutral cards by owning: shoes of speed)";
            const listOwned = this.registryViaType.getItem(CONTRACT_ACTIVATION_TYPE.OWN.toString());
            if(listOwned) {
                //create url 
                const urlOwn = "https://peer.decentraland.org/lambdas/collections/wearables-by-owner/"+this.GetUserID()//+"?includeDefinitions";
                //DEBUGGING URL => const urlOwn = "https://peer.decentraland.org/lambdas/collections/wearables-by-owner/0xC24789C6f165329290Ddd3fBEac3b6842a294003?includeDefinitions";
                if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"making call using url: "+urlOwn);
                TextShape.getMutable(this.dLogEntity).text += "\n\tgetting currently worn through url="+urlOwn;
                
                //get player's inventory
                let resultOwn = await fetch(urlOwn);
                if(!resultOwn) {
                    if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"<ERROR> failed to get player's inventory");
                    return;
                }

                //attempt to pull json from url
                let jsonOwn = await resultOwn.json();
                if(!jsonOwn) {
                    if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"<ERROR> failed to process fetch into json output");
                    return;
                }

                //process provided listing
                jsonOwn.forEach((dclNFT: any) => {
                    //process all wearable nfts
                    for(let j:number=0; j < listOwned.size(); j++) {
                        const entry = listOwned.getItem(j);
                        if (entry.DataDef.urn === dclNFT["urn"]) {
                            if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"contract="+entry.ID+" required player to wear NFT="+dclNFT["urn"]);
                            TextShape.getMutable(this.dLogEntity).text += "\n\t\tunlocked cardset="+entry.ID+" by owning NFT="+dclNFT["urn"];
                            entry.IsOwned = true;
                            break;
                        }
                    }
                });

                if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"finished processing player's owned NFTs!");
            } else {
                if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"no cardsets are locked behind owning NFTs, skipping check");
            }
        } catch (error) {
            console.log(ContractUnlockRegistry.debugTag+"an error occurred while processing contracts:\n"+error);
            TextShape.getMutable(this.dLogEntity).text += "\nfailed, error:\n"+error;
        }
    }

    /** process all contracts that require the nft to be worn */
    public async ProcessContractRewardsWorn() {
        //attempt to process json
        try {
            TextShape.getMutable(this.dLogEntity).text += "\n\n\tprocessing player's worn NFTs: (current test, unlock void cards by wearing: eye-patch)";
            //## process all items player is wearing
            const listWorn = this.registryViaType.getItem(CONTRACT_ACTIVATION_TYPE.WEAR.toString());
            if(listWorn) {
                //create url 
                const urlWear = "https://peer.decentraland.org/lambdas/profiles/"+this.GetUserID();
                //DEBUGGING URL => const urlWear = "https://peer.decentraland.org/lambdas/profiles/0xC24789C6f165329290Ddd3fBEac3b6842a294003";
                if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"making call using url: "+urlWear);
                TextShape.getMutable(this.dLogEntity).text += "\n\tgetting currently worn through url="+urlWear;
                
                //get player's inventory via url
                let resultWear = await fetch(urlWear);
                if(!resultWear) {
                    if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"<ERROR> failed to get player's inventory");
                    return;
                }

                //attempt to convert url's data to json
                let jsonWear = await resultWear.json();
                if(!jsonWear || !jsonWear["avatars"] || !jsonWear["avatars"]["0"]) {
                    if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"<ERROR> failed to process fetch into json output");
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
                            if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"contract="+entry.ID+" unlocked cards by wearing NFT="+dclNFT);
                            TextShape.getMutable(this.dLogEntity).text += "\n\t\tunlocked cardset="+entry.ID+" by wearing NFT="+dclNFT;
                            entry.IsOwned = true;
                            break;
                        }
                    }
                });

                if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"finished processing player's worn NFTs!");
            } else {
                if(ContractUnlockRegistry.IsDebugging) console.log(ContractUnlockRegistry.debugTag+"no cardsets are locked behind wearing NFTs, skipping check");
            }
        } catch (error) {
            console.log(ContractUnlockRegistry.debugTag+"an error occurred while processing contracts:\n"+error);
            TextShape.getMutable(this.dLogEntity).text += "\nfailed, error:\n"+error;
        }
    }

    //### CONTRACTS
    /** returns contract entry at given position */
    public CallbackGetEntryByPos(index: number): ContractUnlockEntry { return ContractUnlockRegistry.Instance.GetEntryByPos(index); }
    public GetEntryByPos(index: number): ContractUnlockEntry { return this.registryAll.getItem(index); }
    /** returns entry of given id */
    public CallbackGetEntryByID(id: string): ContractUnlockEntry { return ContractUnlockRegistry.Instance.GetEntryByID(id); }
    public GetEntryByID(id: string): ContractUnlockEntry { return this.registryViaID.getItem(id); }
}