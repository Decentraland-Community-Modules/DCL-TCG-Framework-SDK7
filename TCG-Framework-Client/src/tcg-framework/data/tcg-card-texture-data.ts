/**     TRADING CARD GAME - CARD TEXTURE DATA
 *  contains all details for card textures, used to draw character/spell images
 *  on 3D card objects.
 */

/** defines splice sheets in an easily changable manner */
export enum TEXTURE_SHEET_CARDS {
    SHEET_SPELLS,
    SHEET_CHARACTER_GOLEM,
    SHEET_TERRAIN,
}
/** data interface for defining a card's texture sheet */
export interface CardTextureDataObject {
    id: TEXTURE_SHEET_CARDS, //sheet name
    path:string, //sheet path
    sheetDetails: { 
        totalSizeX: number, //total width of sheet
        totalSizeY: number, //total height of sheet
        elementSizeX: number, //width of each element
        elementSizeY: number, //height of each element
        displayScaleX: number, //display scale for x
        displayScaleY: number, //display scale for y
    }
}
/** listing of all card splice sheets used by cards (this method allows for non-conformity between sheets) */
export const CardTextureData: CardTextureDataObject[] = [
    //### DEMO SPELL SPLICE
    {
        id: TEXTURE_SHEET_CARDS.SHEET_SPELLS,
        path:"images/tcg-framework/card-spells/spells-sheet-example.png",
        sheetDetails: { totalSizeX: 512, totalSizeY: 512, elementSizeX: 128, elementSizeY: 128, displayScaleX: 1.8, displayScaleY: 1.8, }
    },

    //### GOLEM CHARACTER SPLICE
    {
        id: TEXTURE_SHEET_CARDS.SHEET_CHARACTER_GOLEM,
        path:"images/tcg-framework/card-characters/character-sheet-golem.png",
        sheetDetails: { totalSizeX: 512, totalSizeY: 512, elementSizeX: 170, elementSizeY: 200, displayScaleX: 1.7, displayScaleY: 2.0, }
    },

    //### DEMO FIELD SPLICE
    {
        id: TEXTURE_SHEET_CARDS.SHEET_TERRAIN,
        path:"images/tcg-framework/card-spells/spells-sheet-example.png",
        sheetDetails: { totalSizeX: 512, totalSizeY: 512, elementSizeX: 128, elementSizeY: 128, displayScaleX: 1.8, displayScaleY: 1.8, }
    },
];