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
    gameArea.innerHTML = `<p>Has creat la partida amb codi <strong>${gameId}</strong>. Esperant a un altre jugador...</p>`;
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

// Aquí pots seguir afegint la resta dels handlers de socket.on com ara gameStart, gameResult, etc.
// Exemple:
socket.on('waitingForPlayers', (message) => {
    gameArea.innerHTML = `<p>${message}</p>`;
});

// ...resta del codi que ja tens per gestionar el joc (gameStart, gameResult, etc.)


socket.on('gameStart', (cards) => {
    const gameArea = document.getElementById('gameArea');
    gameArea.innerHTML = ''; // Esborrar missatges previs

    cards[socket.id].forEach((card, index) => {
        const cardElem = document.createElement('div');
        cardElem.classList.add('card');
        
        const img = document.createElement('img');
        img.src = `images/poker.png`; // Comprovar que les imatges estan correctes
        img.alt = 'Carta';

        cardElem.appendChild(img);

        cardElem.onclick = () => {
            socket.emit('pickCard', { gameId, cardIndex: index });
            selectCard(cardElem); // Marcar la carta com seleccionada
        };
        gameArea.appendChild(cardElem);
    });
});

socket.on('gameResult', (result) => {
    const gameArea = document.getElementById('gameArea');
    gameArea.innerHTML = `<h2>Resultat</h2>
                          <p>La teva carta: ${result.card1.value} de ${result.card1.suit}</p>
                          <p>La carta de l'altre jugador: ${result.card2.value} de ${result.card2.suit}</p>`;

    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box');
    if (result.winner === socket.id) {
        messageBox.classList.add('win');
        messageBox.innerHTML = '<strong>Has guanyat!</strong>';
    } else if (result.winner === null) {
        messageBox.classList.add('draw');
        messageBox.innerHTML = '<strong>Empat!</strong>';
    } else {
        messageBox.classList.add('lose');
        messageBox.innerHTML = '<strong>Has perdut!</strong>';
    }
    gameArea.appendChild(messageBox);

    // Afegir botó per reiniciar la partida
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Tornar a jugar';
    restartButton.onclick = () => {
        socket.emit('restartRound', { gameId });
        gameArea.innerHTML = '<p>Esperant a la nova ronda...</p>'; // Mostra un missatge d'espera
    };
    gameArea.appendChild(restartButton);
});

// Quan un jugador es desconnecta
socket.on('playerDisconnected', (data) => {
    const gameArea = document.getElementById('gameArea');
    gameArea.innerHTML = `<p>El jugador amb ID ${data.playerId} s'ha desconnectat. El joc ha acabat prematurament.</p>`;
});

// Funció per marcar una carta com seleccionada
function selectCard(cardElem) {
    const selectedCards = document.querySelectorAll('.card.selected');
    selectedCards.forEach(card => card.classList.remove('selected'));
    cardElem.classList.add('selected');
}

// Afegir botó d'acabar partida després de mostrar resultat o quan comença la partida
function addEndGameButton() {
    const endGameBtn = document.createElement('button');
    endGameBtn.textContent = 'Acabar partida';
    endGameBtn.onclick = () => {
        socket.emit('endGame', gameId);
    };
    gameArea.appendChild(endGameBtn);
}

// Quan comença la partida, afegir el botó d'acabar partida
socket.on('gameStart', (cards) => {
    gameArea.innerHTML = ''; // Esborrar missatges previs

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

    addEndGameButton();  // Afegim el botó quan comença la partida
});

socket.on('gameResult', (result) => {
    gameArea.innerHTML = `<h2>Resultat</h2>
                          <p>La teva carta: ${result.card1.value} de ${result.card1.suit}</p>
                          <p>La carta de l'altre jugador: ${result.card2.value} de ${result.card2.suit}</p>`;

    const messageBox = document.createElement('div');
    messageBox.classList.add('message-box');
    if (result.winner === socket.id) {
        messageBox.classList.add('win');
        messageBox.innerHTML = '<strong>Has guanyat!</strong>';
    } else if (result.winner === null) {
        messageBox.classList.add('draw');
        messageBox.innerHTML = '<strong>Empat!</strong>';
    } else {
        messageBox.classList.add('lose');
        messageBox.innerHTML = '<strong>Has perdut!</strong>';
    }
    gameArea.appendChild(messageBox);

    // Botó per reiniciar la partida
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Tornar a jugar';
    restartButton.onclick = () => {
        socket.emit('restartRound', { gameId });
        gameArea.innerHTML = '<p>Esperant a la nova ronda...</p>';
    };
    gameArea.appendChild(restartButton);

    addEndGameButton();  // També afegim el botó aquí després del resultat
});

// Gestionar resposta del servidor quan la partida s’acaba
socket.on('gameEnded', () => {
    gameArea.innerHTML = '<p>La partida ha acabat. Tornant al lobby...</p>';
    gameId = null;
    // Mostrar el lobby de nou
    lobby.style.display = 'block';
});
