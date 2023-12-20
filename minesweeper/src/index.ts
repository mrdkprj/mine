import { appWindow, PhysicalSize, PhysicalPosition } from "@tauri-apps/api/window"
import { dialog, fs, path } from "@tauri-apps/api";

const defaultConfig:Config = {
    bounds: {
        size:{
            width:1200,
            height:800,
        },
        position:{
            x:0,
            y:0
        }
    },
    isMaximized: false
}

let configFilePath = "";
let config:Config;

let isMaximized = false;
let resizeBtn:HTMLElement | null;
let board:HTMLElement | null;
let mode:mode = "expert"

let suspendGame = false;
let opendCellsCount  = 0;
let numberOfCellsToOpen = 0;
let baseNumberOfCells = 0;
let numberOfMineCells = 0;

const NUMBER_OF_CELLS:{[key in mode]:number} = {
    medium: 16,
    expert: 24,
}
const NUMBER_OF_MINES:{[key in mode]:number} = {
    medium: 40,
    expert: 99,
}

const mineCellIndices:number[] = []
const cells:HTMLElement[] = []

window.addEventListener("resize", _e => {
    //board.style.width = `${window.innerWidth / 2}px`
    //board.style.height = `${window.innerWidth / 2}px`
})

document.addEventListener("contextmenu", e => e.preventDefault())

document.addEventListener("keydown", e => {
    if(e.key === "Escape"){
        const viewport = document.getElementById("viewport")
        if(viewport) viewport.style.display = "none"
    }
})

document.addEventListener("click", (e) =>{

    if(!e.target || !(e.target instanceof HTMLElement)) return;

    if(e.target.id === "start"){
        setup()
    }

    if(e.target.id === "retry"){
        onRetry()
    }

    if(e.target.id == "minimize"){
        minimize();
    }

    if(e.target.id == "maximize"){
        toggleMaximize();
    }

    if(e.target.id == "close"){
        close();
    }

})

const onRetry = () => {

    init();

    cells.forEach(cell => {
        cell.className = "cell"
        cell.textContent = ""
    })
    board?.classList.remove("lock")
}

const onModeChange = (e:Event) => {

    if(!e.target || !(e.target instanceof HTMLSelectElement)) return;

    board?.classList.remove(mode)
    mode = e.target.value as mode;
    board?.classList.add(mode)
    setup();
}

const init = () => {
    suspendGame = false;
    opendCellsCount = 0;
}

const setup = () => {

    if(!board) return

    init();

    mineCellIndices.length = 0;
    cells.length = 0;

    baseNumberOfCells = NUMBER_OF_CELLS[mode]
    numberOfMineCells = NUMBER_OF_MINES[mode]

    const totalNumberOfCells = baseNumberOfCells * baseNumberOfCells;
    numberOfCellsToOpen = totalNumberOfCells - numberOfMineCells;

    while(mineCellIndices.length < numberOfMineCells){
        const index = Math.floor(Math.random() * totalNumberOfCells)
        if(!mineCellIndices.includes(index)){
            mineCellIndices.push(index)
        }
    }

    const frag = document.createDocumentFragment();

    Array.from(Array(totalNumberOfCells).keys()).forEach(e => {

        const container = document.createElement("div")

        container.classList.add("cell-container")
        const cell = document.createElement("div");
        cell.setAttribute("data-index", String(e))
        container.addEventListener("click", onCellClick)
        container.addEventListener("contextmenu", onCellRightClick)
        container.addEventListener("mouseup", onMouseUp)
        container.addEventListener("dblclick", onDblClick)
        cell.classList.add("cell")

        container.append(cell)
        cells.push(cell);
        frag.appendChild(container);
    })

    board.innerHTML = ""
    board.append(frag)
    board.classList.remove("lock")

}

const onLoseGame = (index:number) => {
    board?.classList.add("lock")
    cells[index].classList.add("burnt")
    suspendGame = true;
    setTimeout(() => reveal(), 500)
}

const onWin = () => {
    suspendGame = true;
    board?.classList.add("lock")
    mineCellIndices.forEach(i => {
        if(!cells[i].classList.contains("flag")){
            cells[i].classList.add("mine")
        }
    })
    dialog.message("Done")
}

const reveal = () => {
    mineCellIndices.forEach(i => cells[i].classList.add("burnt"))
}

const onCellClick = (e:MouseEvent) => {

    if(!e.target || !(e.target instanceof HTMLElement)) return;

    const target = e.target.children.length ? e.target.children[0] : e.target;

    if(target.classList.contains("flag")) return;

    if(target.classList.contains("opened")) return;

    const index = parseInt(target.getAttribute("data-index") ?? "")

    selectCell(index);
}

const onCellRightClick = (e:MouseEvent) => {

    if(!e.target || !(e.target instanceof HTMLElement)) return;

    e.preventDefault();

    const target = e.target.children.length ? e.target.children[0] : e.target;

    const opened = target.classList.contains("opened")

    if(opened) return;

    if(target.classList.contains("flag")){
        target.classList.remove("flag")
    }else{
        target.classList.add("flag")
    }
}

const onDblClick = (e:MouseEvent) => {
    clearNotLocked(e);
}

const onMouseUp = (e:MouseEvent) => {

    if(e.buttons === 0) return;

    clearNotLocked(e);
}

const clearNotLocked = (e:MouseEvent) => {

    if(!e.target || !(e.target instanceof HTMLElement)) return;

    const target = e.target.children.length ? e.target.children[0] : e.target;

    const valid = target.classList.contains("opened") && target.textContent != ""

    if(!valid) return;

    const index = parseInt(target.getAttribute("data-index") ?? "")

    const numberOfMines = parseInt(target.textContent ?? "");

    const rect = getRect(index);
    const lockedIndices = rect.filter(i => cells[i].classList.contains("flag"))

    if(lockedIndices.length >= numberOfMines){
        rect.every(i => {
            selectCell(i)
            return !suspendGame
        })
    }else{

        const openingIndices = rect.filter(i => !cells[i].classList.contains("opened") && !cells[i].classList.contains("flag"))

        openingIndices.forEach(i => {
            cells[i].classList.add("blink")
        })

        setTimeout(() => openingIndices.forEach(i => cells[i].classList.remove("blink")), 500);
    }

}

const check = (index:number, adjecantIndices:number[]) => {

    if(suspendGame) return;

    const mineCells = adjecantIndices.filter(i => mineCellIndices.includes(i))
    const mineCellsExceptFlagged = mineCells.filter(i => !cells[i].classList.contains("flag"))

    if(mineCellsExceptFlagged.length == 0 ){
        adjecantIndices.every(i => {
            selectCell(i)
            return !suspendGame
        })
    }else{
        displayMineCount(index, mineCells.length)
    }
}

const displayMineCount = (index:number, count:number) => {

    if(count === 2){
        cells[index].classList.add("two")
    }

    if(count > 2){
        cells[index].classList.add("three")
    }

    cells[index].textContent = String(count)
}

const isValid = (index:number) => {

    if(index < 0) return false;

    if(index > cells.length - 1) return false;

    return true;
}


const selectCell = (index:number, ignoreOpened = false) => {

    if(suspendGame) return;

    if(cells[index].classList.contains("flag")) return;

    if(mineCellIndices.includes(index)){
        onLoseGame(index);
        return;
    }

    if(!ignoreOpened && cells[index].classList.contains("opened")){
        return;
    }

    cells[index].classList.add("opened")

    if(!ignoreOpened){

        opendCellsCount++;

        if(opendCellsCount == numberOfCellsToOpen){
            onWin();
            return;
        }

    }

    check(index, getRect(index).filter(i => isValid(i)))
}

const POSITION = {
    TopLeft:0,
    TopRight:1,
    BottomLeft:2,
    BottomRight:3,
    FirstRow:4,
    LastRow:5,
    FirstColumn:6,
    LastColumn:7,
}

const getPosition = (index:number) => {

    if(index === 0){
        return POSITION.TopLeft
    }

    if(index === baseNumberOfCells - 1){
        return POSITION.TopRight
    }

    if(index === baseNumberOfCells * (baseNumberOfCells - 1)){
        return POSITION.BottomLeft
    }

    if(index === baseNumberOfCells * baseNumberOfCells - 1){
        return POSITION.BottomRight
    }

    if(index <= baseNumberOfCells - 1){
        return POSITION.FirstRow
    }

    if(index >= baseNumberOfCells * (baseNumberOfCells - 1)){
        return POSITION.LastRow
    }

    if(index % baseNumberOfCells === 0){
        return POSITION.FirstColumn
    }

    if((index + 1) % baseNumberOfCells === 0){
        return POSITION.LastColumn
    }

    return null;

}

const getRect = (index:number) => {

    const poistion = getPosition(index);

    if(poistion === POSITION.TopLeft){
        return [
            index + 1,
            index + baseNumberOfCells,
            index + baseNumberOfCells + 1,
        ]
    }

    if(poistion === POSITION.TopRight){
        return [
            index - 1,
            index + baseNumberOfCells,
            index + baseNumberOfCells - 1,
        ]
    }


    if(poistion === POSITION.BottomLeft){
        return [
            index + 1,
            index - baseNumberOfCells,
            index - baseNumberOfCells + 1,
        ]
    }

    if(poistion === POSITION.BottomRight){
        return [
            index - 1,
            index - baseNumberOfCells,
            index - baseNumberOfCells - 1,
        ]
    }

    if(poistion === POSITION.FirstRow){
        return [
            index - 1,
            index + 1,
            index + baseNumberOfCells - 1,
            index + baseNumberOfCells,
            index + baseNumberOfCells + 1,
        ]
    }

    if(poistion === POSITION.LastRow){
        return [
            index - baseNumberOfCells - 1,
            index - baseNumberOfCells,
            index - baseNumberOfCells + 1,
            index - 1,
            index + 1,
        ]
    }

    if(poistion === POSITION.FirstColumn){
        return [
            index - baseNumberOfCells,
            index - baseNumberOfCells + 1,
            index + 1,
            index + baseNumberOfCells,
            index + baseNumberOfCells + 1,
        ]
    }

    if(poistion === POSITION.LastColumn){
        return [
            index - baseNumberOfCells - 1,
            index - baseNumberOfCells,
            index - 1,
            index + baseNumberOfCells - 1,
            index + baseNumberOfCells,
        ]
    }

    return [
        index - baseNumberOfCells - 1,
        index - baseNumberOfCells,
        index - baseNumberOfCells + 1,
        index - 1,
        index + 1,
        index + baseNumberOfCells - 1,
        index + baseNumberOfCells,
        index + baseNumberOfCells + 1,
    ]
}

const changeMaximizeIcon = () => {

    if(isMaximized){
        resizeBtn?.classList.remove("minbtn");
        resizeBtn?.classList.add("maxbtn");
    }else{
        resizeBtn?.classList.remove("maxbtn");
        resizeBtn?.classList.add("minbtn");
    }
}

const minimize = () => {
    appWindow.minimize()
}

const toggleMaximize = () => {
    appWindow.toggleMaximize();
    isMaximized = !isMaximized;
    changeMaximizeIcon();
}

window.addEventListener("DOMContentLoaded", async () => {

    await appready()

    resizeBtn = document.getElementById("resizeBtn")
    board = document.getElementById("board")
    document.getElementById("mode")?.addEventListener("change", onModeChange);
    setup();

    isMaximized = config.isMaximized;
    changeMaximizeIcon();

    await appWindow.setSize(new PhysicalSize(config.bounds.size.width, config.bounds.size.height))
    await appWindow.setPosition(new PhysicalPosition(config.bounds.position.x, config.bounds.position.y))

    if(isMaximized){
        await appWindow.maximize();
    }

    await appWindow.show();

})

async function appready(){

    const appDataDir = await path.appDataDir();
    const currentDirectory = await path.join(appDataDir, "temp");

    await exists(currentDirectory, true);

    configFilePath = await path.join(currentDirectory,"minesweeper.config.json");

    const fileExists = await exists(configFilePath, false);

    if(fileExists){

        const rawData = await fs.readTextFile(configFilePath);
        config = createConfig(JSON.parse(rawData))

    }else{
        config = defaultConfig
        await fs.writeTextFile(configFilePath, JSON.stringify(defaultConfig));

    }
}

const createConfig = (rawConfig:any):Config => {

    const config = {...defaultConfig} as any;

    Object.keys(rawConfig).forEach(key => {

        if(!(key in config)) return;

        const value = rawConfig[key];

        if(typeof value === "object"){

            Object.keys(value).forEach(valueKey => {
                if(valueKey in config[key]){
                    config[key][valueKey] = value[valueKey]
                }
            })
        }else{
            config[key] = value;
        }
    })

    return config;
}


async function exists(target:string, createIfNotFound = false){

    const result = await fs.exists(target);

    if(!result && createIfNotFound){
        await fs.createDir(target,{recursive: true});
    }

    return result;

}

async function writeConfig(){
    await fs.writeTextFile(configFilePath, JSON.stringify(config));
}

async function save(){

    config.isMaximized = await appWindow.isMaximized();
    const {width, height} = await appWindow.innerSize()
    const {x, y} = await appWindow.innerPosition();
    config.bounds.size.width = width;
    config.bounds.size.height = height;
    config.bounds.position.x = x;
    config.bounds.position.y = y;

    await writeConfig();
}

async function close(){
    await save();
    await appWindow.close();
}

export {}