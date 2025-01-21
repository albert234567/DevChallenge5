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
            games[gameId] = { players: [], cards: {} };
        }
        if (games[gameId].players.length < 2) {
            games[gameId].players.push(socket.id);
            socket.join(gameId);

            // Repartir cartes si ja hi ha dos jugadors
            if (games[gameId].players.length === 2) {
                let cards = generateDeck();
                games[gameId].cards = {
                    [games[gameId].players[0]]: cards.splice(0, 5),
                    [games[gameId].players[1]]: cards.splice(0, 5),
                };
                io.to(gameId).emit('gameStart', games[gameId].cards);
            }
        } else {
            socket.emit('gameFull', 'El joc ja està ple.');
        }
    });

    socket.on('pickCard', (data) => {
        const { gameId, cardIndex } = data;
        const game = games[gameId];

        if (game) {
            game.cards[socket.id].chosenCard = game.cards[socket.id][cardIndex];
            if (Object.values(game.cards).every(cards => cards.chosenCard !== undefined)) {
                const winner = determineWinner(game.cards);
                io.to(gameId).emit('gameResult', winner);
            }
        }
    });

    socket.on('restartRound', (data) => {
        const { gameId } = data;
        const game = games[gameId];

        if (game) {
            // Torna a repartir les cartes per una nova ronda
            let cards = generateDeck();
            game.cards = {
                [game.players[0]]: cards.splice(0, 5),
                [game.players[1]]: cards.splice(0, 5),
            };
            io.to(gameId).emit('gameStart', game.cards);
        }
    });

    socket.on('disconnect', () => {
        console.log('Un jugador s\'ha desconnectat:', socket.id);
        // Avís als altres jugadors
        io.emit('playerDisconnected', { playerId: socket.id });
    });
});

function generateDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    let deck = [];
    suits.forEach(suit => {
        values.forEach(value => {
            deck.push({ suit, value });
        });
    });
    return shuffle(deck);
}

function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function determineWinner(cards) {
    const valuesOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const [player1, player2] = Object.keys(cards);
    const [card1, card2] = [cards[player1].chosenCard, cards[player2].chosenCard];

    const index1 = valuesOrder.indexOf(card1.value);
    const index2 = valuesOrder.indexOf(card2.value);

    if (index1 > index2) return { winner: player1, card1, card2 };
    if (index2 > index1) return { winner: player2, card1, card2 };
    return { winner: null, card1, card2 }; // Empat
}

server.listen(3000, () => {
    console.log('Servidor escoltant al port 3000');
});
