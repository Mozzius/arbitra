# Arbitra

An A-level Computer Science project by Samuel Newman

## Technical Solution - The Blockchain and application

### Blockchain

We now need to tackle the blockchain, which is a critical part of the project. It it basically a cool name for a linked list. We need to create the following functions to process it:

- Getting a block
- Check how many au a wallet has
- Adding a block
- Getting the top block in the chain
- Getting all the blocks between the top block and the genesis block

To aid with the first function, I decided to structure the blockchain as an object literal rather than an array, with the hash of the block as the key. In this way, we don't need to store the header, and to get a block we simply use `blockchain[hash_of_block]`.

I creates all these functions in a file called `blockchain.js`. The blockchain itself is stored in `blockchain.json`, in `%APPDATA%`. First of all, I created `getBlock()`.

#### getBlock

This simply uses `file.get()` to get the block

```javascript
const file = require('./file.js')

function getBlock(hash,callback) {
    file.get(hash,'blockchain',callback)
}
```

#### Balances

Since we don't want to have to trawl through the blockchain to check every input of every transaction, I decided to store just the balances in a new file called `balances.json`. This file is again a dictionary-style object, with the wallet as the key storing the amount assigned to them. This is much more efficient for getting the amount assigned to a block. We will only need to generate this file when the blockchain changes. To generate it, I created a function called `calcBalances()`

##### calcBalances

`calcBalances()` needs to iterate through all the inputs in each transaction in each block in the blockchain. I decided to use `forEach()` to do this, as although it is technically slower, it is much clearer to see what is happening. In each input, it sees if `balances`, the object that stores the balances, contains the wallet referred to in the input, using `hasOwnProperty()` which returns `true` if the property has a value assigned to it. If that's case, it deducts the amount defined in the input, and increases the recipient's balance by the same amount.

```javascript
function calcBalances() {
    file.getAll((data) => {
        var chain = JSON.parse(data)
        var balances = {}
        // iterate through the blocks
        for (var key in chain) {
            var block = chain[key]
            transactions = block.transactions
            // iterate through each block to find each transaction
            transactions.forEach((transaction) => {
                // iterate through the inputs
                transaction.from.forEach((from) => {
                    // deduct amounts from the inputs
                    if (balances.hasOwnProperty(from.wallet)) {
                        balances[from.wallet] -= from.amount
                    } else {
                        balances[from.wallet] = -from.amount
                    }
                    // add amount to the recipient's balance
                    if (balances.hasOwnProperty(transaction.to)) {
                        balances[transaction.to] += from.amount
                    } else {
                        balances[transaction.to] = from.amount
                    }
                })
            })
        }
        file.storeAll('balances',balances)
    })
}
```

However, we also need to accound for the mining reward. I set this as a `const` at the top of the function. Since it is in microau, it is set to 50000000. For each block, we add the mining reward to the miner's wallet.

```javascript
function calcBalances() {
    const miningreward = 50000000
    file.getAll((data) => {
        var chain = JSON.parse(data)
        var balances = {}
        // iterate through the blocks
        for (var key in chain) {
            var block = chain[key]
            transactions = block.transactions
            // iterate through each block to find each transaction
            transactions.forEach((transaction) => {
                // iterate through the inputs
                transaction.from.forEach((from) => {
                    // deduct amounts from the inputs
                    if (balances.hasOwnProperty(from.wallet)) {
                        balances[from.wallet] -= from.amount
                    } else {
                        balances[from.wallet] = -from.amount
                    }
                    // add amount to the recipient's balance
                    if (balances.hasOwnProperty(transaction.to)) {
                        balances[transaction.to] += from.amount
                    } else {
                        balances[transaction.to] = from.amount
                    }
                })
            })
            // mining rewards
            if (balances.hasOwnProperty(block.miner)) {
                balances[block.miner] += miningreward
            } else {
                balances[block.miner] = miningreward
            }
        }
        file.storeAll('balances',balances)
    })
}
```

However, we have a problem. In it's current state, it calculates the balance of *every* block rather than those under the top block, which is incorrect. What we need is a function which gets the top block then returns a subsection of the blockchain containing only blocks under the top block. This function will be called `mainChain()`, and will be defined later. For now, we will pretend that it exists (as I made these functions at the same time).

```javascript
function calcBalances() {
    const miningreward = 50000000
    // mainChain gets the longest chain, as only the blocks under the highest
    // actually count
    mainChain((chain) => {
        var balances = {}
        // iterate through the blocks
        for (var key in chain) {
            var block = chain[key]
            transactions = block.transactions
            // iterate through each block to find each transaction
            transactions.forEach((transaction) => {
                // iterate through the inputs
                transaction.from.forEach((from) => {
                    // deduct amounts from the inputs
                    if (balances.hasOwnProperty(from.wallet)) {
                        balances[from.wallet] -= from.amount
                    } else {
                        balances[from.wallet] = -from.amount
                    }
                    // add amount to the recipient's balance
                    if (balances.hasOwnProperty(transaction.to)) {
                        balances[transaction.to] += from.amount
                    } else {
                        balances[transaction.to] = from.amount
                    }
                })
            })
            // mining rewards
            if (balances.hasOwnProperty(block.miner)) {
                balances[block.miner] += miningreward
            } else {
                balances[block.miner] = miningreward
            }
        }
        file.storeAll('balances',balances)
    })
}
```

##### getTopBlock

To get the main chain, we need to know what the top block is. Initally, I iterated through them and based it off of `height`, using `time` as a tie-break. To make it more flexible, I made it so you have to pass the blockchain to the function to avoid repeating reading the file.

```javascript
function getTopBlock(fullchain,callback) {
    // get the first key in the object
    // doesn't matter if it's best it just needs to be valid
    for (var best in fullchain) {
        // this is the fastest way of getting the first key
        // even if it's kind of messy looking
        // Object.keys(fullchain)[0] puts the whole object into memory
        break
    }
    if (typeof best !== 'undefined') {
        // iterates through the fullchain
        for (var key in fullchain) {
            // larger height the better
            if (fullchain[key].height > fullchain[best].height) {
                best = key
            }
            // otherwise, if they're the same pick the oldest one
            } else if (fullchain[key].height === fullchain[best].height) {
                if (fullchain[key].time < fullchain[best].time) {
                        best = key
                    }
                }
            }
        }
    } else {
        best = null
    }
    callback(best)
}
```

However, someone could submit a phoney block that has a really high height, without actually being connected to the genesis block through the chain. Whilst it is not the most efficient solution, I decided to only consider a block as the `best` if I could iterate down to the genesis block, which has `parent` of `'0000000000000000000000000000000000000000000000000000000000000000'`.

```javascript
function getTopBlock(fullchain,callback) {
    // get the first key in the object
    // doesn't matter if it's best it just needs to be valid
    for (var best in fullchain) {
        // this is the fastest way of getting the first key
        // even if it's kind of messy looking
        // Object.keys(fullchain)[0] puts the whole object into memory
        break
    }
    if (typeof best !== 'undefined') {
        // iterates through the fullchain
        for (var key in fullchain) {
            // larger height the better
            if (fullchain[key].height > fullchain[best].height) {
                var candidate = true
                // iterate down the chain to see if you can reach the bottom
                // if the parent is undefined at any point it is not part of the main chain
                // run out of time for a more efficient method
                var current = key
                var parent
                while (fullchain[current].parent !== '0000000000000000000000000000000000000000000000000000000000000000') {
                    parent = fullchain[current].parent
                    if (typeof fullchain[parent] !== 'undefined') {
                        current = parent
                    } else {
                        candiate = false
                    }
                }
                if (candidate) {
                    best = key
                }
            // otherwise, if they're the same pick the oldest one
            } else if (fullchain[key].height === fullchain[best].height) {
                if (fullchain[key].time < fullchain[best].time) {
                    // see other comments
                    var candidate = true
                    var current = key
                    while (fullchain[current].parent !== '0000000000000000000000000000000000000000000000000000000000000000') {
                        parent = fullchain[current].parent
                        if (typeof fullchain[parent] !== 'undefined') {
                            current = parent
                        } else {
                            candiate = false
                        }
                    }
                    if (candidate) {
                        best = key
                    }
                }
            }
            document.getElementById('height').textContent = fullchain[best].height
        }
    } else {
        best = null
    }
    callback(best)
}
```

##### mainChain

`mainChain()` pretty much repeats what `getTopBlock()` does to verify that a block is a part of the chain, except it stores the blocks that it finds, to create a subsection of the chain. Only this part of the chain is valid, which is why it is so important.

```javascript
function mainChain(callback) {
    var mainchain = {}
    file.getAll('blockchain',(data) => {
        if (data === '{}') {
            callback({})
        } else {
            var fullchain = JSON.parse(data)
            getTopBlock(fullchain,(top) => {
                mainchain[top] = fullchain[top]
                var current = top
                var parent
                while (fullchain[current].parent !== '0000000000000000000000000000000000000000000000000000000000000000') {
                    parent = fullchain[current].parent
                    mainchain[parent] = fullchain[parent]
                    current = parent
                }
                callback(mainchain)
            })
        }
    },'[]')
}
```

##### checkBalance

We need a function which checks the balance of a wallet to see if it greater than or equal to some amount. This function is called `checkBalance()`.

```javascript
function checkBalance(key,amount,callback) {
    file.get(key,'balances',(balance) => {
        // returns true if the wallet's balance is
        // less than or equal to the amount requested
        callback(balance >= amount)
    },0)
}
```

#### addBlock

The `addBlock()` function is fairly simple, as all it needs to do is check if it's valid, append the block to `blockchain.json` and then call `calcBalances()`. However, we also need to remove any transactions from `txpool` that are in the block. To do this, we iterate through the transactions listed in the block and use `splice()` and `indexOf()` to remove the transaction from `txpool`, if it is there.

We then store `txpool`.

```javascript
function addBlock(msg) {
    try {
        parse.block(msg.body)
        // if it failed the test, an error will have been thrown
        file.store(hash.sha256hex(JSON.stringify(msg.body)),msg.body,'blockchain')
        console.log('Block added')
        file.getAll('txpool',(data) => {
            var txpool = JSON.parse(data)
            msg.body.transactions.forEach((tx) => {
                // remove pending transactions if they're in the received block
                txpool.splice(txpool.indexOf(tx),1)
            })
            file.storeAll('txpool',txpool)
            calcBalances()
        },'[]')
    } catch(e) {
        console.warn('Block failed:',JSON.stringify(msg))
        console.warn(e)
    }
}
```

`parse.block()` is used to make sure that it's valid, and will throw an error if it's not - this is why there is a `try...catch` statment.

Finally, I exported all the functions.

```javascript
exports.get = getBlock
exports.checkBalance = checkBalance
exports.calcBalances = calcBalances
exports.updateBalances = updateBalances
exports.addBlock = addBlock
exports.getTopBlock = getTopBlock
exports.mainChain = mainChain
```

### Pages

Before we start creating the pages, I decided to restructure the application slightly. I moved all the Javascript files relating to any of the pages - `overview.js`, `wallets.js` etc - to a subfolder in `js`, `pages`. I also moved the `changePage()` function from `renderer.js` to it's own file, then imported it back into `renderer.js`. I also modified it to account for the new location of the Javascript files.

```javascript
const remote = require('electron').remote
const fs = require('fs')

function changePage(name) {
    var path = 'pages/' + name + '.html'
    fs.readFile(path,'utf-8',(err, data) => {
        if (err) {
            alert('An error ocurred reading the file: '+name)
            console.warn('An error ocurred reading the file: '+err.message)
            return
        }
        document.getElementById('body').innerHTML = data
        try {
            const pageJS = require('./pages/'+name+'.js')
            pageJS.init()
        } catch(e) {
            console.error(e)
        }
    })
}

exports.changePage = changePage
```

I imported it back into `renderer.js` like so:

```javascript
const changePage = require('./js/changepage.js').changePage
```

Now that the Javascript files for pages are a folder deeper than the other files, we have to import these other files like so:

```javascript
const file = require('../file.js')
```

#### Transactions

##### Wallets

The Wallets page will contain a list of all the wallets that the user has stored. The user can interact with each one. The options they will have will be:

- Create transaction from wallet
- View private key
- Copy key

First, we need to store the wallets. Each wallet has four attributes:

- User-defined name
- Public key
- Private key
- Amount

The first three are static. However, the money in the wallet is dependent on the blockchain, which we do not want to have to trawl through every time to find the value of each wallet. Therefore, I decided to update the wallets every time `calcBalances()` is called. It iterates through `wallets.json`, which is where the wallets will be found, and finds the total amount for each wallet. While doing this, I realised that we could take this opportunity to calculate the balance counter in the corner of the application. For each wallet that is iterated through, the amount calculated for each wallets is added to a counter, and the total in the corner is set to this amount.

Finally, the new wallet's values are stored in `wallets.json`.

```javascript
function calcBalances() {
    const miningreward = 50000000
    // mainChain gets the longest chain, as only the blocks under the highest
    // actually count
    mainChain((chain) => {
        var balances = {}
        // iterate through the blocks
        // removed in this example as nothing has changed
        for (var key in chain) {...}
        // calculating the balance in the corner
        file.getAll('wallets',(data) => {
            var wallets = JSON.parse(data)
            var newWallets = []
            var balance = 0
            wallets.forEach((wallet) => {
                if (balances.hasOwnProperty(wallet.public)) {
                    amount = balances[wallet.public]
                } else {
                    amount = 0
                }
                // add the au in the wallet to the total balance
                balance += amount
                // and set the balance in the wallet
                newWallets.push({
                    "name": wallet.name,
                    "public": wallet.public,
                    "private": wallet.private,
                    "amount": amount
                })
            })
            // change microau to au and set the textcontent of the top left thing
            document.getElementById('current-balance').textContent = balance / 100000
            // save balances
            file.storeAll('wallets',newWallets)
            file.storeAll('balances',balances)
        },'[]')
    })
}
```

Finally, we can start displaying the wallets in `wallets.html`. The HTML structure of the page is like so:

```html
<h1>Transactions</h1>

<h2>Wallets</h2>

<div class="highlight-box">
    <h3>My wallets</h3>
    <button id="create">Create new wallet</button>
    <div class="list" id="wallet-list"></div>
</div>
```

The button with an id of `create` needs to link to the page where wallets are generated, so we will need to import `changePage()` into `wallets.js`. `#wallet-list` is the html object where we will be adding the wallets. `.list` is a CSS class like so:

```css
.list {
    overflow-y: auto;
    overflow-x: hidden;
}
```

This means that if the contents of `#wallet-list` is too wide it will simply be hidden, but if it too tall it will create a scroll bar.

Elements within `.list` will have class `.list-item`, which has the following properties:

```css
.list-item {
    overflow-x: auto;
    width: calc(100% - 12px);
    background-color: white;
    margin: 5px 0;
    padding: 5px;
    border: 1px solid #333;
    border-radius: 5px;
    white-space: nowrap;
}
```

In `wallets.js`, we first import `file` and `changePage()`, and add an event listener to change the page to `wallets-create` when the button is clicked. This will be the page where we can create a wallet.

```javascript
const file = require('../file.js')
const changePage = require('../changepage').changePage

function init() {
    document.getElementById('create').addEventListener('click',() => {
        changePage('wallets-create')
    })
}

exports.init = init
```

We now need to populate `#wallet-list`. This is done by getting the wallets and iterating through them, appending a new `div` for each wallet, which is done by calling `document.createElement()` and using `appendChild()` to place it inside of the `#wallet-list` element. I also called `blockchain.calcBalances()` to ensure the wallets are up to date.

```javascript
const file = require('../file.js')
const changePage = require('../changepage').changePage
const blockchain = require('../blockchain.js')

function init() {
    document.getElementById('create').addEventListener('click',() => {
        changePage('wallets-create')
    })
    blockchain.calcBalances()
    file.getAll('wallets',(data) => {
        wallets = JSON.parse(data)
        var walletList = document.getElementById('wallet-list')
        var listItem
        wallets.forEach((wallet) => {
            listItem = document.createElement('div')
            walletList.appendChild(listItem)
        })
    },'[]')
}

exports.init = init
```

We now need to add the class `.list-item` to the child element, and add the data. The first is achieved by calling `listItem.classList.add('list-item')`. The second part however, using the method above of creating new elements using Javascript and appending them one by one, is cumbersome with the large number of sub-elements we need. Therefore, I decided instead to create a string and use `innerHTML`, which takes a string instead.

```javascript
wallets.forEach((wallet) => {
    listItem = document.createElement('div')
    listItem.classList.add('list-item')
    listItem.innerHTML = '<p><b>Name:</b> '+wallet.name+'</p><p><b>Public:</b> '+wallet.public+'</p><p><b>Amount:</b> <span class="money">'+wallet.amount/1000000+'</span></p>'
    walletList.appendChild(listItem)
})
```

Notice how `wallet.amount` is divided by 1000000 - this is because `wallet.amount` is in $\mu$au, and we need to convert it to au.

Now, to see if it works, we need to make a way to create wallets.

##### Creating Wallets

I created a new page called `create-wallets`, which was linked to earlier. The HTML for `create-wallets` is like so:

```html
<h1>Transactions</h1>

<h2>Create a Wallet</h2>

<p>Wallet Name:</p>
<input type="text"  id="name" placeholder="My Wallet"><br>
<p>Public Key:</p>
<div class="list-item" id="public"></div>
<p>Private Key (DO NOT SHARE!):</p>
<div class="list-item" id="private"></div>
<button id="create">Create Wallet</button>
```

It turns out we can reuse the `.list-item` class as a kind of highlight box. What `wallets-create.js` will need to do is populate `#public` and `#private` with the appropriate key, then add these and the name to a wallet when `#create` is clicked.

To do this, we need to use the `ecdsa` module, as well as `file` and `changePage`. This is where we can use `ecdsa.createKeys()` to create the public and private keys.

```javascript
const ecdsa = require('../ecdsa.js')
const changePage = require('../changepage').changePage
const file = require('../file.js')

function init() {
    ecdsa.createKeys((public, private, err) => {
        if (err) {
            console.error(err)
            changePage('wallets')
        } else {
            document.getElementById('public').innerText = public
            document.getElementById('private').innerText = private
        }
    })
    document.getElementById('create').addEventListener('click',() => {
        var name = document.getElementById('name').value
        console.log('Creating wallet: '+name)
        var data = {}
        data['name'] = name
        data['public'] = document.getElementById('public').textContent
        data['private'] = document.getElementById('private').textContent
        data['amount'] = 0
        console.log(JSON.stringify(data))
        file.append('wallets',data,() => {
            changePage('wallets')
        })
    })
}

exports.init = init
```

###### Testing

We can now test both `wallets` and `wallets-create`. First, I navigated to `wallets`.

![Wallets page](https://i.imgur.com/cJGwxw0.png)

As you can see, there's nothing there. So, I clicked on the "create" button, which takes us to `wallets-create`.

![wallets-create page](https://i.imgur.com/14WSrWD.png)

I entered the name "My Wallet" and pressed "Create", which took me back to the `wallets` page - except now, it had a wallet called "My Wallet", which means that it worked!

![Wallets with a wallet in it](https://i.imgur.com/UMolFuM.png)

##### Create Transaction

To create transactions, we need to be able to add in multiple input sources. This is much more complex than a single dropdown, as since the input sources will need to be added through Javascript, they can't (easily) have unique ids.

First of all, I created the HTML for the page, in `make.html`. `#error` has class `.hidden`, which gives it property `display: none`. When we want to display the error message, we remove this class.

Notice how the `#inputs` div is empty. This is because we will add the dropdowns with in through Javascript.

```html
<h1>Transactions</h1>

<h2>Make Transactions</h2>

<div class="hidden" id="error">
    <p><b>Error:</b> missing/incorrect form values</p>
</div>

<form>
    <p>To:</p>
    <input type="text" id="to" placeholder="Address"><br>
    <p>From:</p>
    <div id="inputs">
    </div>
    <button type="button" id="addInput">Add input</button>
    <p>Please note that each wallet can only be used once</p>
    <button type="button" id="send">Send</button>
</form>
```

Now, we need to create `make.js`. In the `init()` function, all we do is add event listeners to the buttons. We also import all the necessary functions.

```javascript
const file = require('../file.js')
const parse = require('../parse.js')
const ecdsa = require('../ecdsa.js')
const network = require('../network.js')

function init() {
    var add = document.getElementById('addInput')
    var send = document.getElementById('send')
    add.addEventListener('click',addInput)
    send.addEventListener('click',sendTx)
}

exports.init = init
```

Now we need to create the function `addInput()`, which is called when the `#addInput` button is pressed. It creates a div with the class `.input-group`. It then adds a dropdown, a line break, and a number input box to that div, and adds a placeholder value to the dropdown. It then appends `.input-group` to `#inputs`.

```javascript
function addInput() {
    var inputGroup = document.createElement('div')
    inputGroup.classList.add('input-group')
    // add select
    // <select name="dropdown"></select>
    var select = document.createElement('select')
    select.name = 'dropdown'
    // add placeholder
    select.innerHTML = '<option value="" selected disabled>Choose a wallet</option>'
    // add br
    // <br>
    var br = document.createElement('br')
    // add number input
    // <input name="amount" type="number" placeholder="Amount to send">
    var number = document.createElement('input')
    number.type = 'number'
    number.placeholder = 'Amount to send'
    number.name = 'amount'
    // add them all to the page
    inputGroup.appendChild(select)
    inputGroup.appendChild(br)
    inputGroup.appendChild(number)
    document.getElementById('inputs').appendChild(inputGroup)
}
```

However, we need to put the wallets in the dropdown. For this, I created a new function called `populateDropdown()`, which opens `wallets.json` and adds `option` elements to the dropdown with the wallets' name and balance. It also sets the `value` of the option to the public key, which is important, as this is what will be returned when we get the `value` of the dropdown if that option is selected. I also called the function in line 10 of the above snippet.

```javascript
function populateDropdown(select) {
    var option
    // get list of wallets
    file.getAll('wallets',(data) => {
        var wallets = JSON.parse(data)
        wallets.forEach((wallet) => {
            option = document.createElement('option')
            option.value = wallet.public
            option.text = wallet.amount/100000+"au - "+wallet.name
            select.add(option)
        })
    })
}
```

Finally, I called `addInput()` in the `init()` function so that the page starts with an input. You can see that this all worked:

![make tx](https://i.imgur.com/bVVNjfW.png)

Now, we just need to add the `sendTx()` function. The reason I had structured the inputs in this way is that I knew that `document.getElementsByClassName()` gives an array of the elements with that class name. Therefore, we can get all the elements with class name `.input-group` and iterate through them. We can then use `childNodes` to get the children of each group, then get their values.

```javascript
function sendTx() {
    var to = document.getElementById('to').value
    var groups = document.getElementsByClassName('input-group')
    groups.forEach((group) => {
        var child = group.childNodes
        var wallet = child[0].value
        var amount = child[1].value
        console.log(wallet)
        console.log(amount)
    })
}
```

However, there are some issues with this - first and foremost, `document.getElementsByClassName()` does not return an array - it returns a `HTMLCollection`, which is similar but we can't iterate through it. Luckily, this is easy to solve by turning it into an array using `Array.from`.

Secondly, there are actually three elements within each group, and therefore `child[1]` returns the `br` rather than the `input` that we want. This is fixed by using `child[2]` instead.

```javascript
function sendTx() {
    var to = document.getElementById('to').value
    // this isn't an array for some reason
    // we can make it one using Array.from
    // https://stackoverflow.com/a/37941811/5453419
    var groups = Array.from(document.getElementsByClassName('input-group'))

    groups.forEach((group) => {
        var child = group.childNodes
        var wallet = child[0].value
        console.log(wallet)
        // 2 because of the br
        var amount = child[2].value
        console.log(amount)
    })
}
```

Now we need to get data from `wallets.json` in order to sign the inputs. However, since `wallets.json` is an array, we can't easily get the private key with the public key, so I decided instead to put the wallets in a new format so you can get the private key from the secret key.

```javascript
function sendTx() {
    var to = document.getElementById('to').value
    // this isn't an array for some reason
    // we can make it one using Array.from
    // https://stackoverflow.com/a/37941811/5453419
    var groups = Array.from(document.getElementsByClassName('input-group'))
    var message = {
        "header": {
            "type": "tx"
        },
        "body": {
            "to": to,
            "from": []
        }
    }
    file.getAll('wallets',(data) => {
        var time = Date.now()
        message.body['time'] = time
        // converting wallets into a format
        // where you can enter the public key
        // and get the private key
        var convert =  {}
        var wallets = JSON.parse(data)
        wallets.forEach((wallet) => {
            public = wallet.public
            private = wallet.private
            convert[public] = private
        })
        groups.forEach((group) => {
            var child = group.childNodes
            var wallet = child[0].value
            console.log(wallet)
            // 2 because of the br
            var amount = child[2].value
            console.log(amount)
        })
    })
}
```

Now we can call `convert[public]` to get the private key. Next we need to create the signatures etc, which is fairly easy, since we have already created the `signMsg()` function. However, I put it all in a `try-catch` statement, and if an error is caught it removes `.hidden` from `#error`.

If the message manages to reach the end without errors, it checks the message using `parse.transaction`, sends the message using `sendToAll()` and finally appends the message body to both `txpool.json` and `recenttx.json`, for mining and for view transaction history, respectively.

```javascript
function sendTx() {
    var to = document.getElementById('to').value
    // this isn't an array for some reason
    // we can make it one using Array.from
    // https://stackoverflow.com/a/37941811/5453419
    var groups = Array.from(document.getElementsByClassName('input-group'))
    var message = {
        "header": {
            "type": "tx"
        },
        "body": {
            "to": to,
            "from": []
        }
    }
    file.getAll('wallets',(data) => {
        var time = Date.now()
        message.body['time'] = time
        // converting wallets into a format
        // where you can enter the public key
        // and get the private key
        var convert =  {}
        var wallets = JSON.parse(data)
        wallets.forEach((wallet) => {
            public = wallet.public
            private = wallet.private
            convert[public] = private
        })
        try {
            groups.forEach((group) => {
                var child = group.childNodes
                var wallet = child[0].value
                console.log(wallet)
                // 2 because of the br
                var amount = child[2].value
                console.log(amount)
                if (wallet && amount > 0) {
                    // convert to microau
                    amount *= 1000000
                    // the message that is signed
                    var concat = amount+to+time
                    var signature = ecdsa.signMsg(concat,convert[wallet],(signature) => {
                        message.body.from.push({
                            "wallet": wallet,
                            "amount": amount,
                            "signature": signature
                        })
                    })
                } else {
                    throw 'no amount entered'
                }
            })
            // if it's invalid, it will throw an error and be caught by the try-catch
            console.log('Transaction: '+JSON.stringify(message))
            parse.transaction(message.body)
            network.sendToAll(message)
            file.append('txpool',message.body)
            file.append('recenttx',message.body)
        } catch(e) {
            document.getElementById('error').classList.remove('hidden')
            console.warn('Tx failed: '+e)
        }
    },'[]')
}
```

This can only really be tested when everything else works, so this will be covered in the full testing phase.

##### View recent

This section is very similar to the wallet viewing page, except it reads `recenttx.json` instead. The HTML, `history.html`, looks like this:

```html
<h1>Transactions</h1>

<h2>Transaction History</h2>

<div class="highlight-box">
    <h3>Recent Transactions</h3>
    <button id="create">Make transaction</button>
    <div class="list" id="tx-list"></div>
</div>
```

`history.js` looks like this:

```javascript
const file = require('../file.js')
const changePage = require('../changepage').changePage

function init() {
    document.getElementById('create').addEventListener('click', function () {
        changePage('make')
    })
    file.getAll('recenttx',(data) => {
        transactions = JSON.parse(data)
        var txList = document.getElementById('tx-list')
        var listItem
        if (transactions) {
            transactions.forEach((tx) => {
                var balance = 0
                tx.from.forEach((from) => {
                    balance += from.amount/100000
                })
                listItem = document.createElement('div')
                listItem.classList.add('list-item')
                // timestamp to date
                var date = new Date(tx.time).toString()
                listItem.innerHTML = '<p><b>Time:</b> '+date+'</p><p><b>To:</b> '+tx.to+'</p><p><b>Amount:</b> <span class="money">'+balance+'</span></p>'
                txList.appendChild(listItem)
            })
        }
    })
}

exports.init = init
```

Something of note is the date - since `tx.time` is a timestamp, we need to turn it into something readable before printing it. For this, we use the `Date` class. Creating a `Date` object then using `toString()` turns it into a human-readable date. Initially, I tried to use `toISOString()`, which creates this:

```console
new Date(Date.now()).toISOString()
"2018-03-14T14:30:01.112Z"
```

However, that is not very readable. I soon discovered that I could use `toString() instead:

```console
new Date(Date.now()).toString()
"Wed Mar 14 2018 14:29:49 GMT+0000 (GMT Standard Time)"
```

That is much better, as it is clear what time and date that represents.

Again, since we need to be able to create transactions to see them here, and since we need the blockchain to work in order to do that, we will have to test this at the end.

#### Blockchain

The blockchain pages are a critical aspect of the project, as it is here where we mine the blockchain.

##### Mining

Mining the blockchain, as mentioned previously, consists of performing hundreds of thousands hash operations to find the one that passes a "difficulty test" - in this case, it passes if the hash begins with a certain number of hashes. Obviously, this is very CPU intensive, and since Node.js is single-threaded this would cripple the performance of the application. This is not desirable, so I looked for alternatives.

###### Multi-threading alternatives

The first option I looked at was to see if there was a multithreading module default to Node.js. This lead me to `child_process`. However, although this appeared to be relevent to my problems, it looked far too complex for this project.

Next, I looked to see if there was anything default to Javascript itself. As it turns out, there is a `Webworker` API which allows you to run a different JS file independantly from the main program, and also communicate between programs.

An example of a `Webworker`:

```javascript
var worker = new Worker('worker.js')

worker.onmessage = (msg) => {
    console.log(msg.data)
}
```

However, I immediately ran into a problem when I tried to use Node.js functions in the `worker.js` file.

```console
ReferenceError: require is not defined
```

Webworkers can only use plain Javascript, and don't have access to Node.js modules or features. This is a massive problem, as we need to use `cryto` module to hash stuff at a minimum. I therefore had to carry on looking.

The next place I looked was in `npm`. Since `Worker()` was exactly what I needed, I looked for Node.js-compatible alternative.

Luckily enough, I found one! `tiny-worker` replaces `Webworker` with the same API but now with access to Node.js functions.

```shell
>npm install --save tiny-worker
```

###### Mining page

The idea behind the mining page is that we have a `pre` element acting as a console, and then also have a button to toggle the miner.

```html
<h1>Blockchain</h1>

<h2>Mine for Arbitrary Units</h2>

<button id="toggle" style="margin-right:5px">Start</button><button id="clear">Clear</button> <b>Please note:</b> Mining is very CPU intensive

<pre id="console"></pre>
```

I also added a button to clear the console.

The console has the following CSS, to make sure that it is the right size, and has a monospace font.

```css
#console {
    box-sizing: border-box;
    width: 100%;
    height: calc(100% - 180px);
    min-height: 300px;
    background-color: #ececec;
    border-radius: 5px;
    border: 1px solid #333;
    padding: 5px;
    overflow-y: auto;
    overflow-x: hidden;
    font-family: 'Courier New', 'Courier', monospace;
}
```

Next I created `mine.js` in `/js/pages`.

```js
const Worker = require('tiny-worker')
const blockchain = require('../blockchain.js')
const network = require('../network.js')
const file = require('../file.js')

function init() {
    var miner = null
    var button = document.getElementById('toggle')
    var clear = document.getElementById('clear')
    var pre = document.getElementById('console')

    clear.addEventListener('click',() => {
        pre.innerHTML = ''
    })

    button.addEventListener('click',() => {
        if (button.textContent == 'Start') {
            pre.innerHTML += 'Start'
            button.textContent = 'Stop'
        } else {
            pre.innerHTML += 'Mining stopped<br>'
            button.textContent = 'Start'
        }
    })
}

exports.init = init
```

`init()` adds event listeners to `#toggle` and to `#clear`. `#clear` simply sets the content of `#console` to an empty string. For `#toggle`, I created an if statement that switches the text content of the button between `'Start'` and `'Stop'`. This way, we can do one thing when the button says "Start" and a different thing when it says "Stop".

The next stage is to create the `Worker`. If the button is set to "Start", then it checks to see if the miner exists already. If not, it creates a new instance of `Worker` and sets it to `miner`. It sets `miner`'s `onmessage` function to add any received data to `#console`. If the button is set to "Stop", then it sets `miner` to `null` and then adds "Mining stopped" to the `#console`. After both, it toggles the text content of the button.

```javascript
button.addEventListener('click',() => {
    if (button.textContent == 'Start') {
        if (miner === null) {
            try {
                miner = new Worker('js/mining-script.js')
                miner.onmessage = (msg) => {
                    pre.innerHTML += msg.data+'<br>'
                }
            } catch(e) {
                pre.innerHTML = 'Problem starting mining script, sorry :/'
            }
        }
        button.textContent = 'Stop'
    } else {
        if (miner !== null) {
            miner.terminate()
            miner = null
        }
        pre.innerHTML += 'Mining stopped<br>'
        button.textContent = 'Start'
    }
})
```

Next we need to create `mining-script.js`, in the `/js` folder. For the time being, I just made it post "Hello World" back to the main program.

```javascript
postMessage('Hello World')
```

Navigating to `mine` and clicking "Start" gives:

![Hello World](https://i.imgur.com/wQRhtad.png)

This shows that it works!

We now need to flesh out the mining script. Unfortunately, the following code is very messy, as errors generated in the mining script seemed to disappear or be printed in the command line rather than in the Chromium console, and as such took a great deal of trial and error to get working.

Because of this, I will simply put the final code here rather than go through the process of making it.

```javascript
const hash = require(__dirname+'/js/hashing.js')
const fs = require('fs')

class Miner {
    constructor(path) {
        const difficulty = 6
        this.path = path
        // this is for the printing later
        this.hashes = 0
        this.dhash = 0
        this.t1 = Date.now()
        this.t2 = Date.now()
        this.tt = Date.now()
        // difficulty is static
        this.block = {
            "header": {
                "type": "bk"
            },
            "body": {
                "difficulty": difficulty
            }
        }

        // talk about switching to syncronous

        var transactions = JSON.parse(fs.readFileSync(this.path+'txpool.json','utf-8'))
        this.block.body['transactions'] = transactions

        // parent and height
        var top = this.getTopBlock()
        if (top === null) {
            this.block.body['parent'] = '0000000000000000000000000000000000000000000000000000000000000000'
            this.block.body['height'] = 0
        } else {
            var blockchain = JSON.parse(fs.readFileSync(this.path+'blockchain.json','utf8'))
            this.block.body['parent'] = top
            this.block.body['height'] = blockchain[top].height+1
        }
        // miner
        var wallets = JSON.parse(fs.readFileSync(this.path+'wallets.json','utf-8'))
        var miner = wallets[0].public
        this.block.body['miner'] = miner

        postMessage('Block formed, mining initiated')
    }

    mine() {
        // repeatedly hashes with a random nonce
        while (true) {
            this.rand((nonce) => {
                this.block.body['nonce'] = nonce
                // t2 is updated every loop
                this.block.body['time'] = this.t2
                this.hashBlock(this.block.body,(hash) => {
                    this.hashes++
                    this.dhash++
                    // checks difficulty
                    var pass = true
                    for (var i = 0; i < this.block.body.difficulty; i++) {
                        if (hash.charAt(i) !== 'a') {
                            pass = false
                        }
                    }
                    this.t2 = Date.now()
                    // this triggers if the block has passed the difficulty test
                    if (pass) {
                        postMessage('Hash found! Nonce: '+nonce)
                        postMessage(hash)
                        postMessage(this.block)
                        // get rid of the pending transactions
                        fs.writeFileSync(this.path+'txpool.json','[]','utf-8')
                        // set the new block things
                        this.block.body.transactions = []
                        var top = this.getTopBlock()
                        this.block.body['parent'] = hash
                        this.block.body['height'] += 1 
                    } else {
                        // printing for the console
                        if ((this.t2-this.t1) > 10000) {
                            // calculate hashes per second (maybe)
                            // *1000 turns it into seconds
                            var hs = (this.dhash/(this.t2-this.t1))*1000
                            this.dhash = 0
                            this.t1 = Date.now()
                            postMessage('Hashing at '+hs.toFixed(3)+' hashes/sec - '+this.hashes+' hashes in '+Math.floor((this.t1-this.tt)/1000)+' seconds')

                            // check to see if the block has updated
                            fs.readFile(this.path+'txpool.json','utf-8',(err,content) => {
                                if (err) {
                                    // if the file doesn't exist, set content to []
                                    if (err.code === 'ENOENT') {
                                        content = '[]'
                                    } else {
                                        postMessage('Error opening file')
                                        throw err
                                    }
                                }
                                var current = JSON.stringify(this.block.body.transactions)
                                // change the transactions if they are different
                                if (current !== content) {
                                    var newtx = JSON.parse(content)
                                    this.block.body['transactions'] = newtx
                                    postMessage('Transactions updated')
                                }
                            })
                        }
                    }
                })
            })
        }
    }

    rand(callback) {
        callback(Math.floor(10000000000000000*Math.random()))
    }
    
    hashBlock(block,callback) {
        var hashed = hash.sha256hex(JSON.stringify(block))
        callback(hashed)
    }

    getTopBlock() {
        try {
            var data = fs.readFileSync(this.path+'blockchain.json','utf8')
        } catch(e) {
            return null
        }
        if (data === '{}' || data === '') {
            return null
        }
        var fullchain = JSON.parse(data)
        // get the first key in the object
        // doesn't matter if it's best it just needs to be valid
        for (var best in fullchain) {
            // this is the fastest way of getting the first key
            // even if it's kind of messy looking
            // Object.keys(fullchain)[0] puts the whole object into memory
            break
        }
        // iterates through the fullchain
        for (var key in fullchain) {
            // larger height the better
            if (fullchain[key].height > fullchain[best].height) {
                var candidate = true
                // iterate down the chain to see if you can reach the bottom
                // if the parent is undefined at any point it is not part of the main chain
                // run out of time for a more efficient method
                var current = key
                var parent
                while (fullchain[current].parent !== '0000000000000000000000000000000000000000000000000000000000000000') {
                    parent = fullchain[current].parent
                    if (typeof fullchain[parent] !== 'undefined') {
                        current = parent
                    } else {
                        candiate = false
                    }
                }
                if (candidate) {
                    best = key
                }
            // otherwise, if they're the same pick the oldest one
            } else if (fullchain[key].height === fullchain[best].height) {
                if (fullchain[key].time < fullchain[best].time) {
                    // see other comments
                    var candidate = true
                    var current = key
                    while (fullchain[current].parent !== '0000000000000000000000000000000000000000000000000000000000000000') {
                        parent = fullchain[current].parent
                        if (typeof fullchain[parent] !== 'undefined') {
                            current = parent
                        } else {
                            candiate = false
                        }
                    }
                    if (candidate) {
                        best = key
                    }
                }
            }
        }
        return best
    }
}

onmessage = (path) => {
    postMessage('Path recieved')
    try {
        var miner = new Miner(path.data)
        miner.mine()
    } catch(e) {
        postMessage('Error caught')
        if (typeof e !== 'string') {
            e = e.message
        }
        postMessage(e)
    }
}
```

I created a `Miner` class, which has multiple functions to recreate some of the functions that exist in the main program.

Starting from the top, the first issue I ran into was that this too seemed unable to `require` modules. As it turns out, I had to put the absolute file path for it to work, which is why I `require` the hash module like so:

```javascript
const hash = require(__dirname+'/js/hashing.js')
```

`__dirname` gets the path up to `/arbitra-client`, and then we concatenate `/js/hashing.js` to that to get the path to the file we want.

The next issue I ran into was trying to `file.js` working. I imported it the same way I imported `hashing.js`, but it kept on throwing an error that was approximately "`remote` is undefined". This took a great deal of debugging, but I eventually realised that since it was not an Electron renderer process, it did not have access to `electron.remote`. This was a real issue, as this is required to get the file path for `%APPDATA%`.

The solution was to get the file path in `mine.js`, and send it to the mining script using `postMessage()`. Since `network.js` also relies on `file.js`, I realised that in order to send the block it would need to be sent from `mine.js`. Therefore, in `mine.js`, I changed the part of the code that initalises the miner to this:

```javascript
miner = new Worker('js/mining-script.js')
miner.onmessage = (msg) => {
    if(typeof msg.data === 'string') {
        pre.innerHTML += 'Hello World'
    } else {
        console.log(JSON.stringify(msg.data))
        blockchain.addBlock(msg.data)
        network.sendToAll(msg.data)
    }
}
// Workers can't get remote so we need to send them the path manually
var path = remote.app.getPath('appData')+'/arbitra-client/'
miner.postMessage(path)
```

In this code, we get the file path that we need, then post a message to the miner. This way, they can get the path without using `electron.remote`

When the miner posts a message, it is checked to see if it a string or not. If so, it is printed to `#console`. If not, it is assumed to be a block and added to the blockchain and sent to all nodes.



##### Viewing

Viewing the blockchain is very similar to the `history` page and `wallets`. The HTML, `view.html`, looks like this:

```html
<h1>Blockchain</h1>

<h2>View Blockchain</h2>

<div class="highlight-box">
    <h3>Blockchain</h3>
    <button id="mine-button">Mine</button>
    <div class="list" id="bk-list"></div>
</div>
```

`view.js` looks like this:

```javascript
const file = require('../file.js')
const blockchain = require('../blockchain.js')
const changePage = require('../changepage').changePage

function init() {
    document.getElementById('mine-button').addEventListener('click',() => {
        changePage('mine')
    })
    file.getAll('blockchain',(data) => {
        var chain = JSON.parse(data)
        var list = document.getElementById('bk-list')
        var listItem
        var block
        for (var hash in chain) {
            block = chain[hash]
            listItem = document.createElement('div')
            listItem.classList.add('list-item')
            // timestamp to date
            var date = new Date(block.time).toString()
            // pretty printing json
            var txs = JSON.stringify(block.transactions,null,4)
            listItem.innerHTML = '<p><b>Time:</b> '+date+'</p><p><b>Hash:</b> '+hash+'</p><p><b>Parent:</b> '+block.parent+'</p><p><b>Miner:</b> '+block.miner+'</p><p><b>Height:</b> '+block.height+'</p><p><b>Transactions:</b></p><pre id="console">'+txs+'</pre>'
            list.appendChild(listItem)
        }
    })
}

exports.init = init
```

The only notable differences is that since `blockchain.json` is not an array, I used a for...in loop which gets the keys of the object.

I also printed the transactions as raw JSON in a `pre` tag with id of `#console`, so that it has the styles of the other console. When `stringify()`ing the JSON data, I gave it the extra parameters of `null` and `4` which should indent it with 4 spaces.

This needs the blockchain to work, so I will cover it in the Testing phase.

#### Settings

##### Network Settings

The things I wanted to be able to do from network settings are:

- manually ping nodes
- set `advertise` in the ping messages
- set the number of target connections
- refresh the target connections.

The first feature was already made for `testing.js`, so we can just copy that over. The next three change a file when a button is pressed.

As such, `network-settings.html` looks like this:

```html
<h1>Settings</h1>

<h2>Network Settings</h2>

<h3>Add node</h3>
<p>Enter an IP address, and it will attempt to connect.</p>
<input type="text" id="sendto"/>
<button id="send">Send ping</button>
<p id="pg-save" class="hidden">Ping sent</p>

<h3>Target connections</h3>
<p>The target number of connections that the client will try to get. Current: <span id="curr"></span></p>
<input type="number" id="target"/>
<button id="target-save">Save</button>
<p id="min-save" class="hidden">Option saved</p>

<h3>Advertise</h3>
<p>Sometimes, nodes will ask others to send a list of clients that they are in contact with. Your IP will only be shared if this setting is turned on.</p>
<select id="advertise">
    <option value="true">On</option>
    <option value="false">Off</option>
</select>
<button id="save">Save</button>
<p id="ad-save" class="hidden">Option saved</p>


<h3>Refresh connections</h3>
<p>Refresh this client's connections to other nodes.</p>
<button id="refresh">Refresh</button>
<p id="re-save" class="hidden">Connections refreshed</p>
```

I added messages confirming that the action has been completed, but are hidden by default. When the associated action is completed, `.hidden` will be removed confirming it did something.

Next, I created `network-settings.js`. The outer section looks like this:

```javascript
const network = require('../network.js')
const file = require('../file.js')

function init() {
    // setting the current target connections
    file.get('target-connections','network-settings',(target) => {
        document.getElementById('curr').textContent = target
    })
}

exports.init = init
```

This sets the span `#curr` with the current connection target that we have on file.

###### Manual Ping

To ping a node, all we need to do is get `advertise` from `network-settings.json`, use that to form a ping message, then send that to whatever is in the text box using `network.sendMsg()`.

When that is done, it removes `.hidden` from `#pg-save`,

```javascript
// ping an IP
document.getElementById('send').addEventListener('click',() => {
    file.get('advertise','network-settings',(data) => {
        var msg = {
            "header": {
                "type": "pg"
            },
            "body": {
                "advertise": data
            }
        }
        network.sendMsg(msg,document.getElementById('sendto').value)
        document.getElementById('pg-save').classList -= 'hidden'
    })
})
```

###### Target Connections

"Target connections" is a number that indicates how many connections the network should try to attain. If the number of connections is less that this, it will send out node requests until it reaches that number. By default this is 5.

This code simply uses `file.store()` to store the number in `#target` to `network-settings.json`.

```javascript
// saving the "target number of connections"
document.getElementById('target-save').addEventListener('click',() => {
    var min = document.getElementById('target').value
    file.store('target-connections',min,'network-settings',() => {
        document.getElementById('curr').textContent = min
        document.getElementById('min-save').classList -= 'hidden'
    })
})
```

###### Advertise

`advertise` is the variable used when creating error messages. All we need to do is get a value from the dropdown and store it in `network-settings.json`.

```javascript
// saving the advertise toggle
document.getElementById('save').addEventListener('click',() => {
    var options = document.getElementById('advertise')
    file.store('advertise',options.value,'network-settings',() => {
        document.getElementById('ad-save').classList -= 'hidden'
    })
})
```

###### Clear connections

This simply wipes `connections.json` and calls the `connect()` function. It also sets `#connections`, the counter in the corner, to 0.

```javascript
// refreshing the cache
document.getElementById('refresh').addEventListener('click',() => {
    file.storeAll('connections','[]')
    document.getElementById('connections').textContent = 0
    network.connect()
    document.getElementById('re-save').classList -= 'hidden'
})
```

##### Application Settings

Application settings is even simpler, as all I can think to put in it is:

- Clear data in `%APPDATA%`
- Save `wallets.json` to somewhere else
- show version number

`app-settings.html` looks like this:

```html
<h1>Settings</h1>

<h2>App Settings</h2>

<p>Application Version: <span id="version"></span></p>

<h3>Save wallets</h3>
<p>Save wallets.json to somewhere in your computer.</p>
<button id="save">Save</button>

<h3>Clear cached file</h3>
<p>Warning - this will delete any pending transactions, and you will have to redownload the blockchain. It will not delete your wallets.</p>
<button id="clear">Clear cache</button>
<p id="ca-save" class="hidden">Cache cleared</p>
```

The outer Javascript looks like this:

```javascript
const file = require('../file.js')
const version = require('../../package.json').version
const fs = require('fs')
const network = require('../network.js')
const dialog = require('electron').remote.dialog

function init() {
    // stuff goes here
}

exports.init = init
```

There are some extra inports in this file. We import both `fs` and `file.js`, because `file.js` can only store stuff in `%APPDATA%`. `dialog` is a part of Electron, and as such we need to access it through `electron.remote`.

I retrieved the version number by using `require()` on `package.json`, which is where that is stored. Getting the property `version` from that gives us the application version directly. We then set the version number using:

```javascript
document.getElementById('version').textContent = version
```

Next we need to save `wallets.json`. When the button is pressed, it uses `file.getAll()` to get `wallets.json`. It then opens a save dialog using `dialog.showSaveDialog()`. The "filters" are used for the extension dropdown thing in Windows. In the callback we get the file path, and use `fs.writeFile()` to save `wallets.json` to that file.

```javascript
document.getElementById('save').addEventListener('click',() => {
    file.getAll('wallets',(data) => {
        dialog.showSaveDialog({
                filters: [
                    // set default extensions
                    {name:'JSON',extensions:['json']},
                    {name:'All files',extensions:['*']}
                ]
            },(file) => {
            fs.writeFile(file,data,(err) => {
                if (err) throw err
            })
        })
    })
})
```

This solution used http://mylifeforthecode.com/getting-started-with-standard-dialogs-in-electron/

Next is the "clear cache" button. This sets all the files to their empty values, which is self-explanatory. It then sets `#connections` to 0 and calls `network.connect()`.

```javascript
document.getElementById('clear').addEventListener('click',() => {
    file.storeAll('blockchain',{})
    file.storeAll('balances',{})
    file.storeAll('connections',[])
    file.storeAll('network-settings',{"advertise":"true","target-connections":5})
    file.storeAll('recent-connections',[])
    file.storeAll('txpool',[])
    file.storeAll('recenttx',[])
    file.storeAll('sent',[])
    file.storeAll('error-log',[])
    document.getElementById('ca-save').classList.remove('hidden')
    document.getElementById('connections').textContent = 0
    console.warn('All files wiped')
    network.connect(false)
})
```

Notice that `network-settings.json` has its default values set.

### Final Touches

These are minor improvements that were not major enough to warrent their own section.

#### Moving CSS

I moved the CSS to a new folder called `/static`. I also downloaded the font-awesome file to this folder. I then changed `index.html` to this:

```html
<head>
    <meta charset="utf-8">
    <title>Arbitra Client</title>
    <link rel="stylesheet" href="static/style.css"/>
    <script defer src="renderer.js" type="text/javascript"></script>
    <script defer src="static/fontawesome.min.js"></script>
</head>
```

#### Height counter

In the original concept, I had included several counters beneath the balance total. I had removed all of these except `#connections` as that was the only one that worked. However, I liked having multiple counters so I decided to add one back in. Since it is easy to get the height of the top block, I decided to display the length of the blockchain.

I changed `index.html` to this:

```html
<ul>
    <li><i class="fa fa-fw fa-rss" aria-hidden="true"></i> <span id="connections">0</span> connections</li>
    <li><i class="fa fa-fw fa-chain" aria-hidden="true"></i> <span id="height">0</span> blocks in blockchain</li>
</ul>
```

`.fa-chain` is a chain icon. I also added `.fa-fw` to both icons so that they are a fixed width.

This looks like this:

![chain length](https://i.imgur.com/eB37Y9W.png)

Then, at the end of `blockchain.getTopBlock()`, I updated the counter

```javascript
                    ...
                    if (candidate) {
                        best = key
                    }
                }
            }
            document.getElementById('height').textContent = fullchain[best].height
        }
    } else {
        best = null
    }
    callback(best)
}
```

I also set it to 0 in the "clear cache" function in `app-settings`.

#### Icon and Splash Screen

I wanted for the application to have an icon, as otherwise the Electron logo is used. I made this in paint in about 30 seconds:

![au icons](https://i.imgur.com/HhO0MkZ.png)

I stored this in `/static`.

In `main.js`, I set the icon.

```javascript
win = new BrowserWindow({
    width: 1280,
    height: 720,
    frame: false,
    icon: 'static/au-icon.png'
})
```

Something that had irritated me through development is that the application displays the HTML before the Javascript is fully loaded, so there is a time when the buttons are unresponsive but there is no indication that that is the case.

However, since `#body` is blank until the Javascript loads, after which it is replaced by the associated page, I realised that I could set `#body` to display the icon, and it would disappear when the Javascript loads. This visually indicates that the application is loaded.

I therefore added the icon to `index.html`

```html
<div id="body">
    <img src="static/au-icon.png" alt="splash image">
</div>
```

I added the following CSS to centralise it:

```css
#body > img {
    margin-top: calc(50vh - 100px);
    margin-left: calc(50% - 50px);
}
```

I then started the application to test it.

![splash screen](https://i.imgur.com/sMCykMz.png)

It worked, and was replaced by the `overview` page after a couple of seconds.

#### Overview page

Since `overview.js` doesn't do anything, and since it is loaded every time the application starts, I realised it would be a good place to make sure that all the JSON files exist. It is pretty much the same as the function in `app-settings.js`, but only sets a file to their empty state if they don't exist.

```javascript
const file = require('../file')
const blockchain = require('../blockchain.js')
function init() {
    // since it runs when you start the program
    // might as well check all the files exist
    file.getAll('txpool',(data) => {
        if (data === null || data === '') {
            file.storeAll('txpool',[])
        }
    })
    file.getAll('network-settings',(data) => {
        if (data === null || data === '') {
            var defaults = {
                "advertise": "true",
                "target-connections": 5
            }
            file.storeAll('network-settings',defaults)
        }
    })
    file.getAll('blockchain',(data) => {
        if (data === null || data === '' || data === '[]') {
            file.storeAll('blockchain',{})
        }
    })
    file.getAll('balances',(data) => {
        if (data === null || data === '' || data === '[]') {
            file.storeAll('blockchain',{})
        }
    })
    file.getAll('connections',(data) => {
        if (data === null || data === '') {
            file.storeAll('connections',[])
        }
    })
    file.getAll('recent-connections',(data) => {
        if (data === null || data === '') {
            file.storeAll('recent-connections',[])
        }
    })
}

exports.init = init
```

I also realised that if a person tries to mine the blockchain without a wallet, it would break. Therefore, if `wallets.json` is empty, I generated a new wallet called "My Wallet". This way, everyone starts with a wallet.

```javascript
file.getAll('wallets',(data) => {
    if (data === null || data === '' || data === '{}') {
        ecdsa.createKeys((public, private, err) => {
            if(err) {
                console.error(err)
                alert(err)
            } else {
                var wallet = {
                    "name": "My Wallet",
                    "public": public,
                    "private": private,
                    "amount": 0
                }
                file.storeAll('wallets',[wallet])
            }
        })
    }
})
```