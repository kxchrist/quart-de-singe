const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let lobbies = {};

function generateCode(){
  return Math.floor(1000 + Math.random()*9000).toString();
}

io.on("connection", (socket)=>{

  let currentLobby = null;

  // créer lobby
  socket.on("createLobby",(name)=>{

    const code = generateCode();

    lobbies[code] = {
      players: [{
        id: socket.id,
        name: name,
        quart: 0,
        shots: 0
      }]
    };

    currentLobby = code;

    socket.join(code);

    socket.emit("lobbyCode",code);

    io.to(code).emit("updatePlayers",lobbies[code].players);

  });

  // rejoindre lobby
  socket.on("joinLobby",({code,name})=>{

    if(!lobbies[code]){

      socket.emit("errorMessage","Lobby introuvable");

      return;

    }

    lobbies[code].players.push({
      id: socket.id,
      name: name,
      quart: 0,
      shots: 0
    });

    currentLobby = code;

    socket.join(code);

    io.to(code).emit("updatePlayers",lobbies[code].players);

  });

  // lancer partie
  socket.on("startGame",()=>{

    if(!currentLobby) return;

    io.to(currentLobby).emit("startGame",lobbies[currentLobby].players);

  });

  // ajouter quart
  socket.on("addQuart",(i)=>{

    if(!currentLobby) return;

    let players = lobbies[currentLobby].players;

    if(players[i].quart >= 4) return;

    players[i].quart++;
    players[i].shots++;

    io.to(currentLobby).emit("updateGame",players);

  });

  // déconnexion
  socket.on("disconnect",()=>{

    if(!currentLobby) return;

    let lobby = lobbies[currentLobby];

    if(!lobby) return;

    lobby.players =
      lobby.players.filter(p=>p.id !== socket.id);

    io.to(currentLobby).emit("updatePlayers",lobby.players);

  });

});

server.listen(process.env.PORT || 3000, ()=>{
  console.log("Serveur lancé");
});