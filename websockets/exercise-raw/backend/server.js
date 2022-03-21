import http from "http";
import handler from "serve-handler";
import nanobuffer from "nanobuffer";

// these are helpers to help you deal with the binary data that websockets use
import objToResponse from "./obj-to-response.js";
import generateAcceptValue from "./generate-accept-value.js";
import parseMessage from "./parse-message.js";

let connections = [];
const msg = new nanobuffer(50);
const getMsgs = () => Array.from(msg).reverse();

msg.push({
    user: "elad",
    text: "hi",
    time: Date.now(),
});

// serve static assets
const server = http.createServer((request, response) => {
    return handler(request, response, {
        public: "./frontend",
    });
});

// Connecting the server to the websocket
server.on("upgrade", (req, socket) => {
    // upgrade the socket to a websocket
    if (req.headers["upgrade"] !== "websocket") {
        socket.end("HTTP/1.1 400 Bad Request");
        return;
    }

    const acceptKey = req.headers["sec-websocket-key"];
    const acceptValue = generateAcceptValue(acceptKey);

    const headers = [
        "HTTP/1.1 101 Web Socket Protocol Handshake",
        `Upgrade: websocket`,
        `Connection: Upgrade`,
        `Sec-WebSocket-Accept: ${acceptValue}`,
        "Sec-WebSocket-Protocol: json",
        "\r\n",
    ];

    // 2 times "\r\n" in the headers signlas the browser that the headers have ended
    socket.write(headers.join("\r\n"));
    socket.write(objToResponse({ msg: getMsgs() }));

    connections.push(socket);

    socket.on("data", (buffer) => {
        const message = parseMessage(buffer);
        if (message) {
            msg.push({
                user: message.user,
                text: message.text,
                time: Date.now(),
            });

            connections.forEach((socket) => {
                socket.write(objToResponse({ msg: getMsgs() }));
            });
        } else if (message === null) {
            socket.end();
        }
    });

    socket.on("end", () => {
        connections = connections.filter((conn) => conn !== socket);
    });

    console.log("upgrade requested");
});

const port = process.env.PORT || 8080;
server.listen(port, () =>
    console.log(`Server running at http://localhost:${port}`)
);
