const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

let games = {}; // Emmagatzema les partides en curs

// Serveix fitxers estàtics de la carpeta 'public'
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('Un jugador s\'ha connectat:', socket.id);

    socket.on('joinGame', (gameId) => {
        if (!games[gameId]) {
            games[gameId] = { players: [], waitingQueue: [], cards: {} };
        }

        // Si la partida ja té 2 jugadors, el jugador nou s'ha d'esperar
        if (games[gameId].players.length < 2) {
            games[gameId].players.push(socket.id);
            socket.join(gameId);

            // Quan hi ha 2 jugadors, repartir les cartes
            if (games[gameId].players.length === 2) {
                let cards = generateDeck();
                games[gameId].cards = {
                    [games[gameId].players[0]]: cards.splice(0, 5),
                    [games[gameId].players[1]]: cards.splice(0, 5),
                };
                io.to(gameId).emit('gameStart', games[gameId].cards);
            }
        } else {
            // Afegir a la cua d'espera
            games[gameId].waitingQueue.push(socket.id);
            socket.emit('waitingForPlayers', 'Estàs a l\'espera d\'un altre jugador per començar la partida.');
        }
    });

    socket.on('pickCard', (data) => {
        const { gameId, cardIndex } = data;
        const game = games[gameId];

        if (game) {
            if (!game.chosenCards) game.chosenCards = {};
            game.chosenCards[socket.id] = game.cards[socket.id][cardIndex];
            if (Object.keys(game.chosenCards).length === 2) {
                const winner = determineWinner(game.chosenCards);
                io.to(gameId).emit('gameResult', winner);
                // Netejar les cartes triades per la següent ronda
                game.chosenCards = {};
            }
        }
    });


    // Quan es fa clic en el botó de reiniciar ronda
    socket.on('restartRound', (data) => {
        const { gameId } = data;
        const game = games[gameId];

        if (game) {
            let cards = generateDeck();
            game.cards = {
                [game.players[0]]: cards.splice(0, 5),
                [game.players[1]]: cards.splice(0, 5),
            };
            io.to(gameId).emit('gameStart', game.cards); // Repartir novament les cartes
        }
    });

socket.on('endGame', (gameId) => {
    if (games[gameId]) {
        io.to(gameId).emit('gameEnded');
        delete games[gameId];
        console.log(`Partida ${gameId} finalitzada per un jugador.`);
    }
});

    socket.on('disconnect', () => {
        console.log('Un jugador s\'ha desconnectat:', socket.id);
        // Avís als altres jugadors
        io.emit('playerDisconnected', { playerId: socket.id });

        // Quan un jugador es desconnecta, es pot intentar emparellar a un altre jugador de la cua d'espera
        for (const gameId in games) {
            const game = games[gameId];
            if (game.waitingQueue.length > 0) {
                const waitingPlayer = game.waitingQueue.shift();
                game.players.push(waitingPlayer);
                io.to(waitingPlayer).emit('gameStart', generateDeck()); // S'inicia la partida per aquest jugador
            }

            // Si el jugador desconnectat estava jugant a aquesta partida, l'eliminem
            const playerIndex = game.players.indexOf(socket.id);
            if (playerIndex !== -1) {
                game.players.splice(playerIndex, 1);
            }
        }
    });
});

// Funció per generar el mazo de cartes
function generateDeck() {
    const suits = ['Cors', 'Diamants', 'Trèvols', 'Piques'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    suits.forEach(suit => {
        values.forEach(value => {
            deck.push({ suit, value });
        });
    });
    return shuffle(deck);
}

// Funció per barrejar el mazo de cartes
function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

// Funció per determinar el guanyador
function determineWinner(chosenCards) {
    const valuesOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const [player1, player2] = Object.keys(chosenCards);
    const [card1, card2] = [chosenCards[player1], chosenCards[player2]];

    const index1 = valuesOrder.indexOf(card1.value);
    const index2 = valuesOrder.indexOf(card2.value);

    if (index1 > index2) return { winner: player1, card1, card2 };
    if (index2 > index1) return { winner: player2, card1, card2 };
    return { winner: null, card1, card2 };
}

server.listen(3000, () => {
    console.log('Servidor escoltant al port 3000');
});
