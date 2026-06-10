import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    set,
    update,
    remove,
    onValue,
    onChildAdded,
    onChildRemoved,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBCN-yOjN0CYjdskON8kOzELYELQ8zRMm8",
    authDomain: "temp-crud-85ba9.firebaseapp.com",
    databaseURL: "https://temp-crud-85ba9-default-rtdb.firebaseio.com",
    projectId: "temp-crud-85ba9",
    storageBucket: "temp-crud-85ba9.firebasestorage.app",
    messagingSenderId: "990504243112",
    appId: "1:990504243112:web:69f2117ad0ffc9ca1f579d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const mapData = {
    minX: 1,
    maxX: 14,
    minY: 4,
    maxY: 12,
    blockedSpaces: {
        "7x4": true,
        "1x11": true,
        "12x10": true,
        "4x7": true,
        "5x7": true,
        "6x7": true,
        "8x6": true,
        "9x6": true,
        "10x6": true,
        "7x9": true,
        "8x9": true,
        "9x9": true
    }
};

const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];

function randomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getKeyString(x, y) {
    return `${x}x${y}`;
}

function createName() {
    const prefix = randomFromArray([
        "COOL",
        "SUPER",
        "HIP",
        "SMUG",
        "COOL",
        "SILKY",
        "GOOD",
        "SAFE",
        "DEAR",
        "DAMP",
        "WARM",
        "RICH",
        "LONG",
        "DARK",
        "SOFT",
        "BUFF",
        "DOPE"
    ]);

    const animal = randomFromArray([
        "BEAR",
        "DOG",
        "CAT",
        "FOX",
        "LAMB",
        "LION",
        "BOAR",
        "GOAT",
        "VOLE",
        "SEAL",
        "PUMA",
        "MULE",
        "BULL",
        "BIRD",
        "BUG"
    ]);

    return `${prefix} ${animal}`;
}

function isSolid(x, y) {
    const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];

    return (
        blockedNextSpace ||
        x >= mapData.maxX ||
        x < mapData.minX ||
        y >= mapData.maxY ||
        y < mapData.minY
    );
}

function getRandomSafeSpot() {
    return randomFromArray([
        { x: 1, y: 4 },
        { x: 2, y: 4 },
        { x: 1, y: 5 },
        { x: 2, y: 6 },
        { x: 2, y: 8 },
        { x: 2, y: 9 },
        { x: 4, y: 8 },
        { x: 5, y: 5 },
        { x: 5, y: 8 },
        { x: 5, y: 10 },
        { x: 5, y: 11 },
        { x: 11, y: 7 },
        { x: 12, y: 7 },
        { x: 13, y: 7 },
        { x: 13, y: 6 },
        { x: 13, y: 8 },
        { x: 7, y: 6 },
        { x: 7, y: 7 },
        { x: 7, y: 8 },
        { x: 8, y: 8 },
        { x: 10, y: 8 },
        { x: 11, y: 4 }
    ]);
}

class KeyPressListener {
    constructor(keyCode, callback) {
        let keySafe = true;

        this.keydownFunction = function (event) {
            if (event.code === keyCode) {
                if (keySafe) {
                    keySafe = false;
                    callback();
                }
            }
        };

        this.keyupFunction = function (event) {
            if (event.code === keyCode) {
                keySafe = true;
            }
        };

        document.addEventListener("keydown", this.keydownFunction);
        document.addEventListener("keyup", this.keyupFunction);
    }

    unbind() {
        document.removeEventListener("keydown", this.keydownFunction);
        document.removeEventListener("keyup", this.keyupFunction);
    }
}

(function () {
    let playerId;
    let playerRef;
    let players = {};
    let playerElements = {};
    let coins = {};
    let coinElements = {};

    const gameContainer = document.querySelector(".game-container");
    const playerNameInput = document.querySelector("#player-name");
    const playerColorButton = document.querySelector("#player-color");

    function placeCoin() {
        const { x, y } = getRandomSafeSpot();
        const coinKey = getKeyString(x, y);
        const coinRef = ref(db, `coins/${coinKey}`);

        set(coinRef, {
            x,
            y
        });

        const coinTimeouts = [2000, 3000, 4000, 5000];

        setTimeout(() => {
            placeCoin();
        }, randomFromArray(coinTimeouts));
    }

    function attemptGrabCoin(x, y) {
        const key = getKeyString(x, y);

        if (coins[key]) {
            remove(ref(db, `coins/${key}`));

            update(playerRef, {
                coins: players[playerId].coins + 1
            });
        }
    }

    function handleArrowPress(xChange = 0, yChange = 0) {
        if (!players[playerId]) return;

        const newX = players[playerId].x + xChange;
        const newY = players[playerId].y + yChange;

        if (!isSolid(newX, newY)) {
            players[playerId].x = newX;
            players[playerId].y = newY;

            if (xChange === 1) {
                players[playerId].direction = "right";
            }

            if (xChange === -1) {
                players[playerId].direction = "left";
            }

            set(playerRef, players[playerId]);
            attemptGrabCoin(newX, newY);
        }
    }

    function initGame() {
        new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1));
        new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1));
        new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0));
        new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0));

        const allPlayersRef = ref(db, "players");
        const allCoinsRef = ref(db, "coins");

        onValue(allPlayersRef, (snapshot) => {
            players = snapshot.val() || {};

            Object.keys(players).forEach((key) => {
                const characterState = players[key];
                const el = playerElements[key];

                if (!el) return;

                el.querySelector(".Character_name").innerText = characterState.name;
                el.querySelector(".Character_coins").innerText = characterState.coins;
                el.setAttribute("data-color", characterState.color);
                el.setAttribute("data-direction", characterState.direction);

                const left = 16 * characterState.x + "px";
                const top = 16 * characterState.y - 4 + "px";

                el.style.transform = `translate3d(${left}, ${top}, 0)`;
            });
        });

        onChildAdded(allPlayersRef, (snapshot) => {
            const addedPlayer = snapshot.val();

            const characterElement = document.createElement("div");
            characterElement.classList.add("Character", "grid-cell");

            if (addedPlayer.id === playerId) {
                characterElement.classList.add("you");
            }

            characterElement.innerHTML = `
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `;

            playerElements[addedPlayer.id] = characterElement;

            characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
            characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
            characterElement.setAttribute("data-color", addedPlayer.color);
            characterElement.setAttribute("data-direction", addedPlayer.direction);

            const left = 16 * addedPlayer.x + "px";
            const top = 16 * addedPlayer.y - 4 + "px";

            characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;

            gameContainer.appendChild(characterElement);
        });

        onChildRemoved(allPlayersRef, (snapshot) => {
            const removedPlayer = snapshot.val();
            const removedKey = removedPlayer.id;

            if (playerElements[removedKey]) {
                gameContainer.removeChild(playerElements[removedKey]);
                delete playerElements[removedKey];
            }
        });

        onValue(allCoinsRef, (snapshot) => {
            coins = snapshot.val() || {};
        });

        onChildAdded(allCoinsRef, (snapshot) => {
            const coin = snapshot.val();
            const key = getKeyString(coin.x, coin.y);

            coins[key] = true;

            if (coinElements[key]) return;

            const coinElement = document.createElement("div");
            coinElement.classList.add("Coin", "grid-cell");

            coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

            const left = 16 * coin.x + "px";
            const top = 16 * coin.y - 4 + "px";

            coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

            coinElements[key] = coinElement;
            gameContainer.appendChild(coinElement);
        });

        onChildRemoved(allCoinsRef, (snapshot) => {
            const coin = snapshot.val();
            const keyToRemove = getKeyString(coin.x, coin.y);

            if (coinElements[keyToRemove]) {
                gameContainer.removeChild(coinElements[keyToRemove]);
                delete coinElements[keyToRemove];
            }
        });

        playerNameInput.addEventListener("change", (e) => {
            const newName = e.target.value || createName();

            playerNameInput.value = newName;

            update(playerRef, {
                name: newName
            });
        });

        playerColorButton.addEventListener("click", () => {
            if (!players[playerId]) return;

            const mySkinIndex = playerColors.indexOf(players[playerId].color);
            const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];

            update(playerRef, {
                color: nextColor
            });
        });

        placeCoin();
    }

    onAuthStateChanged(auth, (user) => {
        console.log(user);

        if (user) {
            playerId = user.uid;
            playerRef = ref(db, `players/${playerId}`);

            const name = createName();
            playerNameInput.value = name;

            const { x, y } = getRandomSafeSpot();

            set(playerRef, {
                id: playerId,
                name,
                direction: "right",
                color: randomFromArray(playerColors),
                x,
                y,
                coins: 0
            });

            onDisconnect(playerRef).remove();

            initGame();
        }
    });

    signInAnonymously(auth).catch((error) => {
        console.log(error.code, error.message);
    });
})();