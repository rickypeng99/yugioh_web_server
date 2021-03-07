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

  seeking_match(socket)
  

});

const sending_deck = (socket, data) => {
    console.log(data.opponent_id)
    io.to(data.opponent_id).emit("receive_deck", {
        deck: data.deck,
    })
}

const seeking_match = (socket) => {
    let has_space = false

  for (const key of Object.keys(matched_ids)) {
      if (!matched_ids[key]) {
          has_space = true
          matched_ids[key] = socket.id

          //notify both players that they are matched with each other
          io.to(key).emit("matched", {
              opponent: socket.id,
          })
          io.to(socket.id).emit("matched", {
              opponent: key
          })
          break
      }
  }

  if (!has_space) {
    // start to wait for a potential match
    matched_ids[socket.id] = false
  }
}