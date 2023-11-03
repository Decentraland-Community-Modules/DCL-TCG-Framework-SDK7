import { List } from '../../utilities/collections';
import { CARD_UNLOCK_TYPE, CardDataRegistry } from './tcg-card-registry';
import { Entity, TextAlignMode, TextShape, Transform, engine } from '@dcl/sdk/ecs';
import { Quaternion } from '@dcl/sdk/math';
import { LevelUnlockData, LevelUnlockDataObject } from './tcg-level-unlocks-data';

/*      TRADING CARD GAME - LEVEL UNLOCKS REGISTRY

    registry containing entries for all levels that unlock cards

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/

/* linkage for a single level unlock's data in the game */
export class LevelUnlockEntry {
    //level required to unlock
    private level:number; 
    public get Level() { return this.level; }
    //level unlock's data position
    private position:number;
    public get Position():number { return this.Position; }
    //returns the card's data component
    public get DataDef():LevelUnlockDataObject { return LevelUnlockData[this.position]; }
    
    //when true, nft belonging to contract is owned by the local player/has access to provided cards
    public IsOwned:boolean = false;

    /** prepares entry for use */
    constructor(pos:number, level:number) {
        this.position = pos;
        this.level = level;
    }
}
/*  manages entries for all level unlockables */
export class LevelUnlockRegistry {
    /** when true debug logs are generated (toggle off when you deploy) */
    static IsDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    static debugTag:string = "TCG Level Unlock Registry: ";
    //debugging entity (b.c dcl sucks at displaying logs when deployed)
    private dLogEntity:Entity = engine.addEntity();

    /** represents the current load-state of the module, when true system is still processing */
    private isLoading:boolean = false;
    public get IsLoading() { return this.isLoading; }

    /** access pocketing */
    private static instance: undefined | LevelUnlockRegistry;
    public static get Instance(): LevelUnlockRegistry {
        //ensure instance is set
        if (LevelUnlockRegistry.instance === undefined) {
            LevelUnlockRegistry.instance = new LevelUnlockRegistry();
        }

        return LevelUnlockRegistry.instance;
    }

    //data registries
    private registryAll: List<LevelUnlockEntry>;
    
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

        if(LevelUnlockRegistry.IsDebugging) console.log(LevelUnlockRegistry.debugTag+"initializing...");

        //initialize card collections
        this.registryAll = new List<LevelUnlockEntry>();

        //populate registry collections
        //  process every def
        for(var i: number = 0; i < LevelUnlockData.length; i++) {
            //prepare entry
            const entry = new LevelUnlockEntry(i, LevelUnlockData[i].level);
            if (LevelUnlockRegistry.IsDebugging) console.log(LevelUnlockRegistry.debugTag+"creating entry {index=" + i + ", level=" + LevelUnlockData[i].level + "}");
            //add to registry
            this.registryAll.addItem(entry);
        }

        if(LevelUnlockRegistry.IsDebugging) console.log(LevelUnlockRegistry.debugTag+"initialized, total count=" + this.registryAll.size());
    }

    /** recalculates how many cards the player is allowed to add to their decks */
    public async CalculateCardProvisionCounts(level:number) {
        try {
            if(LevelUnlockRegistry.IsDebugging) console.log(LevelUnlockRegistry.debugTag+"recalculating card provisions provided by levels {level="+level+"}...");

            //reset all card allowcations for contracts
            CardDataRegistry.Instance.ResetAllowedCount(CARD_UNLOCK_TYPE.LEVEL);
            
            //process all contract entries
            var logOwnership = "";
            for(let i:number=0; i < this.registryAll.size(); i++) {
                //if contract is owned by player
                const entry = this.registryAll.getItem(i);
                logOwnership += "\n\t" + i + ", required level="+entry.Level+" owned=";
                if(entry.Level <= level) {
                    //provide all associated cards
                    for(let j:number=0; j < entry.DataDef.providedCards.length; j++) {
                        CardDataRegistry.Instance.GetEntryByID(entry.DataDef.providedCards[j].id).AddCount(CARD_UNLOCK_TYPE.LEVEL, entry.DataDef.providedCards[j].count);
                    }
                    logOwnership += "true";
                } else {
                    logOwnership += "false";
                }
            }
            if(LevelUnlockRegistry.IsDebugging) console.log(LevelUnlockRegistry.debugTag+"recalculated card provisions provided by level!"+logOwnership);
        } catch (error) {
            console.log(LevelUnlockRegistry.debugTag+"an error occurred while recalculating player card provisions:\n"+error);
        }
    }

    //### CONTRACTS
    /** returns level entry at given position */
    public CallbackGetEntryByPos(index: number): LevelUnlockEntry { return LevelUnlockRegistry.Instance.GetEntryByPos(index); }
    public GetEntryByPos(index: number): LevelUnlockEntry { return this.registryAll.getItem(index); }
}