const io = require("socket.io")(4001, {
    // handling CORS
    cors: {
        origin: '*',
      }
});

const matched_ids = {}
const match_meta = {}

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

  /**
   * monster related
   */
  socket.on("summon", (data) => {
    sending_summon(socket, data)
  })

  socket.on("attack_start", (data) => {
    sending_attack_start(socket, data)
  })

  socket.on("attack_ack", (data) => {
    sending_attack_ack(socket, data)
  })


  socket.on("change_phase", (data) => {
    sending_change_phase(socket, data)
  })

  // socket.on("tribute", (data) => {
  //   sending_tribute(socket, data)
  // })

   socket.on("move_card_to_graveyard", (data) => {
    sending_move_card_to_graveyard(socket, data)
  })

  socket.on('activate_effect', (data) => {
    const opponent = matched_ids[socket.id]
    const unique_id = get_match_unique_id(socket.id, opponent)

    data.owner = socket.id

    if (match_meta[unique_id].effect.chain_stack) {
      match_meta[unique_id].effect.chain_stack.push(data)
    } else {
      match_meta[unique_id].effect.chain_stack = [data]
    }

    sending_card_activate(socket, data)

  })

  socket.on('effect_ack', (data) => {
    const opponent = matched_ids[socket.id]
    const unique_id = get_match_unique_id(socket.id, opponent)
    console.log("ack " + socket.id)

    if (match_meta[unique_id].effect.ack) {
      match_meta[unique_id].effect.ack[socket.id] = true
      if (match_meta[unique_id].effect.ack[opponent]) {

        match_meta[unique_id].effect.ack = {}

        // send operation
        sending_card_operate(unique_id)
      } 
    } else {
      match_meta[unique_id].effect.ack = {}
      match_meta[unique_id].effect.ack[socket.id] = true
  
      // TODO: send topmost card back
      sending_opponent_effect_ack(socket, data)
    }
  })

  socket.on('card_finish_operate', (data) => {
    // sending_opponent_card_operate(socket, data)
    
    const opponent = matched_ids[socket.id]
    const unique_id = get_match_unique_id(socket.id, opponent)

    if (match_meta[unique_id].effect.chain_stack.length > 0) {
      sending_card_operate(unique_id)
    } else {
      
      // reset the current effect chainings to default
      match_meta[unique_id].effect = {}
      sending_final_ack(socket, data)
    }
  })
  seeking_match(socket)
});



// SENDING functions

const sending_move_card_to_graveyard = (socket, data) => {
  io.to(matched_ids[socket.id]).emit("opponent_move_card_to_graveyard", {
    data: data
  })
}

// const sending_tribute = (socket, data) => {
//   io.to(matched_ids[socket.id]).emit("opponent_tribute", {
//     data: data
//   })
// }

const sending_change_phase = (socket, data) => {
  io.to(matched_ids[socket.id]).emit("opponent_change_phase", {
    data: data
  })
}

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

const sending_attack_start = (socket, data) => {
  io.to(matched_ids[socket.id]).emit("opponent_attack_start", {
    data: data
  })
}

const sending_attack_ack = (socket, data) => {
  io.to(matched_ids[socket.id]).emit("opponent_attack_ack", {
    data: data
  })
}

const sending_card_activate = (socket, data) => {
  io.to(matched_ids[socket.id]).emit("opponent_card_activate", {
    data: data
  })
}

const sending_opponent_effect_ack = (socket, data) => {
  io.to(matched_ids[socket.id]).emit("opponent_effect_ack", {
    data: data
  })
}

const sending_card_operate = (mactch_id) => {
  const topMost = match_meta[mactch_id].effect.chain_stack.pop()
  console.log(topMost)
  io.to(topMost.owner).emit("card_operate", {
    data: topMost
  })
}

// const sending_opponent_card_operate = (socket, data) => {
//   io.to(matched_ids[socket.id]).emit("opponent_card_operate", {
//     data: data
//   })
// }

// all chainings within this round of effect's activation is finished
const sending_final_ack = (socket, data) => {
  io.to(socket.id).emit("final_ack", {
    data: data
  })
  io.to(matched_ids[socket.id]).emit("final_ack", {
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
          // a dictionary to record info for the match
          match_meta[get_match_unique_id(key, socket.id)] = {
            effect: {} // to deal with current effect chainings
          }
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

const get_match_unique_id = (player1, player2) => {
  let players = [player1, player2]
  players.sort((a, b) => a.localeCompare(b))
  return players.join('-')
}