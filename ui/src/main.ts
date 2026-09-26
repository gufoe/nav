import "./style.css"
import { Game } from "./core/Game.ts"
import { MenuScene } from "./scenes/MenuScene.ts"
import { installTouchUiClass } from "./ui/touchUi.ts"

const canvas = document.querySelector<HTMLCanvasElement>("#game")
const uiRoot = document.querySelector<HTMLElement>("#ui")

if (!canvas || !uiRoot) {
  throw new Error("Missing #game or #ui elements")
}

// Physics runs at 120 Hz, so a 60 Hz frame needs two steps — with headroom
// for the occasional slow frame before the sim is allowed to fall behind.
installTouchUiClass()

const game = new Game({ canvas, uiRoot, maxFixedSteps: 8 })
game.start(new MenuScene(game))
