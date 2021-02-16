const crypto = require("crypto"),SHA256 = message=>crypto.createHash("sha256").update(message).digest("hex");
const EC = require("elliptic").ec,ec = new EC("secp256k1");
const {Block,Blockchain,Transaction,myChain} = require("./block.js")

const MINT_PRIVATE_ADDRESS = ""
// Import the package
const WS = require("ws");
// Create a server
const server = new WS.Server({ port: "8080" });
// Listens for connections
server.on("connection", async (socket, req) => {
    // This event handler will be triggered every time somebody send us connections
});
// Get the socket from an address
const socket = new WS("SOME ADDRESS");
// Open a connection
socket.on("open", () => {
    // This event handler will be triggered when a connection is opened
})
// Close a connection
socket.on("close", () => {
    // This event handler will be triggered when the connection is closed
})
// Listens for messages
socket.on("message", message => {
    // "message" is message, yes
})