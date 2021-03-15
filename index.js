const io = require("socket.io")(4001, {
    // handling CORS
    cors: {
        origin: '*',
      }
});

const matched_ids = {}

io.on("connection", socket => {
  // either with send()
  socket.send(`Hello ${socket.id} from the server!`);

  // handle the event sent with socket.send()
  socket.on("message", (data) => {
    console.log(data);
  });

  socket.on("exchange_deck", (data) => {
    sending_deck(socket, data)
  })

  socket.on("summon", (data) => {
    sending_summon(socket, data)
  })

  seeking_match(socket)

  
  

});

const sending_deck = (socket, data) => {
    io.to(matched_ids[socket.id]).emit("receive_deck", {
        deck: data.deck,
    })
}

const sending_summon = (socket, data) => {
  io.to(matched_ids[socket.id]).emit("opponent_summon", {
    data: data
  })
}

const seeking_match = (socket) => {
    let has_space = false

  for (const key of Object.keys(matched_ids)) {
      if (!matched_ids[key]) {
          has_space = true
          matched_ids[key] = socket.id
          matched_ids[socket.id] = key

          //decides who starts first
          const both_players = [socket.id, key]
          const player_starts = both_players[Math.floor(Math.random() * both_players.length)];

          //notify both players that they are matched with each other
          io.to(key).emit("matched", {
              my_id: key,
              opponent: socket.id,
              player_starts: player_starts
          })
          io.to(socket.id).emit("matched", {
              my_id: socket.id,
              opponent: key,
              player_starts: player_starts
          })
          break
      }
  }

  if (!has_space) {
    // start to wait for a potential match
    matched_ids[socket.id] = false
  }
}