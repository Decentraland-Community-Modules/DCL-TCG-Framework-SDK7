import Dictionary, { List } from "../utilities/collections";
import { CARD_TYPE, CardData, CardDataObject, CardKeywordEffectsDataObject } from "./data/tcg-card-data";
import { CARD_KEYWORD_EFFECT_EXECUTION, CARD_KEYWORD_EFFECT_TIMING, CARD_KEYWORD_ID } from "./data/tcg-keyword-data";
import { CardKeywordRegistry } from "./data/tcg-keyword-data-registry";
import { STATUS_EFFECT_AFFINITY, STATUS_EFFECT_ID, STATUS_EFFECT_PROCESSING_TYPE, StatusEffectDataObject } from "./data/tcg-status-effect-data";
import { SatusEffectRegistry as StatusEffectRegistry } from "./data/tcg-status-effect-registry";

/*      TRADING CARD GAME - PLAY CARD
    data representing a card that is currently in play & managed by a
    game table (not deck manager). these cards may or may not have a card object
    representing the card's view. (a card registered in a deck will only have
    a card object if it is in the player's hand or on the field) 

    these card defs hold values that are modified during play (ex:health reduced by
    taking damage)

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module PlayCard
{
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Card Play Data: ";

    /** all possible card states */
    export enum CARD_STATE_TYPE {
        DECK,
        HAND,
        FIELD,
        DISCARD,
    }

    /** indexing key */
    export function GetKeyFromData(data:PlayCardDataCreationData):string { 
        var key:string = "";
        if(data.deck != undefined) key += data.deck;
        key += "-"+data.defIndex+"-";
        if(data.index != undefined) key += data.index;
        return key; 
    };

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<PlayCardDataObject> = new List<PlayCardDataObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<PlayCardDataObject> = new List<PlayCardDataObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<PlayCardDataObject> = new List<PlayCardDataObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<PlayCardDataObject> = new Dictionary<PlayCardDataObject>();

    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|PlayCardDataObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }

    export interface ActiveKeywordData {
        ID:CARD_KEYWORD_ID
        Effects:CardKeywordEffectsDataObject[];
    }

    /** represents a status effect that is active on the card */
    export interface ActiveStatusEffectData {
        /** id of active effect */
        ID:STATUS_EFFECT_ID;
        Timing:CARD_KEYWORD_EFFECT_TIMING;
        /** strength of applied effect */
        Strength:number;
        /** duration/number of rounds an effect is applied for */
        Duration:number;
    }
    // serial data for keyword sets
    // NOTE: firebase does not allow for multi-layered arrays, this is work around
    export interface CardKeywordSerialDataSet {
      v:CardKeywordEffectsDataObject[];
    }
    
    //TODO: migrate to creation data system (pass all details to create a card in a single data object)
	/** object interface used to define all data required to create a new object */
	export interface PlayCardDataCreationData {
        //indexing 
        //  option 1 (used by deck manager)
        key?:string; //defines the key for card using a pre-set string (overwrites option 2)
        //  option 2 (used by card tables)
        deck?:string;
        index?:number;
        //target
        defIndex: number,
	}
    
    /** represents a card, packed to be passed over the network */
    export interface CardSerialData {
        //indexing
        index:number;
        defIndex:number;
        //live data
        cost:number;
        healthCur:number;
        healthMax:number;
        attack:number;
        armour:number;
        keywords:CardKeywordSerialDataSet[];
        effects:ActiveStatusEffectData[];
    }
    // serial data for card sets
    // NOTE: firebase does not allow for multi-layered arrays, this is work around
    export interface CardSerialDataSet {
      v:CardSerialData[];
    }

    /** contains all pieces that make up a card's playing data */
    export class PlayCardDataObject {
        /** when true this object is reserved in-scene */
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };

        /** current state of the card */
        public CardState:CARD_STATE_TYPE = 0;

        /** unique index of this slot's table, req for networking */
        private key:string = "";
        public get Key():string { return this.key; };

        /** index of deck that currently owns this card */
        private deck:string = "";
        public get Deck():string { return this.deck; }
        
        /** sub index of card, derived from the number of cards of the same def that exist within the deck */
        private index:number = 0;
        public get Index():number { return this.index; }

        /** core definition for this card (this should be expanded to target play data) */
        private defIndex:number = -1;
        public get DefIndex():number { return this.defIndex; };
        public get DefData():CardDataObject { return CardData[this.defIndex]; }
        
        //## GENERAL STATS
        /** cost to play card */
        public Cost:number = 0;

        //## CHARACTER STATS
        /** whether or not the character can attack */
        public ActionRemaining:boolean = false;
        /** health */
        public HealthCur:number = 0;
        public HealthMax:number = 0;
        /** attack */
        public Attack:number = 0;
        /** armour */
        public Armour:number = 0;

        //## IMPACT RESULTS
        /** defines whether or not this card was damaged by the last impact */
        public ImpactDamaged:boolean = false;

        //## KEYWORDS
        /** all keywords currently active on this card, sorted by activation type (applied onto other cards when an interaction occurs) */
        public ActiveKeywords:List<CardKeywordEffectsDataObject>[] = [];

        //## EFFECTS
        /** all effects currently active on this card (can assume this is a unit), indexed by status effect type (ex: burning/mending) */
        public ActiveEffectList:List<ActiveStatusEffectData> = new List<ActiveStatusEffectData>();
        public ActiveEffectDict:Dictionary<ActiveStatusEffectData> = new Dictionary<ActiveStatusEffectData>();

        /** initializes card play data with  */
        public Initialize(data:PlayCardDataCreationData) {
            this.isActive = true;
            //load in stats
            this.SetCard(data.defIndex);
            //indexing
            if(data.key != undefined) this.key = data.key;
            else {
                if(data.deck != undefined) this.deck = data.deck;
                if(data.index != undefined) this.index = data.index;
                this.key = this.deck+"-"+this.defIndex+"-"+this.index;
            }
        }

        /** resets the card with the current data def */
        public ResetCard() {
            this.SetCard(this.defIndex);
        }

        /** sets this card as the given data */
        public SetCard(index: number) {
            const cardDef = CardData[index];
            //general stats
            this.defIndex = index
            this.Cost = cardDef.cardCost;
            
            //reset keyword listing
            this.ActiveKeywords = [];
            Object.keys(CARD_KEYWORD_EFFECT_EXECUTION).forEach(() => {
                this.ActiveKeywords.push(new List<CardKeywordEffectsDataObject>());
            });
            //add each keyword to card
            for(let i:number=0; i<cardDef.cardKeywordEffects.length; i++) {
                //get keyword def
                const keywordDef = CardKeywordRegistry.Instance.GetDefByID(cardDef.cardKeywordEffects[i].id);
                //add keyword to listing
                this.ActiveKeywords[keywordDef.playEffect.activation].addItem({
                    id:cardDef.cardKeywordEffects[i].id,
                    strength:cardDef.cardKeywordEffects[i].strength,
                    duration:cardDef.cardKeywordEffects[i].duration,
                });
            }

            //prepare effect listing
            this.ActiveEffectList = new List<ActiveStatusEffectData>();
            this.ActiveEffectDict = new Dictionary<ActiveStatusEffectData>();

            //process type specific effects
            switch(cardDef.cardAttributes.type) {
                case CARD_TYPE.SPELL:

                break;
                case CARD_TYPE.CHARACTER:
                    this.HealthCur = cardDef.cardAttributes.unitHealth;
                    this.HealthMax = cardDef.cardAttributes.unitHealth;
                    this.Attack = cardDef.cardAttributes.unitAttack;
                    this.Armour = cardDef.cardAttributes.unitArmour;
                break;
                case CARD_TYPE.TERRAIN:

                break;
            }
        }

        /** called when a unit is placed onto the field, processing all played-to-field effects (ex: unit gets health growth) */
        public UnitPlayedToField() {
            if(isDebugging) console.log(debugTag+"playing card {id="+this.Key+", name="+this.DefData.name+"} to field...");

            //process every active keyword on card
            for(let i:number=0; i<this.ActiveKeywords[CARD_KEYWORD_EFFECT_EXECUTION.PLAYED].size(); i++) {
                //convert to effect
                this.ProcessKeyword(this.ActiveKeywords[CARD_KEYWORD_EFFECT_EXECUTION.PLAYED].getItem(i));
            }

            if(isDebugging) console.log(debugTag+"played card {id="+this.Key+", name="+this.DefData.name+"} to field!");
        }

        /** called when this card (deployed as a unit) is being interacted with by another card (spell) */
        public UnitImpactedBySpell(card:PlayCard.PlayCardDataObject) {
            if(isDebugging) console.log(debugTag+"impacting card {id="+this.Key+", name="+this.DefData.name+"} with spell {name="+card.DefData.name+"}...");

            //process all 'played' effects from spell card against this unit
            let listing = card.ActiveKeywords[CARD_KEYWORD_EFFECT_EXECUTION.PLAYED];
            for (let i = 0; i < listing.size(); i++) {
                this.ProcessKeyword(listing.getItem(i));
            }

            if(isDebugging) console.log(debugTag+"impacted card {id="+this.Key+", name="+this.DefData.name+"} with spell {name="+card.DefData.name+"}!");
        }

        /** called when this card (deployed as a unit) is being attacked by another unit */
        public UnitImpactedByUnit(attacker:PlayCard.PlayCardDataObject) {
            //ensure attacking card is a unit
            if(attacker.DefData.cardAttributes.type != CARD_TYPE.CHARACTER) return;
            let listing;

            if(isDebugging) console.log(debugTag+"impacting card {id="+this.Key+", name="+this.DefData.name+"} with unit {name="+attacker.DefData.name+"}...");
            
            //process all defense keywords targeted at attacker
            listing = this.ActiveKeywords[CARD_KEYWORD_EFFECT_EXECUTION.DEFENDED_OTHER];
            for (let i = 0; i < listing.size(); i++) {
                attacker.ProcessKeyword(listing.getItem(i));
            }
            //process all defense keywords targeted at self
            listing = this.ActiveKeywords[CARD_KEYWORD_EFFECT_EXECUTION.DEFENDED_SELF];
            for (let i = 0; i < listing.size(); i++) {
                this.ProcessKeyword(listing.getItem(i));
            }

            //process attack exchange between attacker and defender
            const damage = attacker.Attack - this.Armour;
            if(damage > 0) {
                this.HealthCur -= damage;
                this.ImpactDamaged = true;
            } else {
                this.ImpactDamaged = false;
            }

            //process all defense keywords targeted at attacker
            listing = attacker.ActiveKeywords[CARD_KEYWORD_EFFECT_EXECUTION.ATTACKED_OTHER];
            for (let i = 0; i < listing.size(); i++) {
                this.ProcessKeyword(listing.getItem(i));
            }
            //process all defense keywords targeted at self
            listing = attacker.ActiveKeywords[CARD_KEYWORD_EFFECT_EXECUTION.ATTACKED_SELF];
            for (let i = 0; i < listing.size(); i++) {
                attacker.ProcessKeyword(listing.getItem(i));
            }

            if(isDebugging) console.log(debugTag+"impacted card {id="+this.Key+", name="+this.DefData.name+"} with unit {name="+attacker.DefData.name+"}!");
        }

        /** processes a keyword against this card, applying any attached effects */
        public ProcessKeyword(keyword:CardKeywordEffectsDataObject) {  
            //get keyword def
            const keywordDef = CardKeywordRegistry.Instance.GetDefByID(keyword.id);
            if(isDebugging) console.log(debugTag+"processing keyword, effect={keyword="+keywordDef.displayName+", str="+keyword.strength+
                ", dur="+(keyword.duration??0)+"} on card="+this.Key+"...");

            //check for an existing instance of the given keyword's effect
            const effectDef:StatusEffectDataObject = StatusEffectRegistry.Instance.GetDefByID(keywordDef.playEffect.id);
            
            let effect;
            //if effect is instant
            if(keywordDef.playEffect.timing == CARD_KEYWORD_EFFECT_TIMING.INSTANT) {
                this.ProcessEffect(effectDef.type, keyword.strength);

                if(isDebugging) console.log(debugTag+"processed keyword, effect={keyword="+keywordDef.displayName+", str="+keyword.strength+
                ", dur="+(keyword.duration??0)+"} on card="+this.Key+"...");
            }
            //if effect is over time
            else {
                //if effect already exists
                if(this.ActiveEffectDict.containsKey(keywordDef.playEffect.id.toString())) {
                    //get existing effect data
                    effect = this.ActiveEffectDict.getItem(keywordDef.playEffect.id.toString());
                    //increase strength and reassert duration (if lower)
                    effect.Strength += keyword.strength;
                    if(effect.Duration < keyword.duration) effect.Duration = keyword.duration;
                }
                //if effect does not exist
                else {
                    //create new effect data
                    effect = {
                        ID:keywordDef.playEffect.id,
                        Timing:keywordDef.playEffect.timing,
                        Strength:keyword.strength,
                        Duration:keyword.duration,
                    };
                    //adjust for timing types (fail catch for dummies)
                    if(effect.Timing == CARD_KEYWORD_EFFECT_TIMING.CONSTANT) effect.Duration = -1;
                    //add to listing
                    this.ActiveEffectList.addItem(effect);
                    this.ActiveEffectDict.addItem(keywordDef.playEffect.id.toString(), effect);
                }

                if(isDebugging) console.log(debugTag+"processed keyword, effect={keyword="+keywordDef.displayName+", str="+(effect.Strength)+
                    ", dur="+(effect.Duration)+"} on card="+this.Key+"!");
            }
        }

        /** processes an effect against this card */
        public ProcessEffect(id:STATUS_EFFECT_PROCESSING_TYPE, power:number) {
            if(isDebugging) console.log(debugTag+"processing effect {id="+id+", power="+power+"} on card="+this.Key+"...");

            //deternime how keyword should be processed based on effect type (what keyword is being applied)
            switch(id) {
                //inflicts damage to character (reduced by armour)
                case STATUS_EFFECT_PROCESSING_TYPE.DAMAGE:
                    const damage = power - this.Armour;
                    if(damage > 0) this.HealthCur -= damage;
                break;
                //restores current health to character
                case STATUS_EFFECT_PROCESSING_TYPE.HEALTH_RECOVER:
                    this.HealthCur += power;
                    //leash cur health below max
                    if(this.HealthCur > this.HealthMax) this.HealthCur = this.HealthMax;
                break;
                //inflicts direct damage to character (no reduced by armour)
                case STATUS_EFFECT_PROCESSING_TYPE.HEALTH_DAMAGE:
                    this.HealthMax -= power;
                break;
                //increases max & cur health of character
                case STATUS_EFFECT_PROCESSING_TYPE.HEALTH_INCREASE:
                    this.HealthCur += power;
                    this.HealthMax += power;
                break;
                //decreases max health of character
                case STATUS_EFFECT_PROCESSING_TYPE.HEALTH_DECREASE:
                    this.HealthMax -= power;
                    //leash cur health below max
                    if(this.HealthCur > this.HealthMax) this.HealthCur = this.HealthMax;
                break;
                //increases attack damage of character
                case STATUS_EFFECT_PROCESSING_TYPE.ATTACK_INCREASE:
                    this.Attack += power;
                break;
                //reduces attack damage of character
                case STATUS_EFFECT_PROCESSING_TYPE.ATTACK_DECREASE:
                    this.Attack -= power;
                    //leash armour above 0
                    if(this.Attack < 0) this.Attack = this.Attack;
                break;
                //increases attack armour of character
                case STATUS_EFFECT_PROCESSING_TYPE.ARMOUR_INCREASE:
                    this.Armour += power;
                break;
                //reduces attack damamage of character
                case STATUS_EFFECT_PROCESSING_TYPE.ARMOUR_DECREASE:
                    this.Armour -= power;
                    //leash armour above 0
                    if(this.Armour < 0) this.Armour = this.Armour;
                break;
                //restores an action to character
                case STATUS_EFFECT_PROCESSING_TYPE.ACTIVITY_MOD_ACTION_ENABLE:
                    this.ActionRemaining = true;
                break;
                //removes an action from the character
                case STATUS_EFFECT_PROCESSING_TYPE.ACTIVITY_MOD_ACTION_DISABLE:
                    this.ActionRemaining = false;
                break;
                //sets this character to a higher targeting filter
                case STATUS_EFFECT_PROCESSING_TYPE.TARGETING_MOD_HIGH:
                    
                break;
                //sets this character to a lower targeting filter
                case STATUS_EFFECT_PROCESSING_TYPE.TARGETING_MOD_LOW:
                    
                break;
                //removes card from field and put into hand
                //<only process on death>
                case STATUS_EFFECT_PROCESSING_TYPE.DEATH_MOD_TO_HAND:
                    
                break;
                //removes card from field and put into deck
                //<only process on death>
                case STATUS_EFFECT_PROCESSING_TYPE.DEATH_MOD_TO_DECK:
                    
                break;
                //removes card from field and removes from deck
                //<only process on death>
                case STATUS_EFFECT_PROCESSING_TYPE.DEATH_MOD_DESTROY:
                    
                break;
            }

            if(isDebugging) console.log(debugTag+"processed effect {id="+id+", power="+power+"} on card="+this.Key+"!");
        }

        /** processes all effects that are applicable at the start of the owning player's turn */
        public ProcessEffectsByAffinity(affinity:STATUS_EFFECT_AFFINITY) {
            //process all timed effects
            let index:number = 0;
            while (index < this.ActiveEffectList.size()) {
                //get effect
                const effectData = this.ActiveEffectList.getItem(index);
                const effectDef = StatusEffectRegistry.Instance.GetDefByID(effectData.ID);
                //if effect is of targeted affinity
                if(effectDef.affinity == affinity) {
                    //process against card
                    this.ProcessEffect(effectDef.type, effectData.Strength);
                    //reduce duration
                    effectData.Duration -= 1;
                    //check for removal
                    if(effectData.Duration == 0) {
                        //remove from listings
                        this.ActiveEffectList.removeItem(effectData);
                        this.ActiveEffectDict.removeItem(effectData.ID.toString());
                        //adjust for reduced listing size
                        index--;
                    }
                }
                index++;
            }
        }

        /** initializes the card based on the provided serial data */
        public SerializeData():CardSerialData {
            //create data object
            let serial:CardSerialData = {
                //indexing
                index:this.index,
                defIndex:this.defIndex,
                //live data
                cost:this.Cost,
                healthCur:this.HealthCur,
                healthMax:this.HealthMax,
                attack:this.Attack,
                armour:this.Armour,
                keywords:[],
                effects:[],
            };

            //add keywords
            for (let i = 0; i < this.ActiveKeywords.length; i++) {
                const keywords:CardKeywordSerialDataSet = { v:[] };
                for (let j = 0; j < this.ActiveKeywords[i].size(); j++) {
                    const keywordRef = this.ActiveKeywords[i].getItem(j);
                    const keywordData = {
                        id:keywordRef.id,
                        strength:keywordRef.strength,
                        duration:keywordRef.duration,
                    }; 
                    keywords.v.push(keywordData);
                }
                serial.keywords.push(keywords);
            }

            //add effects
            for (let i = 0; i < this.ActiveEffectList.size(); i++) {
                const effectRef = this.ActiveEffectList.getItem(i);
                serial.effects.push({
                    ID:effectRef.ID,
                    Timing:effectRef.Timing,
                    Strength:effectRef.Strength,
                    Duration:effectRef.Duration,
                });
            }
            
            return serial;
        }

        /** initializes the card based on the provided serial data */
        public DeserializeData(serial:CardSerialData) {
            //indexing
            this.index = serial.index;
            this.defIndex = serial.defIndex;
            //live data
            this.Cost = serial.cost;
            this.HealthCur = serial.healthCur;
            this.HealthMax = serial.healthMax;
            this.Attack = serial.attack;
            this.Armour = serial.armour;

            //add keywords
            this.ActiveKeywords = [];
            for (let i = 0; i < serial.keywords.length; i++) {
                this.ActiveKeywords.push(new List<CardKeywordEffectsDataObject>());
                for (let j = 0; j < serial.keywords[i].v.length; j++) {
                    const keywordRef = serial.keywords[i].v[j];
                    const keywordData = {
                        id:keywordRef.id,
                        strength:keywordRef.strength,
                        duration:keywordRef.duration,
                    };
                    this.ActiveKeywords[i].addItem(keywordData);
                }
            }

            //add effects
            this.ActiveEffectList = new List<ActiveStatusEffectData>();
            this.ActiveEffectDict = new Dictionary<ActiveStatusEffectData>();
            for (let i = 0; i < serial.effects.length; i++) {
                const effect = {
                    ID:serial.effects[i].ID,
                    Timing:serial.effects[i].Timing,
                    Strength:serial.effects[i].Strength,
                    Duration:serial.effects[i].Duration,
                }
                this.ActiveEffectList.addItem(effect);
                this.ActiveEffectDict.addItem(effect.ID.toString(), effect);
            }
        }
    }
    
    /** provides a new card object (either pre-existing & un-used or entirely new) */
    export function Create(data:PlayCardDataCreationData):PlayCardDataObject {
        //get key (option 1 overwrites option 2)
        var key:string = "";
        if(data.key != undefined && data.key != "") key = data.key;
        else key = GetKeyFromData(data);

        var object:undefined|PlayCardDataObject = undefined;
        if(isDebugging) console.log(debugTag+"attempting to create new object, key="+key+"...");
        
        //if an object under the requested key is already active, hand that back
        if(pooledObjectsRegistry.containsKey(key)) {
            //console.log(debugTag+"<WARNING> requesting pre-existing object (use get instead), key="+key);
            object = pooledObjectsRegistry.getItem(key);
        } 
        //  attempt to find an existing unused object
        if(object == undefined && pooledObjectsInactive.size() > 0) {
            //grab entity from (grabbing from back is a slight opt)
            object = pooledObjectsInactive.getItem(pooledObjectsInactive.size()-1);
            //  remove from inactive listing
            pooledObjectsInactive.removeItem(object);
        }
        //  if not recycling unused object
        if(object == undefined) {
            //create card object frame
            //  create data object (initializes all sub-components)
            object = new PlayCardDataObject();
            //  add to overhead collection
            pooledObjectsAll.addItem(object);
        }

        //initialize object
        object.Initialize(data);
        
        //add object to active collection (ensure only 1 entry)
        var posX = pooledObjectsActive.getItemPos(object);
        if(posX == -1) pooledObjectsActive.addItem(object);
        //add to registry under given key
        pooledObjectsRegistry.addItem(key, object);

        if(isDebugging) console.log(debugTag+"created new object, key='"+key+"'!");
        //provide entity reference
        return object;
    }

    /** disables all objects, hiding them from the scene but retaining them in data & pooling */
    export function DisableAll() {
        if(isDebugging) console.log(debugTag+"removing all objects...");
        //ensure all objects are parsed
        while(pooledObjectsActive.size() > 0) { 
            //small opt by starting at the back b.c of how list is implemented (list keeps order by swapping next item up)
            Disable(pooledObjectsActive.getItem(pooledObjectsActive.size()-1));
        }
        if(isDebugging) console.log(debugTag+"removed all objects!");
    }

    /** disables the given object, hiding it from the scene but retaining it in data & pooling */
    export function Disable(object:PlayCardDataObject) {
        const key:string = object.Key;
        //adjust collections
        //  add to inactive listing (ensure add is required)
        var posX = pooledObjectsInactive.getItemPos(object);
        if(posX == -1) pooledObjectsInactive.addItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(key)) pooledObjectsRegistry.removeItem(key);
    }

    /** removes all objects from the game */
    export function DestroyAll() {
        if(isDebugging) console.log(debugTag+"destroying all objects...");
        //ensure all objects are parsed
        while(pooledObjectsAll.size() > 0) { 
            //small opt by starting at the back b.c of how list is implemented (list keeps order by swapping next item up)
            Destroy(pooledObjectsAll.getItem(pooledObjectsAll.size()-1));
        }
        if(isDebugging) console.log(debugTag+"destroyed all objects!");
    }

    /** removes given object from game scene and engine */
    export function Destroy(object:PlayCardDataObject) {
        const key:string = object.Key;
        //adjust collections
        //  remove from overhead listing
        pooledObjectsAll.removeItem(object);
        //  remove from inactive listing
        pooledObjectsInactive.removeItem(object);
        //  remove from active listing
        pooledObjectsActive.removeItem(object);
        //  remove from active registry (if exists)
        if(pooledObjectsRegistry.containsKey(key)) pooledObjectsRegistry.removeItem(key);

        //TODO: atm we rely on DCL to clean up object data class. so far it hasn't been an issue due to how
        //  object data is pooled, but we should look into how we can explicitly set data classes for removal
    }
}