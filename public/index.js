/** @type {HTMLCanvasElement} */
const C = document.getElementById("c");
C.width = window.innerWidth;
C.height = window.innerHeight;
var boundings = C.getBoundingClientRect();
/** @type {CanvasRenderingContext2D} */
const X = C.getContext("2d");

//Player state variables
isDrawing = false;
toggleBeginning = false;

//data for the user
color = 'red';
XOffSet = 0;
YOffSet = 0;

//List of all the valid commands and their corresponding numerical value
const CMDS = {
  move: 0,
  add: 1,
  remove: 2,
  mouseDown: 3,
  mouseUp: 4,
  colorChange: 5,
  clearCanvas: 6
};

//Defines that sizes of the corresponding messages from the CMDS
const TYPES = {
  0: [Uint16Array, 3],
  1: [Uint16Array, 1],
  2: [Uint16Array, 1],
  3: [Uint16Array, 3],
  4: [Uint16Array, 3],
  5: [Uint8Array, 10],
  6: [Uint8Array, 3],
};

//Definition of the "Player Class"
class Player {
  constructor(id) {
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.color = "";
  }

}

/** @type {Player[]} */
const players = [];

let loney = true;
let socketOpen = false;
let serverMove = false;

function reqanf() {
  for (let player of players) {
    player.draw();
  }
  requestAnimationFrame(reqanf);
}

//------------------------------------------------------------------------------------------------------------------------
reqanf();
// Mouse Down Event
C.addEventListener("mousedown", function(event) {

  isDrawing = true;

  // Start Drawing
  X.beginPath();
  X.moveTo(event.clientX - boundings.left, event.clientY - boundings.top);

});

C.addEventListener("mousemove", function(e) {
  if (socketOpen && isDrawing) {
    if (!toggleBeginning) {
      let test = new Int16Array(2);
      test[0] = e.layerX;
      test[1] = e.layerY;

      let codeTest = new Uint8Array(1);
      codeTest[0] = CMDS.mouseDown;
      let dataTest = new Blob([codeTest, test]);
      socket.send(dataTest);
      toggleBeginning = true;
    }
    let buf = new Int16Array(2);
    buf[0] = e.layerX;
    buf[1] = e.layerY;

    let code = new Uint8Array(1);
    code[0] = CMDS.move;

    let data = new Blob([code, buf]);
    X.fillStyle = "#1f1f1f";
    if(serverMove) X.moveTo(e.clientX - boundings.left, e.clientY - boundings.top);
    X.lineTo(e.clientX - boundings.left, e.clientY - boundings.top);
    X.strokeStyle = color;
    X.stroke();
    serverMove = false;
    socket.send(data);
  }
});
// Mouse Up Event
C.addEventListener('mouseup', function(e) {
  isDrawing = false;
  toggleBeginning = false;
});



// Handle Colors
var colors = document.getElementsByClassName('colors')[0];

colors.addEventListener('click', function(event) {
  color = event.target.value || 'black';

  //Creates the data of the color to be send to the server
  let dataPacket = new TextEncoder();
  dataPacket = dataPacket.encode(event.target.value);

  //Creates the type of command that is being sent to the server
  let commandPacket = new Uint8Array(1);
  commandPacket[0] = CMDS.colorChange;

  let completePacket = new Blob([commandPacket, dataPacket]);
  socket.send(completePacket);
});

var clear = document.getElementsByClassName('clear')[0];
clear.addEventListener('click', function(event) {
  //Clears the local instance of the canvas
  X.clearRect(0, 0, C.width, C.height);

  //Creates a packet to send a clear command to the server
  let commandPacket = new Uint8Array(1);
  commandPacket[0] = CMDS.clearCanvas;
  let completePacket = new Blob([commandPacket]);
  socket.send(completePacket);
});

//------------------------------------------------------------------------------------------------------------------------





//------------------------------------------------------------------------------------------------------------------------
const socket = new WebSocket(location.href.replace("http", "ws"));

/**
 * @param {ArrayBuffer} ar arraybuffer to parse
 */
function* packetParserGen(ar) {
  let offset = 0,
    uint8 = new Uint8Array(ar);

  while (offset < ar.byteLength) {
    const code = uint8[offset];
    const [dataType, dataSize] = TYPES[code];
    const elementSize = dataType.BYTES_PER_ELEMENT;
    const data = ar.slice(offset + 1, offset + 1 + elementSize * dataSize);

    offset += 1 + elementSize * dataSize;
    yield {
      code: code,
      data: new dataType(data)
    };
  }
}

function parseMessage(ar) {
  const packetParser = packetParserGen(ar);
  let val;
  while (val = packetParser.next().value) {
    parsePacket(val.code, val.data);
  }
}

localLock = true;

//This is the local copy of the data parser when it receives commands from the server
function parsePacket(code, data) {

  switch (code) {
    case CMDS.clearCanvas: {
      X.clearRect(0, 0, C.width, C.height);
      break;
    }
    case CMDS.colorChange: {
      console.log(data);
      console.log("new color change", data[0]);
      let player = players.find(e => e.id == data[0]);
      let textDecoder = new TextDecoder();
      var data = data.slice(2);
      data = textDecoder.decode(data);
      player.color = data;
      break;
    }
    case CMDS.mouseDown: {
      if (localLock) {
        X.beginPath();
        X.moveTo(player.x - boundings.left, player.y - boundings.top);
        localLock = false;
      }

      break;
    }
    case CMDS.move: {
      let player = players.find(e => e.id == data[0]);
      if (!player) {
        console.warn("Tried to move non-existant player", data[0]);
        return;
      }
      player.x = data[1];
      player.y = data[2];
      
      if(!serverMove) X.moveTo(player.x - boundings.left, player.y - boundings.top);
      serverMove = true;
      X.lineTo(player.x - boundings.left, player.y - boundings.top);
      X.strokeStyle = player.color;
      X.stroke();
      break;
    }

    case CMDS.add: {
      console.log(data);
      console.log("new", data[0]);
      const playerWithId = players.find(e => e.id == data[0]);

    if (!playerWithId) {
      players.push(new Player(data[0]));
    }
      loney = false;
      break;
    }

    case CMDS.remove: {
      console.log("remove", data[0]);
      let player = players.findIndex(e => e.id == data[0]);
      if (player < 0) {
        console.warn("Tried to remove non-existant player", data[0]);
        return;
      }

      if (players.length <= 0) {
        loney = true;
      }
      break;
    }

  }
}

//------------------------------------------------------------------------------------------------------------------------
socket.addEventListener("message", function(e) {
  const fr = new FileReader();

  fr.readAsArrayBuffer(e.data);
  fr.addEventListener("load", function() {
    parseMessage(fr.result);
  });
});

socket.addEventListener("open", function(e) {
  setTimeout(function() {
    socketOpen = true;
  }, 75); // give some time for the socket to send data
});

//------------------------------------------------------------------------------------------------------------------------