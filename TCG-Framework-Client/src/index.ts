import { Transform } from "@dcl/sdk/ecs";
import { CardObject, TEST_CARD_OBJECT_CREATE, TEST_CARD_OBJECT_DESTROY_ALL } from "./tcg-framework/tcg-card-object";
import { DeckManager } from "./tcg-framework/tcg-deck-manager";

/**
 * main function that initializes scene and prepares it for play
 */
export function main() 
{
  //DeckManager.SetPosition({ x:8, y:0, z:8 });

  //const card = CardObject.Create("tcg-0");
  //Transform.getMutable(card.entityFrame).position = { x:8, y:1.5, z:8 };

  TEST_CARD_OBJECT_CREATE(4);
}