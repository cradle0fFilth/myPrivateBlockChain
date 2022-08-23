const crypto = require("crypto"),SHA256 = message=>crypto.createHash("sha256").update(message).digest("hex");
const EC = require("elliptic").ec,ec = new EC("secp256k1");

//const keyPair = ec.genKeyPair();
//public key: keyPair.getPublic("hex");
//private ley:leyPair.getPrivate("hex");
const MINT_KEY_PAIR = ec.genKeyPair();
const MINT_PUBLIC_ADDRESS = MINT_KEY_PAIR.getPublic("hex");
const holderKeyPair = ec.genKeyPair();

class Block {
    constructor(timestamp = "", data = []) {
        this.timestamp = timestamp;
        this.data = data;
        this.hash = this.getHash();
        this.prevHash = ""; // previous block's hash
        this.nonce = 0;
    }

    // Our hash function.
    getHash() {
        return SHA256(this.prevHash + this.timestamp + JSON.stringify(this.data) + this.nonce);
    }

    mine(difficulty) {
        // Basically, it loops until our hash starts with 
        // the string 0...000 with length of <difficulty>.
        while (!this.hash.startsWith(Array(difficulty + 1).join("0"))) {
            // We increases our nonce so that we can get a whole different hash.
            this.nonce++;
            // Update our new hash with the new nonce value.
            this.hash = this.getHash();
        }
    }
    
    hasValidTransactions(chain) {
        let gas = 0, reward = 0;

        this.data.forEach(transaction => {
            if (transaction.from !== MINT_PUBLIC_ADDRESS) {
                gas += transaction.gas;
            } else {
                reward = transaction.amount;
            }
        });

        return (
            reward - gas === chain.reward &&
            this.data.every(transaction => transaction.isValid(transaction, chain)) && 
            this.data.filter(transaction => transaction.from === MINT_PUBLIC_ADDRESS).length === 1
        );
    }
}

//blockchain is a list of block
class Blockchain{
    
    constructor(){
        // We will release 100000 coin
        const initalCoinRelease = new Transaction(MINT_PUBLIC_ADDRESS, holderKeyPair.getPublic("hex"), 100000);
        this.chain = [new Block(Date.now().toString(), [initalCoinRelease])];
        this.difficulty = 1;
        this.blockTime = 30000;
        //transaction pool
        this.transactions = [];
        this.reward = 77;
    }

    getLastBlock(){
        return this.chain[this.chain.length-1];
    }

    getBalance(address) {
        let balance = 0;

        //traverse all transactions and calculate the balance.
        this.chain.forEach(block => {
            block.data.forEach(transaction => {
                // Because if you are the sender, you are sending money away, so your balance will be decremented.
                if (transaction.from === address) {
                    balance -= transaction.amount;
                    balance -= transaction.gas
                }

                // But if you are the receiver, you are receiving money, so your balance will be incremented.
                if (transaction.to === address) {
                    balance += transaction.amount;
                }
            })
        });

        return balance;
    }

    addBlock(block) {
        block.prevHash = this.getLastBlock().hash;
        block.hash = block.getHash();
        block.mine(this.difficulty);
        this.chain.push(Object.freeze(block));

        this.difficulty += Date.now()-parseInt(this.getLastBlock().timestamp) < this.blockTime? 1 : -1;
    }

    // add to transaction pool
    addTransaction(transaction) {
        if (transaction.isValid(transaction, this)) {
            this.transactions.push(transaction);
        }
    }

    // reward address is miner address
    mineTransactions(rewardAddress) {
        let gas = 0;

        this.transactions.forEach(transaction => {
            gas += transaction.gas;
        });

        const rewardTransaction = new Transaction(MINT_PUBLIC_ADDRESS, rewardAddress, this.reward + gas);
        rewardTransaction.sign(MINT_KEY_PAIR);

        // Prevent people from minting coins and mine the minting transaction.
        // pass transaction pool to block and clean the transactionp pool
        // also create a reward transaction to reward miner
        // block data has a list of transaction
        if (this.transactions.length !== 0) this.addBlock(new Block(Date.now().toString(), [rewardTransaction, ...this.transactions]));

        this.transactions = [];
    }

    isValid(blockchain = this) {
        // Iterate over the chain, we need to set i to 1 because there are nothing before the genesis block, so we start at the second block.
        for (let i = 1; i < blockchain.chain.length; i++) {
            const currentBlock = blockchain.chain[i];
            const prevBlock = blockchain.chain[i-1];

            // Check validation
            if (currentBlock.hash !== currentBlock.getHash() || prevBlock.hash !== currentBlock.prevHash|| !currentBlock.hasValidTransactions(blockchain)) {
                return false;
            }
        }

        return true;
    }

}

class Transaction{
    constructor(from,to,amount,gas = 0){
        this.from = from;
        this.to = to;
        this.amount = amount;
        this.gas = gas;
    }

    sign(keyPair) {
        // Check if the public key matches the "from" address of the transaction
        if (keyPair.getPublic("hex") === this.from) {
            // Sign the transaction
            this.signature = keyPair.sign(SHA256(this.from + this.to + this.amount+this.gas), "base64").toDER("hex");
        }
    }

    isValid(tx, chain) {
        return (
            tx.from &&
            tx.to &&
            tx.amount &&
            (chain.getBalance(tx.from) >= tx.amount + tx.gas || tx.from === MINT_PUBLIC_ADDRESS) &&
            ec.keyFromPublic(tx.from, "hex").verify(SHA256(tx.from + tx.to + tx.amount + tx.gas), tx.signature)
        );
    }
}
const myChain = new Blockchain(); 
//myChain.addBlock(new Block(Date.now().toString(),["Hello","World"]));
//myChain.addBlock(new Block(Date.now().toString(),["Hello","Wurld"]));
//myChain.addBlock(new Block(Date.now().toString(),["Hello","Woold"]));
//myChain.chain[1].data = [1];
//console.log(myChain.isVaild());
console.log(myChain)

// Your original balance is 100000
const girlfriendWallet = ec.genKeyPair();

// Create a transaction
const transaction = new Transaction(holderKeyPair.getPublic("hex"), girlfriendWallet.getPublic("hex"), 100, 10);
// Sign the transaction
transaction.sign(holderKeyPair);
// Add transaction to pool
myChain.addTransaction(transaction);
// Mine transaction
myChain.mineTransactions(holderKeyPair.getPublic("hex"));

// Prints out balance of both address
console.log("Your balance:", myChain.getBalance(holderKeyPair.getPublic("hex")));
console.log("Your girlfriend's balance:", myChain.getBalance(girlfriendWallet.getPublic("hex")));
