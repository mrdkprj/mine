let isMaximized = false;
let resizeBtn;
let board;
let mode = "expert"

let suspendGame = false;
let numberOfCellsToOpen = 0;
let baseNumberOfCells = 0;
let numberOfMineCells = 0;

const NUMBER_OF_CELLS = {
    medium: 16,
    expert: 24,
}
const NUMBER_OF_MINES = {
    medium: 40,
    expert: 99,
}

const mineCellIndices = []
const cells = []

window.onload = () => {

    resizeBtn = document.getElementById("resizeBtn")
    board = document.getElementById("board")
    document.getElementById("mode").addEventListener("change", onModeChange);
    setup();
}

window.addEventListener("resize", e => {
    //board.style.width = `${window.innerWidth / 2}px`
    //board.style.height = `${window.innerWidth / 2}px`
})

document.addEventListener("contextmenu", e => e.preventDefault())

document.addEventListener("keydown", e => {
    if(e.key === "Escape"){
        document.getElementById("viewport").style.display = "none"
    }
})

document.addEventListener("click", (e) =>{

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
    board.classList.remove("lock")
}

const onModeChange = (e) => {
    board.classList.remove(mode)
    mode = e.target.value;
    board.classList.add(mode)
    setup();
}

const init = () => {
    suspendGame = false;
    opendCellsCount = 0;
}

const setup = () => {

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
        cell.setAttribute("data-index", e)
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

const onLoseGame = (index) => {
    board.classList.add("lock")
    cells[index].classList.add("burnt")
    suspendGame = true;
    setTimeout(() => reveal(), 500)
}

const onWin = () => {
    suspendGame = true;
    board.classList.add("lock")
    mineCellIndices.forEach(i => {
        if(!cells[i].classList.contains("flag")){
            cells[i].classList.add("mine")
        }
    })
    window.api.send("game-end")
}

const reveal = () => {
    mineCellIndices.forEach(i => cells[i].classList.add("burnt"))
}

const onCellClick = (e) => {

    const target = e.target.children.length ? e.target.children[0] : e.target;

    if(target.classList.contains("flag")) return;

    if(target.classList.contains("opened")) return;

    const index = parseInt(target.getAttribute("data-index"))

    selectCell(index);
}

const onCellRightClick = (e) => {

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

const onDblClick = (e) => {
    clearNotLocked(e);
}

const onMouseUp = (e) => {

    if(e.buttons === 0) return;

    clearNotLocked(e);
}

const clearNotLocked = (e) => {

    const target = e.target.children.length ? e.target.children[0] : e.target;

    const valid = target.classList.contains("opened") && target.textContent != ""

    if(!valid) return;

    const index = parseInt(target.getAttribute("data-index"))

    const numberOfMines = parseInt(target.textContent);

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

const check = (index, adjecantIndices) => {

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

const displayMineCount = (index, count) => {

    if(count === 2){
        cells[index].classList.add("two")
    }

    if(count > 2){
        cells[index].classList.add("three")
    }

    cells[index].textContent = count
}

const isValid = (index) => {

    if(index < 0) return false;

    if(index > cells.length - 1) return false;

    return true;
}


const selectCell = (index, ignoreOpened = false) => {

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

const getPosition = (index) => {

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

const getRect = (index) => {

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
        resizeBtn.classList.remove("minbtn");
        resizeBtn.classList.add("maxbtn");
    }else{
        resizeBtn.classList.remove("maxbtn");
        resizeBtn.classList.add("minbtn");
    }
}

const minimize = () => {
    window.api.send("minimize")
}

const toggleMaximize = () => {
    window.api.send("toggle-maximize")
    isMaximized = !isMaximized;
    changeMaximizeIcon();
}

const close = () => {
    window.api.send("close");
}

const prepare = (config) => {
    isMaximized = config.bounds.isMaximized;
    changeMaximizeIcon();
    window.api.send("game-end")
}

window.api.receive("config", data => prepare(data.config))