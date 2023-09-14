import Dictionary, { List } from "../utilities/collections";
import { CARD_TYPE, CardData, CardDataObject, CardEffectDataObject } from "./data/tcg-card-data";
import { CARD_KEYWORD_EFFECT_TYPE, CARD_KEYWORD_ID, CardKeywordDataObject } from "./data/tcg-keyword-data";
import { CardKeywordRegistry } from "./data/tcg-keyword-data-registry";

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

    /** represents a keyword that is active on the card */
    export class ActiveKeywordEffect {
        /** id of active effect */
        public ID:CARD_KEYWORD_ID;
        /** how powerful effect is */
        public Strength:number;
        /** how long effect will be active */
        public Duration:number;

        constructor(id:CARD_KEYWORD_ID, strength:number, duration:number) {
            this.ID = id;
            this.Strength = strength;
            this.Duration = duration;    
        }
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

        //## DETAILS
        /**  rarity of the card */
        rarity:number = 0;
        
        //## GENERAL STATS
        /** cost */
        public Cost:number = 0;

        //## CHARACTER STATS
        public ActionRemaining:boolean = false;
        /** health */
        public Health:number = 0;
        /** attack */
        public Attack:number = 0;
        /** armour */
        public Armour:number = 0;

        //## KEYWORDS/EFFECTS
        /** all effects that are active on this card */
        public ActiveEffects:List<ActiveKeywordEffect> = new List<ActiveKeywordEffect>();
        /** keywords that apply effects against cards interacted with by this card (ex: true damage/rend) */
        public EffectsOffensive:List<ActiveKeywordEffect> = new List<ActiveKeywordEffect>();
        /** keywords that modify incoming effects from other cards (ex: block/ward) */
        public EffectsDefensive:List<ActiveKeywordEffect> = new List<ActiveKeywordEffect>();
        /** effects to be processed at the start of a turn (ex: healing, growth, etc. ) */
        public EffectsTurnStart:List<ActiveKeywordEffect> = new List<ActiveKeywordEffect>();
        /** effects to be processed at the end of a turn (ex: poison, burn, etc.) */
        public EffectsTurnEnd:List<ActiveKeywordEffect> = new List<ActiveKeywordEffect>();

        /** returns true if this card has the given effect */
        public HasEffectActive(id:CARD_KEYWORD_ID):boolean {
            for(let i:number=0; i<this.ActiveEffects.size(); i++) {
                if(this.ActiveEffects.getItem(i).ID == id) return true; 
            }
            return false;
        }

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

        /** processes an interaction from a foriegn card */
        //TODO: there are a lot of targeting assumptions being made atm (ex: if an enemy unit is interacting with a card we assume
        //  the target card is a unit as well), we may want to flesh this out a bit with more restrictions/catches
        public ProcessInteractionFromCard(card:PlayCard.PlayCardDataObject) {
            if(isDebugging) console.log(debugTag+"processing card play between target="+this.Key+" source="+card.Key+"...");
            
            //if external card is a unit
            if(card.DefData.type == CARD_TYPE.CHARACTER) {
                //local card takes damage to health
                const damage = card.Attack - this.Armour;
                if(damage > 0) {
                    this.Health -= damage;
                    //play flinch animation
                    //play impact sound
                } else {
                    //play armour deflect animation
                    //play deflect sound
                }
            }

            //process all offensive effects from other card
            for(let i:number=0; i<card.EffectsOffensive.size(); i++) {
                this.ApplyEffect(card.EffectsOffensive.getItem(i));
            }

            if(isDebugging) console.log(debugTag+"processed card play between target="+this.Key+" source="+card.Key+"...");
        }

        /** processes an action against this card from an external effect */
        public ApplyEffect(effect:ActiveKeywordEffect) {
            //get keyword def
            const keyword = CardKeywordRegistry.Instance.GetDefByID(effect.ID);
            if(isDebugging) console.log(debugTag+"applying effect {keyword="+keyword.displayName+", str="+effect.Strength+", dur="+effect.Duration+"} on card="+this.Key+"...");
            
            //deternime how keyword should be processed based on effect type (what keyword is being applied)
            switch(effect.ID) {
                //deals damage to character's health
                case CARD_KEYWORD_ID.STRIKE:

                break;
                case CARD_KEYWORD_ID.BLEED:
                    break;
                case CARD_KEYWORD_ID.BURN:
                    break;
                case CARD_KEYWORD_ID.REND:
                    break;
                case CARD_KEYWORD_ID.MELT:
                    break;
                case CARD_KEYWORD_ID.HEAL:
                    break;
                case CARD_KEYWORD_ID.MEND:
                    break;
                case CARD_KEYWORD_ID.EXPAND:
                    break;
                case CARD_KEYWORD_ID.GROWTH:
                    break;
                case CARD_KEYWORD_ID.FORTIFY:
                    break;
                case CARD_KEYWORD_ID.SHARPEN:
                    break;
                case CARD_KEYWORD_ID.EMPOWERED:
                    break;
                case CARD_KEYWORD_ID.GUARD:
                    break;
                case CARD_KEYWORD_ID.SHEILDED:
                    break;
                case CARD_KEYWORD_ID.STEALTH:
                    break;
                case CARD_KEYWORD_ID.DISABLE:
                    break;
                case CARD_KEYWORD_ID.REFRESH:
                    break;
                case CARD_KEYWORD_ID.DRAIN:
                    break;
                case CARD_KEYWORD_ID.ANNIHILATION:
                    break;
                case CARD_KEYWORD_ID.EXHAUST:
                    break;
            }

            if(isDebugging) console.log(debugTag+"applyed effect {keyword="+keyword.displayName+", str="+effect.Strength+", dur="+effect.Duration+"} on card="+this.Key+"...");
        }

        /** processes all effects that are applicable at the start of the owning player's turn */
        public ProcessTurnStartEffects() {
            //check for stun

            //re-enable card's action
            this.ActionRemaining = true;

        }

        /** processes all effects that are applicable at the end of the owning player's turn */
        public ProcessTurnEndEffects() {


        }

        /** processes an effect provided by a keyword */
        public ProcessEffect(keyword:CardKeywordDataObject, strength:number) {
            
            //


            //process effects/keywords from foriegn card


        }

        /** resets the card with the current data def */
        public ResetCard() {
            this.SetCard(this.defIndex);
        }

        /** sets this card as the given data */
        public SetCard(index: number) {
            const def = CardData[index];
            //general stats
            this.defIndex = index
            this.Cost = def.attributeCost;
            //keywords/effects
            while(this.ActiveEffects.size() > 0) {
                const effect = this.ActiveEffects.getItem(0)
                this.ActiveEffects.removeItem(effect);
            }
            //character stats
            if(def.attributeCharacter) {
                this.Health = def.attributeCharacter.unitHealth;
                this.Attack = def.attributeCharacter.unitAttack;
                this.Armour = def.attributeCharacter.unitArmour;
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