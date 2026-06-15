const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
const startBtn = document.getElementById("start-btn");

context.scale(20, 20);

// ========== パーティクルシステム ==========
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3 - 0.1;
        this.life = 1;
        this.decay = 0.02;
        this.size = Math.random() * 0.3 + 0.1;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.01;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 0.3;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.restore();
    }
}

const particles = [];
let clearingRows = [];
let clearAnimation = 0;
let screenShake = { x: 0, y: 0, intensity: 0 };
let comboText = { text: "", alpha: 0, y: 10 };

// ========== テトリミノの色 ==========
const colors = [null, "#FF0D72", "#0DC2FF", "#0DFF72", "#F538FF", "#FF8E0D", "#FFE138", "#3877FF", "#ccc"];

// ========== 列消し ==========
function arenaSweep() {
    clearingRows = [];

    for (let y = arena.length - 1; y > 0; --y) {
        let isFullRow = true;
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                isFullRow = false;
                break;
            }
        }
        if (isFullRow) {
            clearingRows.push(y);
        }
    }

    if (clearingRows.length > 0) {
        clearAnimation = 30;
        screenShake.intensity = 0.2 + clearingRows.length * 0.1;

        const comboTexts = ["SINGLE!", "DOUBLE!!", "TRIPLE!!!", "TETRIS!!!!"];
        comboText.text = comboTexts[Math.min(clearingRows.length - 1, 3)];
        comboText.alpha = 1;
        comboText.y = 10;

        clearingRows.forEach((y) => {
            for (let x = 0; x < arena[y].length; ++x) {
                const color = colors[arena[y][x]];
                const particleCount = 8 + clearingRows.length * 2;
                for (let i = 0; i < particleCount; i++) {
                    particles.push(new Particle(x + 0.5, y + 0.5, color));
                }
            }
        });
    }
}

function completeClearRows() {
    let rowCount = 1;
    const sortedRows = clearingRows.sort((a, b) => b - a);
    sortedRows.forEach((y) => {
        arena.splice(y, 1);
        player.score += rowCount * 10;
        rowCount *= 2;
    });
    sortedRows.forEach(() => {
        arena.unshift(new Array(arena[0].length).fill(0));
    });
    clearingRows = [];
}

// ========== 衝突判定 ==========
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function collide2(arena, player) {
    if (player.pos.y > 50) return true;
    let cnt = 0;
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                // console.log(arena[y + o.y]);
                // if (arena[y + o.y]) {
                //     console.log(arena[y + o.y][x + o.x]);
                // }
                cnt++;
            }
        }
    }

    return cnt != 0;
}

// ========== 盤面作成 ==========
function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

// ========== テトリミノ定義 ==========
function createPiece(type) {
    if (type === "I") {
        return [
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
            [0, 1, 0, 0],
        ];
    } else if (type === "L") {
        return [
            [0, 2, 0],
            [0, 2, 0],
            [0, 2, 2],
        ];
    } else if (type === "J") {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [3, 3, 0],
        ];
    } else if (type === "O") {
        return [
            [4, 4],
            [4, 4],
        ];
    } else if (type === "Z") {
        return [
            [5, 5, 0],
            [0, 5, 5],
            [0, 0, 0],
        ];
    } else if (type === "S") {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === "T") {
        return [
            [0, 7, 0],
            [7, 7, 7],
            [0, 0, 0],
        ];
    }
}

// ========== 描画 ==========
function draw() {
    context.save();

    if (screenShake.intensity > 0) {
        screenShake.x = (Math.random() - 0.5) * screenShake.intensity;
        screenShake.y = (Math.random() - 0.5) * screenShake.intensity;
        context.translate(screenShake.x, screenShake.y);
        screenShake.intensity *= 0.9;
    }

    context.fillStyle = "#000";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.lineWidth = 0.05;
    context.strokeStyle = "#333";
    for (let x = 0; x < 12; ++x) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, 20);
        context.stroke();
    }
    for (let y = 0; y < 20; ++y) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(12, y);
        context.stroke();
    }

    drawMatrix(arena, { x: 0, y: 0 });
    drawMatrix(player.matrix, player.pos);

    if (started) {
        shadowPlayer.pos = { ...player.pos };
        const pos = [];
        for (let i = player.pos.y; i <= 20; i++) {
            if (collide2(arena, shadowPlayer)) {
                pos.push(i);
            }
            shadowPlayer.pos.y++;
        }
        if (pos.length) {
            console.log(pos);
        }
        shadowPlayer.pos = { ...player.pos };
        while (!collide2(arena, shadowPlayer)) {
            shadowPlayer.pos.y++;
        }
        shadowPlayer.pos.y--;
        drawMatrix(shadowPlayer.matrix, shadowPlayer.pos);
    }

    if (clearAnimation > 0) {
        const flash = Math.sin(clearAnimation * 0.5) * 0.5 + 0.5;
        clearingRows.forEach((y) => {
            context.save();
            context.globalAlpha = flash;
            context.fillStyle = "#ffffff";
            context.fillRect(0, y, 12, 1);
            context.restore();
        });
    }

    particles.forEach((particle) => {
        particle.draw(context);
    });

    if (comboText.alpha > 0) {
        context.save();
        context.globalAlpha = comboText.alpha;
        context.fillStyle = "#FFD700";
        context.shadowBlur = 0.5;
        context.shadowColor = "#FFD700";
        context.font = "bold 1px Arial";
        context.textAlign = "center";
        context.fillText(comboText.text, 6, comboText.y);
        context.restore();
    }

    context.restore();
}

function drawMatrix(matrix, offset) {
    if (!matrix) return;
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const px = x + offset.x;
                const py = y + offset.y;
                context.save();
                context.shadowBlur = 0.5;
                context.shadowColor = colors[value];
                context.fillStyle = colors[value];
                context.fillRect(px, py, 1, 1);
                context.restore();
                context.lineWidth = 0.05;
                context.strokeStyle = "rgba(255, 255, 255, 0.5)";
                context.strokeRect(px, py, 1, 1);
                context.fillStyle = "rgba(255, 255, 255, 0.3)";
                context.fillRect(px + 0.1, py + 0.1, 0.3, 0.3);
            }
        });
    });
}

// ========== ゲーム操作 ==========
function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
                const color = colors[value];
                for (let i = 0; i < 3; i++) {
                    particles.push(new Particle(x + player.pos.x + 0.5, y + player.pos.y + 0.5, color));
                }
            }
        });
    });
    screenShake.intensity = 0.05;
}

/* Move down by changing position y */
function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
    }
    dropCounter = 0;
}

/* Move to the bottom by changing position y*/
function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    dropCounter = 0;
}

/* Move left/right by changing position x*/
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    const pieces = "ILJOTSZ";
    player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
    player.pos.y = 0;
    player.pos.x = ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);
    if (collide(arena, player)) {
        gameOver = true;
        startBtn.innerText = "GAME OVER - RESTART";
        startBtn.style.display = "block";
    }
    shadowPlayer.matrix = [];
    player.matrix.forEach((row, y) => {
        shadowPlayer.matrix.push([]);
        row.forEach((value, x) => {
            if (value !== 0) {
                shadowPlayer.matrix[y].push(8);
            } else {
                shadowPlayer.matrix[y].push(value);
            }
        });
    });
}

/* Rotate */
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    rotate(shadowPlayer.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach((row) => row.reverse());
    } else {
        matrix.reverse();
    }
}

// ========== ゲームループ ==========
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
    if (gameOver) return;

    const deltaTime = time - lastTime;
    lastTime = time;

    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    if (comboText.alpha > 0) {
        comboText.alpha -= 0.015;
        comboText.y -= 0.05;
    }

    if (clearAnimation > 0) {
        clearAnimation--;
        if (clearAnimation === 0) {
            completeClearRows();
        }
    } else {
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }
    }

    draw();
    requestAnimationFrame(update);
}

// ========== 初期化 ==========
const arena = createMatrix(12, 20);
const player = { pos: { x: 0, y: 0 }, matrix: null, score: 0 };
const shadowPlayer = { pos: { x: 0, y: 0 }, matrix: null, score: 0 };
let gameOver = true;
let started = false;

document.addEventListener("keydown", (e) => {
    if (!started) return;
    if (e.code === "ArrowLeft") {
        playerMove(-1);
    }
    if (e.code === "ArrowRight") {
        playerMove(1);
    }
    if (e.code === "ArrowDown") {
        playerDrop();
    }
    if (e.code === "ArrowUp") {
        playerRotate(1);
    }
    if (e.ctrlKey && e.code === "ArrowDown") {
        playerHardDrop();
    }
});

startBtn.addEventListener("click", () => {
    arena.forEach((row) => row.fill(0));
    player.score = 0;
    gameOver = false;
    started = !started;
    if (started) {
        startBtn.innerText = "STOP";
        playerReset();
        update();
    } else {
        gameOver = true;
        startBtn.innerText = "START GAME";
    }
});

draw();
