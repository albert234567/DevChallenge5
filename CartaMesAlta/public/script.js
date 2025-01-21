const socket = io();
const gameId = prompt("Introdueix el nom del joc (o crea'n un nou):");

socket.emit('joinGame', gameId);

socket.on('gameStart', (cards) => {
    const gameArea = document.getElementById('gameArea');
    
    // Esborrar text previ
    gameArea.innerHTML = '';

    cards[socket.id].forEach((card, index) => {
        const cardElem = document.createElement('div');
        cardElem.classList.add('card');

        // Assignar la imatge en funció de l'índex o alguna propietat del card object
        const img = document.createElement('img');
        img.src = `images/carta${index + 1}.png`; // Assegura't que les imatges segueixen el format carta1.png, carta2.png, etc.
        img.alt = 'Carta';

        cardElem.appendChild(img);

        cardElem.onclick = () => {
            socket.emit('pickCard', { gameId, cardIndex: index });
            selectCard(cardElem);  // Marcar la carta com seleccionada
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

    // Reiniciar el joc per una nova ronda
    setTimeout(() => {
        socket.emit('restartRound', { gameId });
    }, 7000);
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
