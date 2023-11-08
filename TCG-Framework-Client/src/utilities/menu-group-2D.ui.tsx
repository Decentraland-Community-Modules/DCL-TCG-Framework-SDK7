import { Color4 } from "@dcl/sdk/math";
import { List, Dictionary } from "./collections";
import { AlignType, Button, JSX, JustifyType, PositionType, PositionUnit, ReactEcs, ReactEcsRenderer, TextAlignType, UiEntity } from '@dcl/sdk/react-ecs'


/*      MENU GROUP 2D
    used to dynamically create 2d ui in the game scene. menu objects can be defined
    from across different ts scripts without having to redefine them. elements can also
    be created and parented with  

    because of how ui is generated in SDK7 EVERYTHING needs to be generated before the render 
    is called. according to the SDK7 notes, embbeded variable are called EVERY update for w/e
    reason (so be careful with what/how much you assign in the UI).

    Author: TheCryptoTrader69 (Alex Pazder)
    Contact: TheCryptoTrader69@gmail.com
*/
export module MenuElementManager2D {
    /** when true debug logs will be generated */
    const isMenuDebugging:Boolean = false;
    /** hard-coded tag for module, helps log search functionality */
    const debugTag:string = "2D Menu Element Manager: ";

    /** menu element types */
    export enum MENU_ELEMENT_TYPE {
        MENU_ENTITY,
        MENU_BUTTON,
        MENU_IMAGE
    }

    /** menu element transform adjustment types */
    export enum MENU_ELEMENT_ADJUSTMENT_TYPE {
        POSITION,
        ROTATION,
        SCALE,
    }

    /** current state of the entire ui system, when set to false everything is hidden */
    var menuVisibility:boolean = true;
    /** gets the current menu visibility state */
    export function GetMenuVisibility():boolean {
        return menuVisibility;
    }
    /** sets the current menu visibility state */
    export function SetMenuVisibility(state:boolean) {
        menuVisibility = state;
    }

    /** unique index for ui element pieces (each element requires a uid) */
    var indexer:number = 0;
    /** returns the next unique ui element index */
    function getNextIndex():number {
        return indexer++;
    }

    /** empty/nulled callback for defining defaults for menu elements */
    export const MenuCallbackEmpty = function(){ null }; 

    /** empty/nulled callback for defining defaults for menu elements */
    export const MenuCallbackTest = function(value:any){ console.log(debugTag+" menu test call -> "+value.toString()); }; 

    /** list of all active menu elements */
    var menuElementsList:List<MenuElement2D> = new List<MenuElement2D>();
    /** dict of all active menu elements, key is object's name */
    var menuElementsDict:Dictionary<MenuElement2D> = new Dictionary<MenuElement2D>();

    /** returns the menu element corresponding to the given id */
    export function GetMenuElementByID(id:string):MenuElement2D {
        return menuElementsDict.getItem(id);
    }

    //just for testing if identified bugs in SDK7 UI have been fixed, feel free to ignore this
    function Example_CreateNestedElements() {
        ReactEcsRenderer.setUiRenderer(() => (
        <UiEntity key={0}
            uiTransform={{
                //wide bar
                /*width: '100%', height: 30,
                position: { top:'50%', bottom:-550, left:'0%', right:'50%' },*/
                //tall bar
                width: 30, height: '100%',
                position: { top:'0%', bottom:'1000px', left:'50%', right:'-50%' },
                positionType: 'absolute',
                justifyContent: 'center',
                alignItems: 'center'
            }}
            uiBackground={{ color: Color4.White() }}
        >
            <UiEntity key={1}
                uiTransform={{
                    width: 20, height: 60,
                    position: { top:50, bottom:-200, left:0, right:200 },
                    positionType: 'relative',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
                uiBackground={{ color: Color4.Green() }}
            >
                <UiEntity key={2}
                    uiTransform={{
                        width: 60, height: 120,
                        position: { top:0, bottom:-500, left:-60, right:200 },
                        positionType: 'relative'
                    }}
                    uiBackground={{  color: Color4.Blue() }}
                />
            </UiEntity>
            <UiEntity key={3}
                uiTransform={{
                    width: 60, height: 50,
                    position: { top:0, bottom:'-100px', left:30, right:'100%' },
                    positionType: 'relative'
                }}
                uiBackground={{ color: Color4.Red()  }}
            />
        </UiEntity>));
    }

    //just for testing if identified bugs in SDK7 UI have been fixed, feel free to ignore this
    function MouseButtonDown(value:any)  {  console.log("CALLED : "+value) }
    function Example_CreateNestedElementsWithMouseEvents() {
        const val = 3;
        ReactEcsRenderer.setUiRenderer(() => (
        <UiEntity key={0}
            uiTransform={{
                //wide bar
                width: '100%', height: 30,
                position: { top:'50%', bottom:0, left:0, right:0 },
                positionType: 'absolute',
                justifyContent: 'center',
                alignItems: 'center'
            }}
            uiBackground={{ color: Color4.White() }}
        >
            <UiEntity key={1}
                uiTransform={{
                    width: 120, height: 120,
                    position: { top:0, bottom:0, left:0, right:0 },
                    positionType: 'relative',
                    justifyContent: 'center',
                    alignItems: 'center'
                }}
                uiBackground={{ color: Color4.Green() }}

            >
                <Button key={20}
                    uiTransform={{
                        width: "50%", height: "50%",
                        position: { top:"25%", bottom:0, left:"25%", right:0 },
                        positionType: 'absolute',
                    }}
                    value= "BUTTON"
                    onMouseDown={() => { MenuElementManager2D.MenuCallbackTest(val) } }
                />
                <UiEntity key={2}
                    uiTransform={{
                        width: 120, height: 120,
                        position: { top:-180, bottom:0, left:0, right:0 },
                        positionType: 'relative'
                    }}
                    uiBackground={{  color: Color4.Blue() }}
                >
                    <Button key={21}
                        uiTransform={{
                            width: "50%", height: "50%",
                            position: { top:"25%", bottom:0, left:"25%", right:0 },
                            positionType: 'absolute',
                        }}
                        value= "BUTTON"
                        onMouseDown={() => { MenuElementManager2D.MenuCallbackTest("2") } }
                    />
                    <UiEntity key={3}
                        uiTransform={{
                            width: 120, height: 120,
                            position: { top:-180, bottom:0, left:0, right:0 },
                            positionType: 'relative'
                        }}
                        uiBackground={{ color: Color4.Red()  }}
                    />
                </UiEntity>
            </UiEntity>
        </UiEntity>));
    }

    //just for testing if identified bugs in SDK7 UI have been fixed, feel free to ignore this
    function Test() {
        ReactEcsRenderer.setUiRenderer(() => (<UiEntity
            key={-1}
            uiTransform={{
                position: { top:'50%', left:'50%'},
                width: 512,
                height: 200,
                positionType: 'absolute',
                justifyContent: 'center',
                alignItems: 'center',
            }}
            uiBackground={{ 
                color: Color4.create(1, 1, 1, 1),
                textureMode: "stretch",
                texture: { src: "images/soma_smile.png", filterMode: "tri-linear" }
            }}
        >
        </UiEntity>));
    }//bottom:this.PosBottom, , right:this.PosRight

    /** */
    function TextPiece(value: number) {
        return <UiEntity
            key={value}
            uiTransform={{ 
                width: 80, 
                height: 20, 
                position: { bottom: (value*30), } 
            }}
            uiText={{ 
                value: value.toString(), 
                textAlign: 'middle-center', 
                fontSize: 12,
                color: { r: 255, g: 255, b: 255, a: 1 } 
            }}
            uiBackground={{ color: { r: 0, g: 0, b: 0, a: 1 } }}
        />
    }

    /** */
    function TextViaComponent(props: { value: number }) {
        return <UiEntity
            key={props.value}
            uiTransform={{ width: 80, height: 20, 
                position: {
                    bottom: (props.value*30),
                } 
            }}
            uiText={{ 
                value: props.value.toString(), 
                textAlign: 'middle-center', 
                fontSize: 12,
                color: { r: 255, g: 255, b: 255, a: 1 } 
            }}
            uiBackground={{ color: { r: 0, g: 0, b: 0, a: 1 } }}
        />
    }

    /** sends initial renderer call, beginning the ui draw for the system */
    function StartRenderer() {
        //set first renderer call (all pieces will exist below this one ui element)
        ReactEcsRenderer.setUiRenderer(() => (
            <UiEntity key={0}
                uiTransform={{
                    //wide order
                    width: '100%', height: '1%',
                    position: { top:'0%', bottom:'0%', left:'0%', right:'0%' },
                    //height order
                    /*width: '1%', height: '100%',
                    position: { top:'0%', bottom:'0%', left:'50%', right:'0%' },*/
                    positionType: 'relative',//'absolute',
                    alignContent: 'center',
                    justifyContent: 'center',
                    display: MenuElementManager2D.GetMenuVisibility() ? 'flex': 'none'
                }}
                uiBackground={{
                    color: Color4.create(1.0, 0.0, 0.0, 0) 
                }}
            >
                {MenuElementManager2D.GetRenderPieces()}
            </UiEntity>
        ));
    }

    /** returns all renderer peices that need to be displayed */
    export function GetRenderPieces() {
        //halt if menu is not visible
        if(!MenuElementManager2D.GetMenuVisibility()) return undefined;

        //get all existing sub elements
        var array:Array<JSX.Element> = Array();
        for (let i = 0; i < menuElementsList.size(); i++) 
        {
            const result = menuElementsList.getItem(i).GetRenderPiece();
            if(result != null) array.push(result);
        }
        return array;
    }

    /**
     * prepares a menu object of the given type, under the given parent
     * @param name requested name for new menu object (if menu object of name already exists then function fails)
     * @param parent target parent, if no value is given object becomes a child of the core menu group parent (if menu object of index doesn't exists then function fails)
     */
    export function AddMenuObject(type:MENU_ELEMENT_TYPE, name:string, parent:string[]=[]):MenuElement2D {
        if(isMenuDebugging) console.log(debugTag+"adding ui element name="+name+", parent-access="+parent.toString()+"...");

        //invert array
        MenuElement2D.parentNameArrayCur = Array.from(parent).reverse();

        //if menu object has parent, push processing down the line
        const node = MenuElement2D.parentNameArrayCur.pop();
        if(node != undefined) {
            MenuElement2D.parentNamePrev = node;
            if(isMenuDebugging) console.log(debugTag+"found parent node="+node);
            return menuElementsDict.getItem(node).AddMenu(type, name);
        }

        //create object
        const menuObject:MenuElement2D = new MenuElement2D(type, name);
        //register object to collections
        menuElementsList.addItem(menuObject);
        menuElementsDict.addItem(name, menuObject);
        
        if(isMenuDebugging) console.log(debugTag+"added base-element name="+name);
        return menuObject;
    }

    //TODO: break this down to suck up subcomponents
    /** represents a single ui element */
    export class MenuElement2D
    {
        /** key for ensuring all renderer ids stay unique */
        private keyDraw:number;
        /** key used for accessing this element in the registry */
        public keyAccess:string;

        /** defines how this menu element is drawn */
        public MenuType:MENU_ELEMENT_TYPE;
        
        /** defines this element's visibility state (imapcts the visibility of all lower elements) */
        public IsVisible:boolean = true;

        //ui element transform
        /** element size, width */
        public Width:PositionUnit = '60px';
        /** element size, height */
        public Heigth:PositionUnit = '60px';
        /** element position, from top */
        public PosTop:PositionUnit = '0px';
        /** element position, from bottom */
        public PosBottom:PositionUnit = '0px';
        /** element position, from left */
        public PosLeft:PositionUnit = '0px';
        /** element position, from right */
        public PosRight:PositionUnit = '0px';
        /** element positioning */
        public PosType:PositionType = 'relative';
        /** element content alignment */
        public ContentAlignment:AlignType = 'center';
        /** element content justification */
        public ContentJustify:JustifyType = 'center';

        //ui element text
        /** element display text */
        public TextValue:string = '';
        /** element text alignment */
        public TextAlign:TextAlignType = 'middle-center';
        /** element text size */
        public TextSize:number = 12;

        //ui element background
        /** element background colour */
        public BackgroundColour:Color4 = Color4.Black();
        /** element background image */
        public BackgroundImage:string = "";

        //ui elemnt callbacks
        /** callback for mouse down events */
        public MouseButtonEvent = MenuCallbackEmpty;
        /** */
        public MouseButtonDown(value:any) {
            console.log("uiButton callback not set, uiKey="+value);
        }

        //TODO: can probs get them directly from the overhead manager
        //collections of all sub entities
        menuElementList:List<MenuElement2D>;
        menuElementDict:Dictionary<MenuElement2D>;

        //minor instancing optimization (can break if we get into threading...)
        public static parentNamePrev:string = "";
        public static parentNameArrayCur:string[] = [];

        /** used to initialize the element's data */
        constructor(type:MENU_ELEMENT_TYPE, name: string) {
            //set indexing
            this.keyDraw = getNextIndex();
            this.keyAccess = name;

            //set type
            this.MenuType = type;

            //collections
            this.menuElementList = new List<MenuElement2D>();
            this.menuElementDict = new Dictionary<MenuElement2D>();

            if(isMenuDebugging) console.log(debugTag+"created new element, key="+this.keyDraw);
        }

        /** adds a new menu object, iterating down a chain of parents to find the target */
        public AddMenu(type:MENU_ELEMENT_TYPE,name:string):MenuElement2D
        {
            //attempt to get next node in the chain
            const node = MenuElement2D.parentNameArrayCur.pop();

            //if node is undefined, end of chain
            if(node == undefined) {
                if(isMenuDebugging) console.log(debugTag+"added sub-element name="+name+", parent="+MenuElement2D.parentNamePrev);
                const menuObject:MenuElement2D = new MenuElement2D(type, name);

                this.menuElementList.addItem(menuObject);
                this.menuElementDict.addItem(name, menuObject);

                return menuObject;
            }
            //continue chain
            if(isMenuDebugging) console.log(debugTag+"parsing chain curNode="+this.keyAccess+", nextNode="+node+", remaining="+MenuElement2D.parentNameArrayCur.length);
            MenuElement2D.parentNamePrev = node;
            return this.menuElementDict.getItem(node).AddMenu(type,name);
        }

        /** returns all sub-elements tied to this element */
        public GetRenderPieces() {
            //halt if element is not visible
            if(!this.IsVisible) return null;

            //get all sub-elements
            var ret = [];
            for (let i = 0; i < this.menuElementList.size(); i++) 
            {
                const result = this.menuElementList.getItem(i).GetRenderPiece();
                if(result != null) ret.push(result);
            }
            return ret;
        }

        /** returns the draw details for this element */
        public GetRenderPiece() {
            //halt if element is not visible
            if(!this.IsVisible) return null;

            //preocess draw output based on element's type (if I were actually smart there would be a better fix using inheritence here, but I just cant do it man ;-;)
            switch(this.MenuType) {
                //standard entity
                case MENU_ELEMENT_TYPE.MENU_ENTITY:
                    return <UiEntity key= {this.keyDraw}
                        uiTransform={{
                            width: this.Width, height: this.Heigth,
                            position: { top:this.PosTop, bottom:this.PosBottom, left:this.PosLeft, right:this.PosRight },
                            alignContent: this.ContentAlignment,
                            justifyContent: this.ContentJustify,
                            positionType: this.PosType,
                        }}
                        uiText={{ 
                            value: this.TextValue, 
                            textAlign: this.TextAlign,
                            fontSize: this.TextSize 
                        }}
                        uiBackground={{ 
                            color: this.BackgroundColour,
                        }}
                    >
                        {this.GetRenderPieces()}
                    </UiEntity>
                //button entity
                case MENU_ELEMENT_TYPE.MENU_BUTTON:
                    return <Button key= {this.keyDraw}
                        uiTransform={{
                            width: this.Width, height: this.Heigth,
                            position: { top:this.PosTop, bottom:this.PosBottom, left:this.PosLeft, right:this.PosRight },
                            alignContent: this.ContentAlignment,
                            justifyContent: this.ContentJustify,
                        }}
                        uiBackground={{ 
                            color: this.BackgroundColour 
                        }}
                        value = ""
                        onMouseDown={() => this.MouseButtonEvent()}//this.MouseButtonDown(this.uiKey) }
                    >
                        {this.GetRenderPieces()}
                    </Button>
                //image entity
                case MENU_ELEMENT_TYPE.MENU_IMAGE:
                    return <UiEntity key= {this.keyDraw}
                        uiTransform={{
                            width: this.Width, height: this.Heigth,
                            position: { top:this.PosTop, bottom:this.PosBottom, left:this.PosLeft, right:this.PosRight },
                            alignContent: this.ContentAlignment,
                            justifyContent: this.ContentJustify,
                            positionType: this.PosType,
                        }}
                        uiBackground={{ 
                            color: this.BackgroundColour,
                            textureMode: "stretch",
                            texture: { src: this.BackgroundImage, filterMode: "point", wrapMode:"repeat" }
                        }}
                    >
                        {this.GetRenderPieces()}
                    </UiEntity>
            }
        }
    }

    //begin serving ui
    StartRenderer();
}

//reference for splice sheet pieces
//  TODO: maybe add enum links for passing types to make it more readable 
/*class menuGroup2DReference
{
    //texture sources
    static imageSources:Texture[] = 
    [
        new Texture("images/menuDebugging.png"),
        new Texture("images/menuSpliceSheet.png"),
        new Texture("images/uiGameHeaderCore.png"),
        new Texture("images/uiGameHeaderEnemy.png")
    ];
    static getImageSource(image:number):Texture
    {
        //log("source: "+image)
        return menuGroup2DReference.imageSources[image];
    }
    static getImageLocation(image:number, index:number, type:number):number
    {
        //log("location: "+image)
        return menuGroup2DReference.sourceLocations[image][index][type];
    }
    static getImageSize(image:number, index:number, type:number):number
    {
        //log("size: "+image+", "+index+", "+type)
        //log("type: "+menuGroup2DReference.sourceTypes[image][index])
        return menuGroup2DReference.sourceSizes[image][menuGroup2DReference.sourceTypes[image][index]][type];
    }

    //locations on-source for splice points, from top left of sheet to bottom right
    //  [image_index][slice_index][point type(0=x, 1=y)]
    static sourceLocations:number[][][] = 
    [
        //menu backplate
        [
            [0,0],    //title
        ],
        //menu sheet
        [
            //  empty
            [0,500],    //title
            [0,600],    //header
            [750,600],  //medium
            [1050,600], //small
            [1050,0],   //square(ish)
            //  text
            [0,0],      //title
            [0,200],    //header wave
            [0,300],    //header enemies
            [0,400],    //header money
            [750,200],  //play
            [1050,200], //close
            [750,300],  //next medium
            [1050,300], //back medium
            [750,400],  //help medium
            [1050,400], //repo
            [1050,500], //next small
            [1200,500], //back small
            [1200,600], //help small
        ],
        [
            [0,0],    //title
        ],
        [
            [0,0],    //title
        ]
    ];
    //size types of on-source splices
    //  [image_index][splice sheet index, size type(0=title, 1=long, 2=medium, 3=short)]
    static sourceTypes:number[][] = 
    [
        //menu backplate
        [
            0,
        ],
        //menu sheet
        [
            //  empty
            1,  //title
            2,  //header
            3,  //medium
            4,  //small
            5,  //square(ish)
            //  text
            0,  //title
            2,  //header wave
            2,  //header enemies
            2,  //header money
            3,  //play
            3,  //close
            3,  //next medium
            3,  //back medium
            3,  //help medium
            3,  //repo
            4,  //next small
            4,  //back small
            4,  //help small
        ],
        [
            0,
        ],
        [
            0,
        ]
    ];
    //size definitions
    static sourceSizes:number[][][] = 
    [
        //menu backplate
        [
            [680, 480]
        ],
        //menu sheet
        [
            [1050,200], //title tall
            [1050,100], //title 
            [750,100],  //header
            [300,100],  //medium
            [150,100],  //short
            [300,200],  //square(ish)
        ],
        [
            [1170,305],    //title
        ],
        [
            [1170,305],    //title
        ]
    ];
}
//contains text for the tutorial menu
export class menuTutorialText
{
    static TextHeader:string[] =
    [
        "About This Module",
        "How To Play"
    ];

    static TextDesc:string[] = 
    [
        "text unavailable",
        "text unavailable"
    ];
}
*/