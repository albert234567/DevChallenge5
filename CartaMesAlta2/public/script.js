const socket = io();

const createGameBtn = document.getElementById('createGameBtn');
const joinGameBtn = document.getElementById('joinGameBtn');
const joinGameInput = document.getElementById('joinGameInput');
const gameArea = document.getElementById('gameArea');
const lobby = document.getElementById('lobby');

let gameId = null;

// Funció per crear un codi de partida aleatori (p. ex. 6 caràcters)
function generateGameId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Crear nova partida
createGameBtn.onclick = () => {
    gameId = generateGameId();
    socket.emit('joinGame', gameId);
    lobby.style.display = 'none'; // amagar lobby
    gameArea.innerHTML = `
        <p>
            Has creat la partida amb codi 
            <strong id="gameCode">${gameId}</strong> 
            <span id="copyIcon" style="cursor: pointer;">📋</span><br />
            <small>(Fes clic a la icona per copiar el codi)</small>
        </p>
    `;
    // Copiar codi al portapapers
    setTimeout(() => {
        const copyIcon = document.getElementById('copyIcon');
        const gameCode = document.getElementById('gameCode');

        copyIcon.addEventListener('click', () => {
            navigator.clipboard.writeText(gameCode.textContent).then(() => {
                copyIcon.textContent = '✅';
                setTimeout(() => copyIcon.textContent = '📋', 1500);
            });
        });
    }, 0);
};

// Unir-se a partida
joinGameBtn.onclick = () => {
    const inputId = joinGameInput.value.trim().toUpperCase();
    if (!inputId) {
        alert('Introdueix un codi de partida vàlid');
        return;
    }
    gameId = inputId;
    socket.emit('joinGame', gameId);
    lobby.style.display = 'none'; // amagar lobby
    gameArea.innerHTML = `<p>Intentant unir-se a la partida amb codi <strong>${gameId}</strong>...</p>`;
};

// Missatge quan esperem jugadors
socket.on('waitingForPlayers', (message) => {
    gameArea.innerHTML = `<p>${message}</p>`;
});

// Funció per marcar carta seleccionada
function selectCard(cardElem) {
    document.querySelectorAll('.card.selected').forEach(card => card.classList.remove('selected'));
    cardElem.classList.add('selected');
}

// Afegir botó per acabar la partida
function addEndGameButton() {
    const endGameBtn = document.createElement('button');
    endGameBtn.textContent = 'Acabar partida';
    endGameBtn.onclick = () => {
        socket.emit('endGame', gameId);
    };
    gameArea.appendChild(endGameBtn);
}

// Quan comença la partida: mostrar cartes i botó acabar partida
socket.on('gameStart', (cards) => {
    gameArea.innerHTML = ''; // Netejar

    cards[socket.id].forEach((card, index) => {
        const cardElem = document.createElement('div');
        cardElem.classList.add('card');

        const img = document.createElement('img');
        img.src = `images/poker.png`;
        img.alt = 'Carta';

        cardElem.appendChild(img);
        cardElem.onclick = () => {
            socket.emit('pickCard', { gameId, cardIndex: index });
            selectCard(cardElem);
        };

        gameArea.appendChild(cardElem);
    });

    addEndGameButton();
});

// Gestionar resultat partida
socket.on('gameResult', (result) => {
    const gameArea = document.getElementById('gameArea');
    const isWinner = result.winner === socket.id;
    const isDraw = result.winner === null;

    // Assignar cartes segons socket.id
    // Suposem que card1 és del primer jugador i card2 del segon
    // Aquí necessitem conèixer l'ordre dels jugadors
    // Com no el tenim, fem un truc: si guanyador és socket.id, la seva carta és card1, si no card2
    // Però això pot fallar si no tenim info de qui és qui
    // Per això assignem per defecte així:
    let myCard, oppCard;
    if (result.player1 === socket.id) { // <-- Aquest camp cal que el servidor el enviï!
        myCard = result.card1;
        oppCard = result.card2;
    } else if (result.player2 === socket.id) {
        myCard = result.card2;
        oppCard = result.card1;
    } else {
        // Si no tenim info, assignem arbitràriament:
        myCard = result.card1;
        oppCard = result.card2;
    }

    // Funció per ordenar cartes segons guanyador o perdedor
    function sortCards(cardA, cardB, ascending = true) {
        const valuesOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const indexA = valuesOrder.indexOf(cardA.value);
        const indexB = valuesOrder.indexOf(cardB.value);
        return ascending ? (indexA < indexB ? [cardA, cardB] : [cardB, cardA])
                         : (indexA > indexB ? [cardA, cardB] : [cardB, cardA]);
    }

    let cardsToShow;
    if (isWinner) {
        cardsToShow = sortCards(myCard, oppCard, false); // Carta alta primer
    } else if (isDraw) {
        cardsToShow = [myCard, oppCard];
    } else {
        cardsToShow = sortCards(myCard, oppCard, true); // Carta baixa primer
    }

    gameArea.innerHTML = `<h2>Resultat</h2>
                          <p>La teva carta: ${cardsToShow[0].value} de ${cardsToShow[0].suit}</p>
                          <p>La carta de l'altre jugador: ${cardsToShow[1].value} de ${cardsToShow[1].suit}</p>`;

    // Missatge d'estat
    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box');
    if (isWinner) {
        messageBox.classList.add('win');
        messageBox.innerHTML = '<strong>Has guanyat!</strong>';
    } else if (isDraw) {
        messageBox.classList.add('draw');
        messageBox.innerHTML = '<strong>Empat!</strong>';
    } else {
        messageBox.classList.add('lose');
        messageBox.innerHTML = '<strong>Has perdut!</strong>';
    }
    gameArea.appendChild(messageBox);

    // Botó per tornar a jugar
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Tornar a jugar';
    restartButton.onclick = () => {
        socket.emit('restartRound', { gameId });
        gameArea.innerHTML = '<p>Esperant a la nova ronda...</p>';
    };
    gameArea.appendChild(restartButton);

    addEndGameButton();
});

// Quan un jugador es desconnecta
socket.on('playerDisconnected', (data) => {
    gameArea.innerHTML = `<p>El jugador amb ID ${data.playerId} s'ha desconnectat. El joc ha acabat prematurament.</p>`;
});

// Quan la partida s’acaba
socket.on('gameEnded', () => {
    gameArea.innerHTML = '<p>La partida ha acabat. Tornant al lobby...</p>';
    gameId = null;
    lobby.style.display = 'block';
});
