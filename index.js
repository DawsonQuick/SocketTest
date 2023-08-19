const HTTP = require("http");
const WS = require("websocket").server;
const FS = require("fs");
const PATH = "public";
const MIMES = {
  "html": "text/html"
};
const RDI = {
  "/": "/index.html"
};

function send404(res) {
  res.writeHead(404, {
    'content-type': "text/html"
  });
  res.end('<!DOCTYPE html> <html><head><title>404</title></head><body>404 - Not Found</body></html>');
}

/**
 * @param {String} path path of file
 */
function getExtension(path) {
  let li = path.lastIndexOf('.') + 1;
  return path.slice(li);
}

function getMime(path) {
  return MIMES[getExtension(path)] || "text/plain";
}

const server = HTTP.createServer(function(req, res) {
  let reqpath = req.url;

  if (RDI.hasOwnProperty(reqpath)) {
    reqpath = RDI[reqpath];
  }

  console.log(PATH + reqpath);

  FS.readFile(PATH + reqpath, function(err, data) {
    if (err) {
      send404(res);
      return;
    }

    res.writeHead(200, {
      'content-type': getMime(reqpath)
    });

    res.end(data);
  });
});

server.listen(5000);

const CMDS = {
  move: 0,
  add: 1,
  remove: 2,
  mouseDown: 3,
  mouseUp: 4,
  colorChange: 5,
  clearCanvas: 6
};

const ws = new WS({
  httpServer: server
});

//Probably overkill, but creates a heartbeat to
//Keep all clients up to date with all other clients
const intervalID = setInterval(function() {
  for (const connection of ws.connections) {
    let code_ = Buffer.from([CMDS.add]),
    clientId_ = Buffer.from(
      new Uint16Array(
       [connection.clientId]
      ).buffer
   );
  //Creates the data of the color to be send to the server
  let dataPacket = new TextEncoder();
  dataPacket = dataPacket.encode(connection.data.color);

let pmsg = Buffer.concat(
  [code_, clientId_,
  ],
  code_.length + clientId_.length
);

wsSendAll(
  pmsg,
  connection.clientId
);
}
}, 1000)

function wsSendAll(data, exclude) {
  for (const connection of ws.connections) {
    //if (connection === exclude) continue;
    connection.sendBuffer.push(data);
  }
}

let uid = 0;

function flushSendBuffers() {
  for (const connection of ws.connections) {
    if (connection.sendBuffer.length === 0) continue;

    let size = 0;
    for (let msg of connection.sendBuffer) {
      size += msg.length;
      // console.log(msg.length, msg);
    }

    if (size === 0) continue;

    const buf = Buffer.concat(connection.sendBuffer, size);
    connection.sendBuffer.length = 0;

    // console.log(buf);

    connection.sendBytes(buf);
  }
}

setInterval(flushSendBuffers, 16);

//Function reads in the client, the clientsID, and the msg/data that the user sent in.
function parseData(client, clientId, msg) {
  let code = msg[0];

  //Create a switch statment for the msg/data being sent in to see what kind of message it is
  switch (code) {

    //If the msg was a clearCanvas then preform this task
    case CMDS.clearCanvas: {
      let code_ = Buffer.from([CMDS.clearCanvas]),
        clientId_ = Buffer.from(
          new Uint16Array(
            [clientId]
          ).buffer
        ),
        msg_ = msg.slice(1, 1 + 4 * Uint16Array.BYTES_PER_ELEMENT);

      let pmsg = Buffer.concat(
        [code_, clientId_, msg_],
        code_.length + clientId_.length + msg_.length
      );

      wsSendAll(
        pmsg,
        client
      );
      break;
    }
    //If the msg was a colorChange then preform this task
    case CMDS.colorChange: {

      let code_ = Buffer.from([CMDS.colorChange]),
        clientId_ = Buffer.from(
          new Uint16Array(
            [clientId]
          ).buffer
        ),
        msg_ = msg.slice(1, 1 + 4 * Uint16Array.BYTES_PER_ELEMENT);

      let pmsg = Buffer.concat(
        [code_, clientId_, msg_],
        code_.length + clientId_.length + msg_.length
      );

      wsSendAll(
        pmsg,
        client
      );
      let textDecoder = new TextDecoder();
      client.data.color = textDecoder.decode(msg_);
      break;
    }

    //If the msg was a mouseUp then preform this task
    case CMDS.mouseUp: {
      let code_ = Buffer.from([CMDS.mouseUp]),
        clientId_ = Buffer.from(
          new Uint16Array(
            [clientId]
          ).buffer
        ),
        msg_ = msg.slice(1, 1 + 2 * Uint16Array.BYTES_PER_ELEMENT);

      let pmsg = Buffer.concat(
        [code_, clientId_, msg_],
        code_.length + clientId_.length + msg_.length
      );

      wsSendAll(
        pmsg,
        client
      );

      let [plx, ply] = new Uint16Array(msg_.buffer.slice(1));
      client.data.x = plx;
      client.data.y = ply;

      break;
    }
    //If the msg was a mouseDown then preform this task
    case CMDS.mouseDown: {
      let code_ = Buffer.from([CMDS.mouseDown]),
        clientId_ = Buffer.from(
          new Uint16Array(
            [clientId]
          ).buffer
        ),
        msg_ = msg.slice(1, 1 + 2 * Uint16Array.BYTES_PER_ELEMENT);

      let pmsg = Buffer.concat(
        [code_, clientId_, msg_],
        code_.length + clientId_.length + msg_.length
      );

      wsSendAll(
        pmsg,
        client
      );

      let [plx, ply] = new Uint16Array(msg_.buffer.slice(1));
      client.data.x = plx;
      client.data.y = ply;

      break;
    }
  //If the msg was a move then preform this task
    case CMDS.move: {
      let code_ = Buffer.from([CMDS.move]),
        clientId_ = Buffer.from(
          new Uint16Array(
            [clientId]
          ).buffer
        ),
        msg_ = msg.slice(1, 1 + 2 * Uint16Array.BYTES_PER_ELEMENT);

      let pmsg = Buffer.concat(
        [code_, clientId_, msg_],
        code_.length + clientId_.length + msg_.length
      );

      wsSendAll(
        pmsg,
        client
      );

      let [plx, ply] = new Uint16Array(msg_.buffer.slice(1));
      client.data.x = plx;
      client.data.y = ply;

      break;
    }
  //If the msg was an add then preform this task
    case CMDS.add: {
      // send data to others
      let code_ = Buffer.from([CMDS.add]),
        codecolorChange_ = Buffer.from([CMDS.colorChange]),
        clientId_ = Buffer.from(
          new Uint16Array(
            [clientId]
          ).buffer
        );
        //Creates the data of the color to be send to all other clients
        let dataPacket = new TextEncoder();
        dataPacket = dataPacket.encode('black');     
      let pmsg = Buffer.concat(
        [code_, clientId_,
          codecolorChange_, clientId_, dataPacket,
        ],
        code_.length + clientId_.length +
        codecolorChange_.length + clientId_.length + dataPacket.length
      );

      wsSendAll(
        pmsg,
        client
      );

      // send others to client
      for (const connection of ws.connections) {
        if (connection === client) continue;

        let codeAdd_ = Buffer.from([CMDS.add]),
          codecolorChange_ = Buffer.from([CMDS.colorChange]),
          clientId_ = Buffer.from(
            new Uint16Array(
              [connection.clientId]
            ).buffer
          );
           //Creates the data of the color to be send to the client
          let dataPacket = new TextEncoder();
          dataPacket = dataPacket.encode(connection.data.color);     


        let pmsg = Buffer.concat(
          [
            codeAdd_, clientId_,
            codecolorChange_, clientId_, dataPacket,
          ],
          codeAdd_.length + clientId_.length +
          codecolorChange_.length + clientId_.length + dataPacket.length
        );

        client.sendBuffer.push(pmsg);
      }

      break;
    }
  //If the msg was a remove then preform this task
    case CMDS.remove: {
      let code_ = Buffer.from([CMDS.remove]),
        clientId_ = Buffer.from(
          new Uint16Array(
            [clientId]
          ).buffer
        );

      let pmsg = Buffer.concat(
        [code_, clientId_],
        code_.length + clientId_.length
      );

      wsSendAll(
        pmsg,
        client
      );
      break;
    }
  }
}

ws.on("request", function(req) {
  const client = req.accept(null, req.origin);
  const clientId = uid++;
  console.log("new client");

  client.sendBuffer = [];
  client.data = {
    x: 0,
    y: 0,
    color: 0
  };
  client.clientId = clientId;

  parseData(client, clientId, [CMDS.add]);

  client.on("message", function(msg) {
    if (msg.type === 'binary') {
      parseData(client, clientId, msg.binaryData);
    }
  });
  client.on("close", function() {
    parseData(client, clientId, [CMDS.remove]);
    console.log("client disconnected");
  });
});