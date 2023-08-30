/**     CARD TEXTURE DATA
 *  desc pending
 */

/** defines splice sheets in an easily changable manner */
export enum TEXTURE_SHEET_CARDS {
    DEMO_SHEET_SPELL,    
    DEMO_SHEET_CHARACTER,
    DEMO_SHEET_TERRAIN,
}
/** data interface for defining a card's texture sheet */
export interface CardTextureDataObject {
    id: TEXTURE_SHEET_CARDS,     //sheet name
    path:string,    //sheet path
    sheetDetails: { 
        totalSizeX: number,     //total width of sheet
        totalSizeY: number,     //total height of sheet
        elementSizeX: number,   //width of each element
        elementSizeY: number,   //height of each element
    }
}
/** listing of all card splice sheets used by cards (this method allows for non-conformity between sheets) */
export const CardTextureData: CardTextureDataObject[] = [
    //### DEMO SPELL SPLICE
    {
        id: TEXTURE_SHEET_CARDS.DEMO_SHEET_SPELL, //sheet name
        path:"images/tcg-framework/card-characters/example-sheet-characters.png",  //sheet path
        sheetDetails: { 
            totalSizeX: 512,      //total width of sheet
            totalSizeY: 512,      //total height of sheet
            elementSizeX: 142,  //width of each element
            elementSizeY: 256,  //height of each element
        }
    },

    //### DEMO CHARACTER SPLICE
    {
        id: TEXTURE_SHEET_CARDS.DEMO_SHEET_CHARACTER,
        path:"images/tcg-framework/card-characters/example-sheet-characters.png",
        sheetDetails: { totalSizeX: 512, totalSizeY: 512, elementSizeX: 142, elementSizeY: 256, }
    },

    //### DEMO FIELD SPLICE
    {
        id: TEXTURE_SHEET_CARDS.DEMO_SHEET_TERRAIN,
        path:"images/tcg-framework/card-characters/example-sheet-characters.png",
        sheetDetails: { totalSizeX: 512, totalSizeY: 512, elementSizeX: 142, elementSizeY: 256, }
    },
];