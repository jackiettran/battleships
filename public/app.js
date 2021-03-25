document.addEventListener('DOMContentLoaded', () => { // Makes sure dom is loaded first before executing the rest of the script
  const width = 10
  
  const userGrid = document.querySelector('.grid-user')
  const computerGrid = document.querySelector('.grid-computer')
  const displayGrid = document.querySelector('.grid-display')
  const ships = document.querySelectorAll('.ship')

  const destroyer = document.querySelector('.destroyer-container')
  const submarine = document.querySelector('.submarine-container')
  const cruiser = document.querySelector('.cruiser-container')
  const battleship = document.querySelector('.battleship-container')
  const carrier = document.querySelector('.carrier-container')

  const startButton = document.querySelector('#start')
  const rotateButton = document.querySelector('#rotate')
  const turnDisplay = document.querySelector('#whose-go')
  const infoDisplay = document.querySelector('#info')

  const singlePlayerButton = document.querySelector('#singlePlayerButton')
  const multiplayerButton = document.querySelector('#multiplayerButton')

  const userSquares = []
  const computerSquares = []

  let isHorizontal = true

  let isGameOver = false
  let currentPlayer = 'user'

  let gameMode = ''
  let playerNum = 0
  let ready = false
  let enemyReady = false
  let allShipsPlaced = false
  let shotFired = -1

  // Select Player Mode
  singlePlayerButton.addEventListener('click', startSinglePlayer)
  multiplayerButton.addEventListener('click', startMultiplayer)




  // Multiplayer
  function startMultiplayer() {
    gameMode = 'multiplayer'

    const socket = io()

    // Get your player number
    socket.on('player-number', num => { // listening to transmission titled player-number
      playerNum = parseInt(num)
      if (playerNum === -1) {
        infoDisplay.innerHTML = 'Sorry, the server is full'
      } else {
        if (playerNum === 1) currentPlayer = "enemy"
  
        console.log(playerNum)

        // Get other player status
        socket.emit('check-players')
      }
    }) 

    // Another player has connected or disconnected
    socket.on('player-connection', num => {
      console.log(`Player number ${num} has connected or disconnected`)
      playerConnectedOrDisconnected(num)
    })

    // On enemy ready
    socket.on('enemy-ready', num => {
      enemyReady = true
      playerReady(num)
      if(ready) playGameMulti(socket)
    })

    // Check player status
    socket.on('check-players', players => {
      players.forEach((p, i) => {
        if (p.connected) playerConnectedOrDisconnected(i)
        if (p.ready) {
          playerReady(i)
          if (i !== playerReady) enemyReady = true // playerReady??
        }
      })
    })

    // On Timeout
    socket.on('timeout', () => {
      infoDisplay.innerHTML = 'You have reached the 10 minute limit'
    })

    // Ready button click
    startButton.addEventListener('click', () => {
      if(allShipsPlaced) {
        infoDisplay.innerHTML = ""
        playGameMulti(socket)
      }
      else {
        infoDisplay.innerHTML = "Please place all ships"
      }
    })

    // Setup event listeners for firing
    computerSquares.forEach(square => {
      square.addEventListener('click', () => {
        if (currentPlayer === 'user' && ready && enemyReady) {
          shotFired = square.dataset.id
          socket.emit('fire', shotFired)
        }
      })
    })

    // On Fire Received
    socket.on('fire', id => {
      enemyGo(id)
      const square = userSquares[id]
      socket.emit('fire-reply', square.classList)
      playGameMulti(socket)
    })

    // On Fire Reply Receieved
    socket.on('fire-reply', classList => {
      revealSquare(classList)
      playGameMulti(socket)
    })

    function playerConnectedOrDisconnected(num) {
      let player = `.p${parseInt(num) + 1}`
      document.querySelector(`${player} .connected span`).classList.toggle('green')
      if(parseInt(num) === playerNum) {
        document.querySelector(player).style.fontWeight = 'bold'
      }
    }
  }

  // Single Player
  function startSinglePlayer() {
    gameMode = 'singlePlayer'

    for (let i = 0; i < shipArray.length; i++) {
      generate(shipArray[i])
    }

    startButton.addEventListener('click', playGameSingle)

  }

  // Create board
  function createBoard(grid, squares) {
    for(let i = 0; i < width * width; i++) {
      const square = document.createElement('div')
      square.dataset.id = i
      grid.appendChild(square)
      squares.push(square)
    }
  }

  createBoard(userGrid, userSquares)
  createBoard(computerGrid, computerSquares)
  
  // Ships
  const shipArray = [
    {
      name: 'destroyer',
      directions: [
        [0, 1], // horizontal
        [0, width] // vertical 
      ]
    },
    {
      name: 'submarine',
      directions: [
        [0, 1, 2], // horizontal
        [0, width, width*2] // vertical 
      ]
    },
    {
      name: 'cruiser',
      directions: [
        [0, 1, 2], // horizontal
        [0, width, width*2] // vertical 
      ]
    },
    {
      name: 'battleship',
      directions: [
        [0, 1, 2, 3], // horizontal
        [0, width, width*2, width*3] // vertical 
      ]
    },
    {
      name: 'carrier',
      directions: [
        [0, 1, 2, 3, 4], // horizontal
        [0, width, width*2, width*3, width*4] // vertical 
      ]
    }
  ]

  // Draw the computer's ship in random locations
  function generate(ship) {
    let randomDirection = Math.floor(Math.random() * ship.directions.length)
    let current = ship.directions[randomDirection]
    if (randomDirection === 0) direction = 1
    if (randomDirection === 1) direction = 10
    let randomStart = Math.abs(Math.floor(Math.random() * computerSquares.length - (ship.directions[0].length * direction)))

    const isTaken = current.some(index => computerSquares[randomStart + index].classList.contains('taken'))
    const isAtRightEdge = current.some(index => (randomStart + index) % width === width - 1)
    const isAtLeftEdge = current.some(index => (randomStart + index) % width === 0)

    if (!isTaken && !isAtRightEdge && !isAtLeftEdge) current.forEach(index => computerSquares[randomStart + index].classList.add('taken', ship.name))

    else generate(ship)
  }
  
  //Rotate the ships
  function rotate() {
    destroyer.classList.toggle('destroyer-container-vertical')
    submarine.classList.toggle('submarine-container-vertical')
    cruiser.classList.toggle('cruiser-container-vertical')
    battleship.classList.toggle('battleship-container-vertical')
    carrier.classList.toggle('carrier-container-vertical')
    isHorizontal = !isHorizontal
    return
  }

  rotateButton.addEventListener('click', rotate)

  // Move around user ship
  ships.forEach(ship => ship.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragstart', dragStart))
  userSquares.forEach(square => square.addEventListener('dragover', dragOver))
  userSquares.forEach(square => square.addEventListener('dragenter', dragEnter))
  userSquares.forEach(square => square.addEventListener('dragleave', dragLeave))
  userSquares.forEach(square => square.addEventListener('drop', dragDrop))
  userSquares.forEach(square => square.addEventListener('dragend', dragEnd))

  let selectedShipNameWithIndex
  let draggedShip
  let draggedShipLength

  ships.forEach(ship => ship.addEventListener('mousedown', (e) => {
    selectedShipNameWithIndex = e.target.id
  }))

  function dragStart(e) {
    draggedShip = this
    draggedShipLength = this.childNodes.length
  }

  function dragOver(e) {
    e.preventDefault()
  }

  function dragEnter(e) {
    e.preventDefault()
  }

  function dragLeave(e) {
    e.preventDefault()
  }

  function dragDrop() {
    let shipNameWithLastId = draggedShip.lastChild.id
    let shipClass = shipNameWithLastId.slice(0, -2)
    console.log(shipClass)
    let lastShipIndex = parseInt(shipNameWithLastId.substr(-1))
    let shipLastId = lastShipIndex + parseInt(this.dataset.id)
    let selectedShipIndex = parseInt(selectedShipNameWithIndex.substr(-1))
    shipLastId = shipLastId - selectedShipIndex

    let willWrapHorizontal = false
    if (shipLastId % 10 + 1 < draggedShipLength) {
      willWrapHorizontal = true
    }

    let willWrapVertical = false
    let lastVerticalIndex = parseInt(this.dataset.id) - (selectedShipIndex * width) + width * draggedShipLength
    if (lastVerticalIndex > 109 || lastVerticalIndex < 10) {
      willWrapVertical = true
    }

    if (isHorizontal && !willWrapHorizontal) {
      for (let i = 0; i < draggedShipLength; i++) {
        if (userSquares[parseInt(this.dataset.id) - selectedShipIndex + i].classList.contains('taken')) return
      }
      for (let j = 0; j < draggedShipLength; j++) {
        userSquares[parseInt(this.dataset.id) - selectedShipIndex + j].classList.add('taken', shipClass)
      }
      displayGrid.removeChild(draggedShip)
    } else if (!isHorizontal && !willWrapVertical) {
      for (let i = 0; i < draggedShipLength; i++) {
        if(userSquares[parseInt(this.dataset.id) - (selectedShipIndex * width) + width * i].classList.contains('taken')) return
      }
      for (let j = 0; j < draggedShipLength; j++) {
        userSquares[parseInt(this.dataset.id) - (selectedShipIndex * width) + width * j].classList.add('taken', shipClass)
      }
      displayGrid.removeChild(draggedShip)
    } else {
      return
    }
    if(!displayGrid.querySelector('.ship')) allShipsPlaced = true
  }

  function dragEnd() {
    
  }

  // Game Logic for Multiplayer
  function playGameMulti(socket) {
    if (isGameOver) return
    if (!ready) {
      socket.emit('player-ready')
      ready = true
      playerReady(playerNum)
    }

    if (enemyReady) {
      if (currentPlayer === 'user') {
        turnDisplay.innerHTML = 'Your Go'
      }
      if (currentPlayer === 'enemy') {
        turnDisplay.innerHTML = 'Enemy\'s Go'
      }
    }
  }

  function playerReady(num) {
    let player = `.p${parseInt(num) + 1}`
    document.querySelector(`${player} .ready span`).classList.toggle('green')
  }

  // Game Logic for Single Player
  function playGameSingle() {
    if (isGameOver) return
    if (currentPlayer === 'user') {
      computerSquares.forEach(square => square.addEventListener('click', function(e) {
        shotFired = square.dataset.id
        revealSquare(square.classList)
      }))
    } else if (currentPlayer === 'enemy') {
      turnDisplay.innerHTML = 'Computer\'s Go'
      setTimeout(enemyGo, 1000)
    }
  }

  let destroyerCount = 0
  let submarineCount = 0
  let cruiserCount = 0
  let battleshipCount = 0
  let carrierCount = 0

  function revealSquare(classList) {
    const enemySquare = computerGrid.querySelector(`div[data-id='${shotFired}']`)
    const obj = Object.values(classList)
    if (!enemySquare.classList.contains('boom') && currentPlayer === 'user' && !isGameOver) {
      if (obj.includes('destroyer')) destroyerCount++
      if (obj.includes('submarine')) submarineCount++
      if (obj.includes('cruiser')) cruiserCount++
      if (obj.includes('battleship')) battleshipCount++
      if (obj.includes('carrier')) carrierCount++
    }

    if (obj.includes('taken')) {
      enemySquare.classList.add('boom')
    } else {
      enemySquare.classList.add('miss')
    }
    checkForWins()
    currentPlayer = 'enemy'
    if (gameMode === 'singlePlayer') playGameSingle()
  }

  let computerDestroyerCount = 0
  let computerSubmarineCount = 0
  let computerCruiserCount = 0
  let computerBattleshipCount = 0
  let computerCarrierCount = 0

  function enemyGo(square) {
    if (gameMode === 'singlePlayer') square = Math.floor(Math.random() * userSquares.length)
    if (!userSquares[square].classList.contains('boom')) {
      userSquares[square].classList.add('boom')
      if (userSquares[square].classList.contains('submarine')) computerSubmarineCount++
      if (userSquares[square].classList.contains('cruiser')) computerCruiserCount++
      if (userSquares[square].classList.contains('destroyer')) computerDestroyerCount++
      if (userSquares[square].classList.contains('battleship')) computerBattleshipCount++
      if (userSquares[square].classList.contains('carrier')) computerCarrierCount++
      checkForWins()
    } else if (gameMode === 'singlePlayer') enemyGo()
    currentPlayer = 'user'
    turnDisplay.innerHTML = 'Your Go'
  }

  let computerScore = 0
  let userScore = 0

  function checkForWins() {
    let enemy = 'computer'
    if (gameMode === 'multiplayer') enemy = 'enemy'
    infoDisplay.innerHTML = ""

    if (computerDestroyerCount === 2) {
      infoDisplay.innerHTML = `The ${enemy} sunk your destroyer`
      computerScore += 10
      computerDestroyerCount = -1
    }
    if (computerSubmarineCount === 3) {
      infoDisplay.innerHTML = `The ${enemy} sunk your submarine`
      computerScore += 10
      computerSubmarineCount = -1
    }
    if (computerCruiserCount === 3) {
      infoDisplay.innerHTML = `The ${enemy} sunk your cruiser`
      computerScore += 10
      computerCruiserCount = -1
    }
    if (computerBattleshipCount === 4) {
      infoDisplay.innerHTML = `The ${enemy} sunk your battleship`
      computerScore += 10
      computerBattleshipCount = -1
    }
    if (computerCarrierCount === 5) {
      infoDisplay.innerHTML = `The ${enemy} sunk your carrier`
      computerScore += 10
      computerCarrierCount = -1
    }

    if (destroyerCount === 2) {
      infoDisplay.innerHTML = `You sunk the ${enemy}\'s destroyer`
      userScore += 10
      destroyerCount = -1
    }
    if (submarineCount === 3) {
      infoDisplay.innerHTML = `You sunk the ${enemy}\'s submarine`
      userScore += 10
      submarineCount = -1
    }
    if (cruiserCount === 3) {
      infoDisplay.innerHTML = `You sunk the ${enemy}\'s cruiser`
      userScore += 10
      cruiserCount = -1
    }
    if (battleshipCount === 4) {
      infoDisplay.innerHTML = `You sunk the ${enemy}\'s battleship`
      userScore += 10
      battleshipCount = -1
    }
    if (carrierCount === 5) {
      infoDisplay.innerHTML = `You sunk the ${enemy}\'s carrier`
      userScore += 10
      carrierCount = -1
    }

    if (computerScore === 50) {
      infoDisplay.innerHTML = `${enemy.toUpperCase()} WINS`
      gameOver()
    }

    console.log(userScore)
    if (userScore === 50) {
      infoDisplay.innerHTML = 'YOU WIN'
      gameOver()
    }
  }

  function gameOver() {
    isGameOver = true
    startButton.removeEventListener('click', playGameSingle)
  }

})

// ctrl + f (forward)
// ctrl + b (back)
// ctrl + e (end)
// ctrl + a (beginning)
// ctrl + p (up)
// ctrl + n (down)
// hold option and click to put cursors
// highlight a word and cmd + d to select the word and the matching one
// option + cmd + up or down arrow to add cursors
// escape to go back to single cursor
// shift + opt + up or down arrow to duplicate line
// highlight word, F2 find and replace