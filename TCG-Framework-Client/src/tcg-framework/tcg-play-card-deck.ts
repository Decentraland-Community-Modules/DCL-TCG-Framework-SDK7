import Dictionary, { List } from "../utilities/collections";
import { CardData, CardDataObject } from "./data/tcg-card-data";
import { PlayCard } from "./tcg-play-card";

/*      TRADING CARD GAME - PLAY CARD DECK
    represents a deck of cards, with links to each card's active data

    each player has multiple decks that can be swapped between at the deck manager
    pve decks are handled locally atm
    peer-to-peer decks are managed by the authoritive source for a table
    server decks are managed completely by the server (tells specific client what to pick up/discard) 

    PrimaryAuthors: TheCryptoTrader69 (Alex Pazder)
    TeamContact: thecryptotrader69@gmail.com
*/
export module PlayCardDeck
{
    /** when true debug logs are generated (toggle off when you deploy) */
    const isDebugging:boolean = true;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "TCG Play Card Collection: ";

    /** all possible card deck types */
    export enum DECK_TYPE {
        PLAYER_LOCAL,  //local player
        PLAYER_REMOTE, //remote player (local is peer-to-peer auth)
        AI, //deck is being used in a pve encounter
    }

    /** index per targeted collection */
    export enum DECK_CARD_STATES {
        DECK,
        HAND,
        FIELD,
        DISCARD,
    }

    //TODO: move limiters when done/balanced
    const CARD_LIMIT_PER_TYPE:number[] = [
        3,
        5,
        1
    ];
    
    /* min number of cards in a viable deck */
    export const DECK_SIZE_MIN = 8;
    /* max number of cards in a viable deck */
    export const DECK_SIZE_MAX = 12;

    /** indexing key */
    export function GetKeyFromObject(data:PlayCardDeckObject):string { return data.Key; };
    export function GetKeyFromData(data:PlayCardDeckDataCreationData):string { return data.key; };

    /** pool of ALL existing objects */
    var pooledObjectsAll:List<PlayCardDeckObject> = new List<PlayCardDeckObject>();
    /** pool of active objects (already being used in scene) */
    var pooledObjectsActive:List<PlayCardDeckObject> = new List<PlayCardDeckObject>();
    /** pool of inactive objects (not being used in scene) */
    var pooledObjectsInactive:List<PlayCardDeckObject> = new List<PlayCardDeckObject>();
    /** registry of all objects in-use, access key is card's play-data key */
    var pooledObjectsRegistry:Dictionary<PlayCardDeckObject> = new Dictionary<PlayCardDeckObject>();

    /** attmepts to find an object of the given key. if no object is registered under the given key then 'undefined' is returned. */
    export function GetByKey(key:string):undefined|PlayCardDeckObject {
        //check for object's existance
        if(pooledObjectsRegistry.containsKey(key)) {
            //return existing object
            return pooledObjectsRegistry.getItem(key);
        }
        //object does not exist, send undefined
        return undefined;
    }
    
	/** object interface used to define all data required to create a new object */
	export interface PlayCardDeckDataCreationData {
        //indexing 
        key: string;
        //target
        type: DECK_TYPE,
	}

    /** represents a single card's data in a deck
     * can contain multiple entries/owner proofs, on a per instance basis  
    */
    export class PlayCardDeckPiece {
        public Count:number = 0;

        constructor(count:number) {
            this.Count = count;
        }
        //TODO: add instance sub-keying/add ownership veri/use NFTs to increase total count
    }

    /** contains all pieces that make up a single card deck */
    export class PlayCardDeckObject {
        /** when true this object is reserved in-scene */
        private isActive: boolean = true;
        public get IsActive():boolean { return this.isActive; };

        /** current state of the card */
        public DeckType:DECK_TYPE = 0;

        /** represents the unique index of this slot's table, req for networking */
        private key:string = "";
        public get Key():string { return this.key; };

        /** all play cards tied to this deck */
        public CardsAll:List<PlayCard.PlayCardDataObject> = new List<PlayCard.PlayCardDataObject>;
        /** cards in deck */
        public CardsPerState:List<PlayCard.PlayCardDataObject>[] = [
            new List<PlayCard.PlayCardDataObject>(),
            new List<PlayCard.PlayCardDataObject>(),
            new List<PlayCard.PlayCardDataObject>(),
            new List<PlayCard.PlayCardDataObject>(),
        ];

        /** holds the number of cards registered per ID */
        public RegisteredCardCounts: Dictionary<PlayCardDeckPiece> = new Dictionary<PlayCardDeckPiece>();

        /** initializes the object */
        public Initialize(data: PlayCardDeckDataCreationData) {
            this.isActive = true;
            //indexing
            this.key = data.key;
        }

        public GetCardCount(def:number):number {
            if(!this.RegisteredCardCounts.containsKey(def.toString())) return 0;
            else return this.RegisteredCardCounts.getItem(def.toString()).Count;
        }

        public SetCardCount(def:number, value:number) {
            if(!this.RegisteredCardCounts.containsKey(def.toString())) 
                this.RegisteredCardCounts.addItem(def.toString(), new PlayCardDeckPiece(value));
            else this.RegisteredCardCounts.getItem(def.toString()).Count = value;

            //TODO: if overhead per-piece gets large, cull each < 0 piece
        }

        /** adds a single instance of the given card data index */
        public AddCard(def:number) {
            if(isDebugging) console.log(debugTag+"adding card to deck="+this.key+", ID="+def+"...");
            //TODO: define maxes per card type (terrain, unit, spell)
            //ensure card instance limit is not over max
            if(this.GetCardCount(def) >= CARD_LIMIT_PER_TYPE[CardData[def].type]) {
                if(isDebugging) console.log(debugTag+"failed to add card - too many instances in deck!");
                return;
            } 

            //create instance of card
            const card = PlayCard.Create({
                key: this.key+def,  //key: deck's unique key + card data unique key
                defIndex: def,
            });
            //add card to deck
            this.CardsAll.addItem(card);
            this.CardsPerState[0].addItem(card);
            
            //modify count reg
            if(!this.RegisteredCardCounts.containsKey(def.toString())) this.RegisteredCardCounts.addItem(def.toString(), new PlayCardDeckPiece(1));
            else this.RegisteredCardCounts.getItem(def.toString()).Count++;
            if(isDebugging) console.log(debugTag+"added card to deck="+this.key+", ID="+def+"!");
        }

        //TODO: atm it is assumed the deck will be in a neutral state with all cards set to deck-state (not in-hand ect.)
        /** removes a single instance of the given card data */
        public RemoveCard(def:number) {
            if(isDebugging) console.log(debugTag+"removing card from deck="+this.key+", ID="+def+"...");
            //check if requested card exists
            if(this.GetCardCount(def) <= 0) {
                if(isDebugging) console.log(debugTag+"failed to remove card - no instances in deck!");
                return;
            } 

            //find an instance of the targeted card def
            var index:number = 0;
            var card:undefined|PlayCard.PlayCardDataObject = undefined;
            while(index<this.CardsAll.size()) {
                //check entry for targeted card
                card = this.CardsAll.getItem(index);
                if(card.DefIndex == def) break;
                index++;
            }

            if(!card) {
                console.log("ERROR: faulty deck remove!");
                return;
            }

            //remove instance of card
            this.CardsAll.removeItem(card);
            this.CardsPerState[0].removeItem(card);
            //disable card
            PlayCard.Disable(card);
            
            //modify count reg
            this.RegisteredCardCounts.getItem(def.toString()).Count--;
            if(isDebugging) console.log(debugTag+"removed card from deck="+this.key+", ID="+def+"!");
        }

        /** resets all cards their normal playable state (all def-values & in deck, not in hand/discard) */
        public Reset() {
            //move all cards to deck (skip first state listing b.c is deck)
            for(let i:number = 1; i<this.CardsPerState.length; i++) {
                while(this.CardsPerState[i].size() > 0) {
                    const card = this.CardsPerState[i].getItem(0);
                    this.CardsPerState[i].removeItem(card);
                    this.CardsPerState[0].addItem(card);
                }
            }

            //re-slot each card 
            for(let i:number = 1; i<this.CardsPerState.length; i++) {
                for(let j:number = 1; j<this.CardsPerState.length; j++) {
                    this.CardsPerState[i].getItem(j).ResetCard();
                }
            }
        }

        /** shuffles all cards in the deck, randomizing order */
        public Shuffle() {

        }

        /** remove & release all cards in this deck */
        public Clean() {
            //reset registered card counts
            this.RegisteredCardCounts = new Dictionary<PlayCardDeckPiece>();
            //remove all previous cards
            var index:number = 0;
            while(index < this.CardsAll.size()) {
                const card = this.CardsAll.getItem(index);
                //remove instance of card
                this.CardsAll.removeItem(card);
                this.CardsPerState[0].removeItem(card);
                //disable card
                PlayCard.Disable(card);
            }
        }

        /** copies over all cards from one deck to another */
        public Clone(deck: PlayCardDeckObject) {
            if(isDebugging) console.log(debugTag+"cloning deckLocal="+this.key+" (count="+this.CardsAll.size()
                +"), deckLocal="+deck.key+" (count="+deck.CardsAll.size()+")...");

            //remove all previous cards
            this.Clean();
            //mirror all cards from other deck
            var index:number = 0;
            while(index < deck.CardsAll.size()) {
                this.AddCard(deck.CardsAll.getItem(index).DefIndex);
                index++;
            }
            if(isDebugging) console.log(debugTag+"cloning deckLocal="+this.key+" (count="+this.CardsAll.size()
                +"), deckLocal="+deck.key+" (count="+deck.CardsAll.size()+")!");
        }
    }
    
    /** provides a new card object (either pre-existing & un-used or entirely new) */
    export function Create(data:PlayCardDeckDataCreationData):PlayCardDeckObject {
        const key:string = GetKeyFromData(data);
        var object:undefined|PlayCardDeckObject = undefined;
        if(isDebugging) console.log(debugTag+"attempting to create new object, key="+key+"...");
        
        //if an object under the requested key is already active, hand that back
        if(pooledObjectsRegistry.containsKey(key)) {
            console.log(debugTag+"<WARNING> requesting pre-existing object (use get instead), key="+key);
            object = pooledObjectsRegistry.getItem(key);
        } 
        //  attempt to find an existing unused object
        if(pooledObjectsInactive.size() > 0) {
            //grab entity from (grabbing from back is a slight opt)
            object = pooledObjectsInactive.getItem(pooledObjectsInactive.size()-1);
            //  remove from inactive listing
            pooledObjectsInactive.removeItem(object);
        }
        //  if not recycling unused object
        if(object == undefined) {
            //create card object frame
            //  create data object (initializes all sub-components)
            object = new PlayCardDeckObject();
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
    export function Disable(object:PlayCardDeckObject) {
        const key:string = GetKeyFromObject(object);
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
    export function Destroy(object:PlayCardDeckObject) {
        const key:string = GetKeyFromObject(object);
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