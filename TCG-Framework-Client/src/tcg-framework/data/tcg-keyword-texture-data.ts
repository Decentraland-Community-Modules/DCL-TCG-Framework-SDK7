/**     TRADING CARD GAME - FACTION TEXTURE DATA
 *  desc pending
 */

/** defines splice sheets in an easily changable manner */
export enum TEXTURE_SHEET_CARD_KEYWORD {
    KEYWORD_SHEET_DEMO,
}

/** data interface for defining a card type's texture sheet */
export interface CardKeywordTextureDataObject {
    id:TEXTURE_SHEET_CARD_KEYWORD, //sheet name
    path:string, //sheet path
    sheetDetails: { 
        totalSizeX: number, //total width of sheet
        totalSizeY: number, //total height of sheet
        elementSizeX: number, //width of each element
        elementSizeY: number, //height of each element
    }
}

/** listing of all card splice sheets used by cards (this method allows for non-conformity between sheets) */
export const CardKeywordTextureData: CardKeywordTextureDataObject[] = [
    //### DEMO BACKGROUND SPLICE
    {
        id: TEXTURE_SHEET_CARD_KEYWORD.KEYWORD_SHEET_DEMO,
        path:"images/tcg-framework/keyword-sheet-icons-r1.png",
        sheetDetails: { totalSizeX: 512, totalSizeY: 512, elementSizeX: 64, elementSizeY: 64, }
    },
];