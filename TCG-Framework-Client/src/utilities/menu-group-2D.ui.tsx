import { Color4 } from "@dcl/sdk/math";
import { List, Dictionary } from "./collections";
import { AlignType, Button, Callback, JSX, JustifyType, Label, PositionShorthand, PositionUnit, ReactEcs, ReactEcsRenderer, TextAlignType, UiComponent, UiEntity } from '@dcl/sdk/react-ecs'

const isMenuDebugging:Boolean = true;

/** menu object transform adjustment types */
export enum Menu2DTransformAdjustmentTypes
{
    POSITION,
    ROTATION,
    SCALE,
}

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
export class MenuGroup2D {
    /** ensures ui render call can only be called once */
    private static hasRendered:boolean = false;

    //access pocketing
    private static instance:undefined|MenuGroup2D;
    public static get Instance():MenuGroup2D {
        //ensure instance is set
        if(MenuGroup2D.instance === undefined) {
            MenuGroup2D.instance = new MenuGroup2D();
        }
  
        return MenuGroup2D.instance;
    }

    /** current state of the entire scene ui */
    private menuVisible:boolean = true;

    /** list of all attached menu objects */
    private menuList:List<MenuObject2D>;
    /** dict of all attached menu objects, key is object's name */
    private menuDict:Dictionary<MenuObject2D>;

    //constructor, takes in an entity that will be used when parenting
    constructor() {
        //initialize collections
        this.menuList = new List<MenuObject2D>();
        this.menuDict = new Dictionary<MenuObject2D>();
    }

    //just for testing if identified bugs in SDK7 UI have been fixed, feel free to ignore this
    public Example_CreateNestedElements()
    {
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
    public static MouseButtonDown(value:any)  {  console.log("CALLED : "+value) }
    public Example_CreateNestedElementsWithMouseEvents()
    {
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
                    onMouseDown={() => { MenuGroup2D.MouseButtonDown(val) } }
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
                        onMouseDown={() => { MenuGroup2D.MouseButtonDown("2") } }
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
    public Test() {
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

    generateText() {
        const array:Array<number> = [0, 1, 2];
        return array.map((value) => this.TextPiece(value));//<this.TextViaComponent value={value} />)
    }

    TextPiece(value: number) {
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

    TextViaComponent(props: { value: number }) {
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

    /** */
    public RenderUI() {
        //ensure ui is only rendered once
        if(MenuGroup2D.hasRendered) return;
        MenuGroup2D.hasRendered = true;

        if(isMenuDebugging) console.log("2D Menu: rendering ui");

        //make render call
        ReactEcsRenderer.setUiRenderer(() => (
            <UiEntity key={0}
                uiTransform={{
                    //wide order
                    width: '100%', height: 8,
                    position: { top:'100%', bottom:'0%', left:'0%', right:'0%' },
                    //height order
                    /*width: 1, height: '100%',
                    position: { top:'0%', bottom:'0%', left:'50%', right:'0%' },*/
                    positionType: 'absolute',
                    alignContent: 'center',
                    justifyContent: 'center',
                    display: this.menuVisible ? 'flex': 'none'
                }}
                uiBackground={{ 
                    
                    color: Color4.create(1.0, 1.0, 1.0, 0.5) 
                }}
            >
                {this.GetRenderPieces()}
            </UiEntity>
        ));
    }

    /** 
     * 
    */
    private GetRenderPieces() {
        //ensure menu is visible
        if(!this.menuVisible) return undefined;

        //get all existing sub elements
        var array:Array<JSX.Element> = Array();
        for (let i = 0; i < this.menuList.size(); i++) 
        {
            const result = this.menuList.getItem(i).GetRenderPiece();
            if(result != null) array.push(result);
        }
        return array;
    }

    /**
     * sets display state of the scene menu
     * @param state new display state for menu
     */
    public SetMenuState(state: boolean) {
        this.menuVisible = state
    }

    //returns the requested menu object
    public GetMenuObject(objName:string):MenuObject2D {
        return this.menuDict.getItem(objName);
    }

    /**
     * prepares a menu object of the given type, under the given parent
     * @param name requested name for new menu object (if menu object of name already exists then function fails)
     * @param parent target parent, if no value is given object becomes a child of the core menu group parent (if menu object of index doesn't exists then function fails)
     */
    public AddMenuObject(menuType:MENU2D_TYPE, name:string, parent:string[]=[]):MenuObject2D {
        if(isMenuDebugging) console.log("2D Menu: adding ui element name="+name+", parent-access="+parent.toString()+"...");

        //invert array
        MenuObject2D.parentNameArrayCur = Array.from(parent).reverse();
        
        //if menu object has parent, push processing down the line
        const node = MenuObject2D.parentNameArrayCur.pop();
        if(node != undefined)
        {
            return this.menuDict.getItem(node).AddMenu(menuType, name);
        }

        //create object
        const menuObject:MenuObject2D = new MenuObject2D(menuType, name);
        //register object to collections
        this.menuList.addItem(menuObject);
        this.menuDict.addItem(name, menuObject);
        
        if(isMenuDebugging) console.log("2D Menu: added ui element name="+name);
        return menuObject;
    }
}

/** defines menu types */
export enum MENU2D_TYPE {
    MENU_ENTITY,
    MENU_BUTTON,
    MENU_IMAGE
}
/** represents a single UI component */
export class MenuObject2D
{
    //numeric keys system
    private static numberKey:number = 0;
    public static GetNumberKey():number { return ++this.numberKey; } //0 is reserved for the parent

    /** */
    public MenuType:MENU2D_TYPE;

    /** element access name key */
    public name:string;
    private uiKey:number;

    /** when true display is shown */
    public IsVisible:boolean = true;

    //ui transform
    /** element width */
    public Width:PositionUnit = '60px';
    /** element height */
    public Heigth:PositionUnit = '60px';
    /** */
    public PosTop:PositionUnit = '0px';
    /** */
    public PosBottom:PositionUnit = '0px';
    /** */
    public PosLeft:PositionUnit = '0px';
    /** */
    public PosRight:PositionUnit = '0px';
    /** element content alignment */
    public ContentAlignment:AlignType = 'center';
    /** element content justification */
    public ContentJustify:JustifyType = 'center';

    //ui text
    /** */
    public TextValue:string = '';
    /** */
    public TextAlign:TextAlignType = 'middle-center';
    /** */
    public TextSize:number = 12;

    //background
    /** background colour */
    public BackgroundColour:Color4 = Color4.Black();
    /** background image */
    public BackgroundImage:string = "";

    //callbacks
    /** mouse down events */
    public MouseButtonEvent = function(){ null }

    public MouseButtonDown(value:any) 
    {
        console.log("uiButton callback not set, uiKey="+value)
    }

    //collections of all text entities
    menuList:List<MenuObject2D>;
    menuDict:Dictionary<MenuObject2D>;

    //minor instancing optimization (can break if we get into threading...)
    public static parentNamePrev:string = '';
    public static parentNameArrayCur:string[] = [''];


    /** */
    constructor(menuType:MENU2D_TYPE, name: string)
    {
        this.MenuType = menuType;

        this.name = name;
        this.uiKey = MenuObject2D.GetNumberKey();

        //collections
        this.menuList = new List<MenuObject2D>();
        this.menuDict = new Dictionary<MenuObject2D>();

        if(isMenuDebugging) console.log("created new UI, key="+this.uiKey);
    }

    /** adds a new menu object, iterating down a chain of parents to find the target */
    public AddMenu(menuType:MENU2D_TYPE,name:string): MenuObject2D
    {
        //attempt to get next node in the chain
        const node = MenuObject2D.parentNameArrayCur.pop();

        //if node is undefined, end of chain
        if(node == undefined)
        {
            if(isMenuDebugging) console.log("2D Menu: added ui element name="+name+", parent="+MenuObject2D.parentNamePrev);
            const menuObject:MenuObject2D = new MenuObject2D(menuType, name);

            this.menuList.addItem(menuObject);
            this.menuDict.addItem(name, menuObject);

            return menuObject;
        }
        //continue chain
        if(isMenuDebugging) console.log("2D Menu: parsing chain curNode="+this.name+", nextNode="+node+", remaining="+MenuObject2D.parentNameArrayCur.length);
        MenuObject2D.parentNamePrev = node;
        return this.menuDict.getItem(node).AddMenu(menuType,name);
    }

    /** returns all render peices */
    public GetRenderPieces()
    {
        //ensure piece is visible
        if(!this.IsVisible) return null;

        //get all child ui elements
        var ret = [];
        for (let i = 0; i < this.menuList.size(); i++) 
        {
            const result = this.menuList.getItem(i).GetRenderPiece();
            if(result != null) ret.push(result);
        }
        return ret;
    }

    /** */
    public GetRenderPiece()
    {
        //ensure piece is visible
        if(!this.IsVisible) return null;

        //preocess return based on type
        switch(this.MenuType)
        {
            //standard entity
            case MENU2D_TYPE.MENU_ENTITY:
                return <UiEntity key= {this.uiKey}
                    uiTransform={{
                        width: this.Width, height: this.Heigth,
                        position: { top:this.PosTop, bottom:this.PosBottom, left:this.PosLeft, right:this.PosRight },
                        alignContent: this.ContentAlignment,
                        justifyContent: this.ContentJustify,
                        positionType: 'absolute',
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
            case MENU2D_TYPE.MENU_BUTTON:
                return <Button key= {this.uiKey}
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
            case MENU2D_TYPE.MENU_IMAGE:
                return <UiEntity key= {this.uiKey}
                    uiTransform={{
                        width: this.Width, height: this.Heigth,
                        position: { top:this.PosTop, bottom:this.PosBottom, left:this.PosLeft, right:this.PosRight },
                        alignContent: this.ContentAlignment,
                        justifyContent: this.ContentJustify,
                        positionType: 'absolute',
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