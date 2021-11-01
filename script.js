const DAY_TICKS = 720;
const WEEK_TICKS = 5040;

class Motive {
  constructor({
    happyLife = 0,
    happyWeek = 0,
    happyDay = 0,
    happyNow = 0,

    physical = 0,
    energy = 0,
    comfort = 0,
    hunger = 0,
    hygiene = 0,
    bladder = 0,

    mental = 0,
    alertness = 0,
    stress = 0,
    environment = 0,
    social = 0,
    entertained = 0,
  } = {}) {
    Object.assign(this, {
      happyLife, happyWeek, happyDay, happyNow,
      physical, energy, comfort, hunger, hygiene, bladder,
      mental, alertness, stress, environment, social, entertained,
    });
  }

  clamp() {
    for (let p of Object.getOwnPropertyNames(this)) {
      if (this[p] < -100)
        this[p] = -100;
      else if (this[p] > 100)
        this[p] = 100;
    }
    return this;
  }

  freeze() {
    Object.freeze(this);
    return this;
  }
}

class Sim {
  constructor() {
    this.clockH = 8; this.clockM = 0;
    this.oldMotive = new Motive().freeze();
    this.motive = new Motive({energy: 70, alertness: 20, hunger: -40}).freeze();
  }

  tick() {
    this.clockM += 2; // inc game clock (Jamie, are you there?)
    if (this.clockM > 58) {
      this.clockM = 0;
      this.clockH++;
      if (this.clockH > 24) this.clockH = 1;
    }
    const m = new Motive(this.motive);
    // energy
    if (m.energy > 0) {
      if (m.alertness > 0)
        m.energy -= (m.alertness / 100);
      else
        m.energy -= (m.alertness / 100) * ((100 - m.energy) / 50);
    } else {
      if (m.alertness > 0)
        m.energy -= (m.alertness / 100) * ((100 + m.energy) / 50);
      else
        m.energy -= (m.alertness / 100);
    }
    if (m.hunger > this.oldMotive.hunger) // I had some food
      m.energy += (m.hunger - this.oldMotive.hunger) / 4;
    // comfort
    if (m.bladder < 0)
      m.comfort += m.hygiene / 10; // max -10
    if (m.hygiene < 0)
      m.comfort += m.hygiene / 20; // max -5
    if (m.hunger < 0)
      m.comfort += m.hunger / 20; // max -5
    // dec a max 100/cycle in a cubed curve (seek zero)
    m.comfort -= (m.comfort * m.comfort * m.comfort) / 10000;
    // hunger
    m.hunger -= ((m.alertness + 100) / 200) * ((m.hunger + 100) / 100); // ^alert * hunger/^0
    if (m.stress < 0) // stress -> hunger
      m.hunger += (m.stress / 100) * ((m.hunger + 100) / 100);
    if (m.hunger < -99) {
      alert('You have starved to death');
      m.hunger = 80;
    }
    // hygiene
    if (m.alertness > 0) m.hygiene -= .3;
    else m.hygiene -= .1;
    if (m.hygiene < -97) { // hit limit, bath
      alert('You need to work harder to become a farming tycoon!')
      m.hygiene = 80;
    }
    // bladder
    if (m.alertness > 0) m.bladder -= .4; // bladder fills faster while awake
    else m.bladder -= .2;
    if (m.hunger > this.oldMotive.hunger) // food eaten goes into bladder
      m.bladder -= (m.hunger - this.oldMotive.hunger) / 4;
    if (m.bladder < -97) { // hit limit, gotta go
      if (m.alertness < 0)
        alert('You need to rest.')
      else
        alert('You are burning out as a farmer!')
      m.bladder = 90;
    }
    // alertness
    const v = (m.alertness > 0 ? 100 - m.alertness : m.alertness + 100) / 50; // max delta at 0
    if (m.energy > 0) {
      if (m.alertness > 0)
        m.alertness += (m.energy / 100) * v;
      else
        m.alertness += (m.energy / 100);
    } else {
      if (m.alertness > 0)
        m.alertness += (m.energy / 100);
      else
        m.alertness += (m.energy / 100) * v;
    }
    m.alertness += (m.entertained / 300) * v;
    if (m.bladder < -50)
      m.alertness -= (m.bladder / 100) * v;
    // stress
    m.stress += m.comfort / 10; // max -10
    m.stress += m.entertained / 10; // max -10
    m.stress += m.environment / 15; // max -7
    m.stress += m.social / 20; // max -5
    if (m.alertness < 0) // cut stress while asleep
      m.stress /= 3;
    // dec a max 100/cycle in a cubed curve (seek zero)
    m.stress -= (m.stress * m.stress * m.stress) / 10000;
    if (m.stress < 0) {
      if ((Math.random() * 30 - 100) > m.stress) {
        if ((Math.random() * 30 - 100) > m.stress) {
          alert('You have lost your temper are your farm workers!');
          m.stress += 20;
          if (m.stress > 100) m.stress = 100;
        }
      }
    }
    // environment
    // social
    // entertained
    if (m.alertness < 0) // cut entertained while asleep
      m.entertained /= 2;
    // calc physical
    let x = m.energy;
    x += m.comfort;
    x += m.hunger;
    x += m.hygiene;
    x += m.bladder;
    x /= 5;
    if (x > 0) { // map the linear average into squared curve
      x = 100 - x;
      x = (x * x) / 100;
      x = 100 - x;
    } else {
      x = 100 + x;
      x = (x * x) / 100;
      x = x - 100;
    }
    m.physical = x;
    // calc mental
    x += m.stress * 2; // stress counts *2
    x += m.environment;
    x += m.social;
    x += m.entertained;
    x /= 5;
    if (x > 0) { // map the linear average into squared curve
      x = 100 - x;
      x = (x * x) / 100;
      x = 100 - x;
    } else {
      x = 100 + x;
      x = (x * x) / 100;
      x = x - 100;
    }
    m.mental = x;
    // calc and average happiness
    // happy = mental + physical
    m.happyNow = (m.physical + m.mental) / 2;
    m.happyDay = ((m.happyDay * (DAY_TICKS - 1)) + m.happyNow) / DAY_TICKS;
    m.happyWeek = ((m.happyWeek * (WEEK_TICKS - 1)) + m.happyNow) / WEEK_TICKS;
    m.happyLife = ((m.happyLife * 9) + m.happyWeek) / 10;
    // save old motives (for delta tests)
    this.oldMotive = this.motive;
    this.motive = m.clamp().freeze();
    if (this.onchange) this.onchange(new CustomEvent('change'));
  }

  work() {
    this.clockH += 9;
    if (this.clockH > 24) this.clockH -= 24;
    const m = new Motive(this.motive);
    m.energy = ((m.energy + 100) * .3) - 100;
    m.hunger = -60 + Math.random() * 20;
    m.hygiene = -70 + Math.random() * 30;
    m.bladder = -50 + Math.random() * 50;
    m.alertness = 10 + Math.random() * 10;
    m.stress = -50 + Math.random() * 50;
    this.motive = m.clamp().freeze();
    if (this.onchange) this.onchange(new CustomEvent('change'));
  }
}

const sim = new Sim();
sim.onchange = () => {
  for (let p of Object.getOwnPropertyNames(sim.motive)) {
    document.getElementById(p).value = sim.motive[p];
  }
  document.getElementById('time').textContent = `${sim.clockH}:${sim.clockM < 10 ? '0' + sim.clockM : sim.clockM}`;
};
sim.onchange();

let tickInterval;
document.getElementById('autotick').onchange = function () {
  clearInterval(tickInterval);
  if (this.checked) tickInterval = setInterval(() => sim.tick(), 100);
};


const board = [
    {
      name: 'PeaceFare Monopoly Game',
      fill: '#a81a2b',
    },
    {
      name: 'Mediterranean Avenue $60',
      fill: '#8B4513',
    },
    {
      name: 'Free Manure',
    },
    {
      name: 'Free Manure Deed $60',
      fill: '#8B4513',
    },
    {
      name: 'Purchasing Property (pay $200)',
    },
    {
      name: 'Big Red Barn Deed $200',
    },
    {
      name: 'Farmer’s Fate $100',
      fill: '#87CEEB',
    },
    {
      name: 'Chance',
    },
    {
      name: 'Insurance Crops $100',
      fill: '#87CEEB',
    },
    {
      name: 'Hay Cutting Drive $120',
      fill: '#87CEEB',
    },
    {
      name: 'In PeaceFare Jail',
    },
    {
      name: 'Livestock Sales $140',
      fill: '#9932CC',
    },
    {
      name: 'Free Manure $150',
    },
    {
      name: 'Catfish Pond Deed $140',
      fill: '#9932CC',
    },
    {
      name: 'Cattle Call Deed $160',
      fill: '#9932CC',
    },
    {
      name: 'Pest Infestation Cost $200',
    },
    {
      name: 'Drought PeaceFare Cost $180',
      fill: '#FFA500',
    },
    {
      name: 'Community Chest',
    },
    {
      name: 'Free Manure Add $180',
      fill: '#FFA500',
    },
    {
      name: 'Catfish Pond $200',
      fill: '#FFA500',
    },
    {
      name: 'Free Parking',
    },
    {
      name: 'Hay Cutting Drive $220',
      fill: '#FF0000',
    },
    {
      name: 'Chance',
    },
    {
      name: 'Apply Harvest $220',
      fill: '#FF0000',
    },
    {
      name: 'If Alice player1 Add $200',
      fill: '#FF0000',
    },
    {
      name: 'If Bob player2 add $200',
    },
    {
      name: 'Bale Out Blvd $260',
      fill: '#FFFF00',
    },
    {
      name: 'Big Red Barn $260',
      fill: '#FFFF00',
    },
    {
      name: 'Water Works $150',
    },
    {
      name: 'Free Manure $280',
      fill: '#FFFF00',
    },
    {
      name: 'Go To Jail',
    },
    {
      name: 'Catfish Pond $300',
      fill: '#008000',
    },
    {
      name: 'Insurance Crops $300',
      fill: '#008000',
    },
    {
      name: 'Community Chest',
    },
    {
      name: 'Purchasing Property $320',
      fill: '#008000',
    },
    {
      name: 'Short Line $200',
    },
    {
      name: 'Chance',
    },
    {
      name: 'HarvestFest $350',
      fill: '#0000FF',
    },
    {
      name: 'Luxury Tax (pay $100)',
    },
    {
      name: 'Livestock Sales $400',
      fill: '#0000FF',
    },
  ];

// SVG CODE
// utility function creating the svg code for the properties
function svgProperty(name, fill, x, y) {
return `
    <g transform="translate(${x * 100} ${y * 100})">
        <rect x="0" y="0" width="100" height="100" stroke="hsl(0, 0%, 0%)" stroke-width="5" fill="hsl(0, 0%, 100%)" />
        <g>
            <rect x="2.5" y="2.5" width="95" height="20" stroke="none" fill="${fill}" />
            <g transform="translate(50 40)">
                <text text-anchor="middle" font-size="12">
                ${name
                .split(' ')
                .map(
                    (line, num) =>
                    `<tspan x="0" y="${num * 15}">${line}</tspan>`
                )
                .join('')}
                </text>
            </g>
        </g>
    </g>
    `;
}
// utility function creating the svg code for the other sections
function svgSection(name, x, y) {
return `
    <g transform="translate(${x * 100} ${y * 100})">
        <rect x="0" y="0" width="100" height="100" stroke="currentColor" stroke-width="5" fill="hsl(0, 0%, 100%)" />

        <g transform="translate(50 50)">
            <text text-anchor="middle" dominant-baseline="middle">
            ${name
            .split(' ')
            .map(
                (line, num, { length }) =>
                `<tspan x="0" y="${num * 15 -
                    ((length - 1) / 2) * 15}">${line}</tspan>`
            )
            .join('')}
            </text>
        </g>
    </g>
    `;
}

// utility function returning the x and y values of a section in the overall board
// ! remember to multiply the values by 100 to consider the full width / height of the individual elements
function translateSection(index) {
const i = index % board.length;
if (i < 11) {
    return { x: i * -1 };
}
if (i < 21) {
    return { x: -10, y: (i - 10) * -1 };
}
if (i < 31) {
    return { x: -10 + (i - 20), y: -10 };
}
return { y: -10 + (i - 30) };
}

// target the parent svg and add a group element for each element in the board
const svg = document.querySelector('svg');

svg.innerHTML = board
.map(({ name, fill }, i) => {
    const { x = 0, y = 0 } = translateSection(i);
    return fill ? svgProperty(name, fill, x, y) : svgSection(name, x, y);
})
.join('');


// ZDOG code
// based on a previous project
//   https://codepen.io/borntofrappe/pen/PooeQvG
const { Illustration, Group, Anchor, Rect, TAU, Ellipse } = Zdog;
const element = document.querySelector('canvas');
const illustration = new Illustration({
    element,
});

// anchor point used for the rotation
const dice = new Anchor({
    addTo: illustration,
});

// group describing the faces through rounded rectangles
const faces = new Group({
    addTo: dice,
});
// due to the considerable stroke, it is possible to fake the dice using four faces only
const face = new Rect({
    addTo: faces,
    stroke: 50,
    width: 50,
    height: 50,
    color: 'hsl(0, 0%, 100%)',
    translate: {
        z: -25,
    },
});

// rotate the faces around the center
face.copy({
    rotate: {
        x: TAU / 4,
    },
    translate: {
        y: 25,
    },
});

face.copy({
    rotate: {
        x: TAU / 4,
    },
    translate: {
        y: -25,
    },
});

face.copy({
    translate: {
        z: 25,
    },
});

// include the dots repeating as many shapes/groups as possible
// ! when copying an element be sure to reset the rotation/translation of the copied shape
const one = new Ellipse({
    addTo: dice,
    diameter: 15,
    stroke: false,
    fill: true,
    color: 'hsl(0, 0%, 0%)',
    translate: {
        z: 50,
    },
});

const two = new Group({
    addTo: dice,
    rotate: {
        x: TAU / 4,
    },
    translate: {
        y: 50,
    },
});

one.copy({
    addTo: two,
    translate: {
        y: 20,
    },
});

one.copy({
    addTo: two,
    translate: {
        y: -20,
    },
});

const three = new Group({
    addTo: dice,
    rotate: {
        y: TAU / 4,
    },
    translate: {
        x: 50,
    },
});

one.copy({
    addTo: three,
    translate: {
        z: 0,
    },
    });

    one.copy({
    addTo: three,
    translate: {
        x: 20,
        y: -20,
        z: 0,
    },
});

one.copy({
    addTo: three,
    translate: {
        x: -20,
        y: 20,
        z: 0,
    },
});

const four = new Group({
    addTo: dice,
    rotate: {
        y: TAU / 4,
    },
    translate: {
        x: -50,
    },
});

two.copyGraph({
    addTo: four,
    rotate: {
        x: 0,
    },
    translate: {
        x: 20,
        y: 0,
    },
});

two.copyGraph({
    addTo: four,
    rotate: {
        x: 0,
    },
    translate: {
        x: -20,
        y: 0,
    },
});

const five = new Group({
    addTo: dice,
    rotate: {
        x: TAU / 4,
    },
    translate: {
        y: -50,
    },
});

four.copyGraph({
    addTo: five,
    rotate: {
        y: 0,
    },
    translate: {
        x: 0,
    },
});

one.copy({
    addTo: five,
    translate: {
        z: 0,
    },
});

const six = new Group({
    addTo: dice,
    translate: {
        z: -50,
    },
});

two.copyGraph({
    addTo: six,
    rotate: {
        x: 0,
        z: TAU / 4,
    },
    translate: {
        x: 0,
        y: 0,
    },
});

four.copyGraph({
    addTo: six,
    rotate: {
        y: 0,
    },
    translate: {
        x: 0,
    },
});

// show the static illustration
illustration.updateRenderGraph();


// BUTTON CODE
// logic following a click on the button, to animate first the illustration, than the svg

const button = document.querySelector('button');

// object animated through anime.js to update the illustration
const rotation = {
    x: 0,
    y: 0,
    z: 0,
};

// array describing the rotation necessary to highlight the difference faces
const rotate = [
{},
{
    x: TAU / 4,
},
{
    y: TAU / 4,
},
{
    y: (TAU * 3) / 4,
},
{
    x: (TAU * 3) / 4,
},
{
    x: TAU / 2,
},
];

// utility function returning a positive integer up to a maximum value
const randomInt = (max = 10) => Math.floor(Math.random() * max);

// variable describing the position in the board
let position = 1;

// function updating the viewbox according to the number described by the dice
function crawlSVG(roll) {
    // the idea is to build an array of string describing viewBox values
    // each string using the x and y coordinates described by the translateSection function
    const steps = Array(roll + 1)
        .fill()
        .map((item, index) => translateSection(position + index));
    position += roll + 1;

    // ! include the existing viewBox to avoid a "jump" toward the first section
    const viewBox = [
        svg.getAttribute('viewBox'),
        ...steps.map(({ x = 0, y = 0 }) => `${x * 100} ${y * 100} 100 100`),
    ];
    anime({
        targets: svg,
        viewBox,
        duration: 1000,
        easing: 'easeOutQuad',
        // once the animation is complete allow to click the button once more
        complete() {
        button.removeAttribute('disabled');
        },
    });
}

// function animating the dice according to the number received as input
function rollDice(side) {
    // disable the button to avoid animating the dice before the board has had a chance to update itself
    button.setAttribute('disabled', true);

    const { x = TAU, y = TAU } = rotate[side];
    // animate the object toward the input values
    anime({
        targets: rotation,
        // ! increment the input rotation with a random number of additional rotations
        x: x + TAU * randomInt(),
        y: y + TAU * randomInt(),
        z: TAU * randomInt(),
        duration: 2000,
        // while the object is being updated update the rotation of the dice
        // ! remember to update the graphic with the updateRenderGraph() method
        update() {
            dice.rotate.x = rotation.x;
            dice.rotate.y = rotation.y;
            dice.rotate.z = rotation.z;
            illustration.updateRenderGraph();
        },
        // as the animation completes, call the function to update the viewBox
        complete() {
            crawlSVG(side);
        },
    });
}

// following a click on the button call the function to roll the dice with a random value from the rotate array
button.addEventListener('click', () => rollDice(randomInt(rotate.length)));



window.onload = function() {
  //find dice role button and bind takeTurn method
  var rollButton = document.getElementById("rollButton");
  rollButton.onclick = Game.takeTurn;

  //initialize board
  Game.populateBoard();
};

//IIFE function to create game board object
var Game = (function() {
  //create a game object to hold the game board squares, methods, players
  var game = {};

  //build an array of game propreties (calling them squares, as in squares on the game board, so
  //I don't confuse them with object properties
  //there are 11 properties on the game board.
  //each has a unique name and value, so each will probably need to be built individually (not through a loop)
  game.squares = [
    new Square("Bale Out Blvd", 100, "square2"),
    new Square("Big Red Barn", 150, "square3"),
    new Square("Corn Corner", 200, "square4"),
    new Square("Pest Infestation", 250, "square5"),
    new Square("Drought", 300, "square6"),
    new Square("Land Taxes", 350, "square7"),
    new Square("Catfish Pond", 400, "square8"),
    new Square("Hay Cutting Drive", 450, "square9"),
    new Square("Free Manure", 500, "square10"),
    new Square("Cattle Call", 550, "square11"),
    new Square("Apple Harvest", 600, "square12")
  ];

  //build an array of players
  //note: initial version of the game only allows two fixed players
  game.players = [
    new Player("Alice 👩‍🌾", 1000, "Triangle", "player1"),
    new Player("Bob 👨‍🌾", 1000, "Circle", "player2")
  ];

  //set the game property for current player. Initially player 1. (Using an index of the game.players array.)
  game.currentPlayer = 0;

  //set up a method that will add the squares to the game board
  game.populateBoard = function() {
    //loop through all the squares in the game board
    for (var i = 0; i < this.squares.length; i++) {
      //get square ID from object and then find its div
      var id = this.squares[i].squareID;

      //add info to squares
      //paragraphs for square info preexist in HTML. That way they just have to be
      //updated here and I can use the same method to create and update
      var squareName = document.getElementById(id + "-name");
      var squareValue = document.getElementById(id + "-value");
      var squareOwner = document.getElementById(id + "-owner");

      squareName.innerHTML = this.squares[i].name;
      squareValue.innerHTML = "$" + this.squares[i].value;
      squareOwner.innerHTML = this.squares[i].owner;
    }

    //find the start square and add all players
    var square1 = document.getElementById("square1-residents");
    for (var i = 0; i < game.players.length; i++) {
      //using private function to create tokens
      game.players[i].createToken(square1);
    }

    //populate the info panel (using simple private function)
    updateByID("player1-info_name", game.players[0].name);
    updateByID("player1-info_cash", game.players[0].cash);
    updateByID("player2-info_name", game.players[1].name);
    updateByID("player2-info_cash", game.players[1].cash);
  };

  //public function to handle taking of turn. Should:
  //roll the dice
  //advance the player
  //call function to either allow purchase or charge rent
  game.takeTurn = function() {
    //roll dice and advance player
    movePlayer();

    //check the tile the player landed on
    //if the tile is not owned, prompt player to buy
    //if the tile is owned, charge rent and move on
    checkTile();

    //loss condition:
    //if current player drops below $0, they've lost
    if (game.players[game.currentPlayer].cash < 0) {
      alert("Sorry " + game.players[game.currentPlayer].name + ", you lose!");
    }

    //advance to next player
    game.currentPlayer = nextPlayer(game.currentPlayer);

    //update info panel with name of current player
    updateByID("currentTurn", game.players[game.currentPlayer].name);
  };

  /****                    Game-level private functions                        *****/
  //function to advance to the next player, going back to to player 1 when necessary
  //(leaving this as a private function rather than method of Player because
  //current player is more of a game level property than a player level property)
  function nextPlayer(currentPlayer) {
    var nextPlayer = currentPlayer + 1;

    if (nextPlayer == game.players.length) {
      return 0;
    }

    return nextPlayer;
  }

  //function to "roll the dice" and advance the player to the appropriate square
  function movePlayer() {
    //"dice roll". Should be between 1 and 4
    var moves = Math.floor(Math.random() * (4 - 1) + 1);
    //need the total number of squares, adding 1 because start isn't included in the squares array
    var totalSquares = game.squares.length + 1;
    //get the current player and the square he's on
    var currentPlayer = game.players[game.currentPlayer];
    var currentSquare = parseInt(currentPlayer.currentSquare.slice(6));

    //figure out if the roll will put player past start. If so, reset and give money for passing start
    if (currentSquare + moves <= totalSquares) {
      var nextSquare = currentSquare + moves;
    } else {
      var nextSquare = currentSquare + moves - totalSquares;
      currentPlayer.updateCash(currentPlayer.cash + 100);
      console.log("$100 for passing start");
    }

    //update current square in object (the string "square" plus the index of the next square)
    currentPlayer.currentSquare = "square" + nextSquare;

    //find and remove current player token
    var currentToken = document.getElementById(currentPlayer.id);
    currentToken.parentNode.removeChild(currentToken);

    //add player to next location
    currentPlayer.createToken(
      document.getElementById(currentPlayer.currentSquare)
    );
  }

  //function that checks the tile the player landed on and allows the player to act appropriately
  //(buy, pay rent, or move on if owned)
  function checkTile() {
    var currentPlayer = game.players[game.currentPlayer];
    var currentSquareId = currentPlayer.currentSquare;
    var currentSquareObj = game.squares.filter(function(square) {
      return square.squareID == currentSquareId;
    })[0];

    //check if the player landed on start
    if (currentSquareId == "square1") {
      currentPlayer.updateCash(currentPlayer.cash + 100);
      updateByID(
        "messagePara",
        currentPlayer.name + ": You landed on start. Here's an extra $100"
      );
    } else if (currentSquareObj.owner == "For Sale") {
      //If the property is unowned, allow purchase:
      //check if owner can afford this square
      if (currentPlayer.cash <= currentSquareObj.value) {
        updateByID(
          "messagePara",
          currentPlayer.name +
            ": Sorry, you can't afford to purchase this property"
        );
        return;
      }

      //prompt to buy tile
      var purchase = window.confirm(
        currentPlayer.name +
          ": This property is unowned. Would you like to purchase this property for $" +
          currentSquareObj.value +
          "?"
      );
      //if player chooses to purchase, update properties:
      if (purchase) {
        //update ownder of current square
        currentSquareObj.owner = currentPlayer.id;
        //update cash in the player object
        currentPlayer.updateCash(currentPlayer.cash - currentSquareObj.value);
        //log a message to the game board
        updateByID(
          "messagePara",
          currentPlayer.name + ": you now have $" + currentPlayer.cash
        );
        //update the owner listed on the board
        updateByID(
          currentSquareObj.squareID + "-owner",
          "Owner: " + game.players[game.currentPlayer].name
        );
      }
    } else if (currentSquareObj.owner == currentPlayer.id) {
      //if property is owned by current player, continue
      updateByID(
        "messagePara",
        currentPlayer.name + ": You own this property. Thanks for visiting!"
      );
    } else {
      //charge rent
      updateByID(
        "messagePara",
        currentPlayer.name +
          ": This property is owned by " +
          currentSquareObj.owner +
          ". You owe $" +
          currentSquareObj.rent +
          ". You now have $" +
          currentPlayer.cash
      );

      var owner = game.players.filter(function(player) {
        return player.id == currentSquareObj.owner;
      });
      currentPlayer.updateCash(currentPlayer.cash - currentSquareObj.rent);
    }
  }

  //function to update inner HTML based on element ID
  function updateByID(id, msg) {
    document.getElementById(id).innerHTML = msg;
  }

  /****                       Constructor functions                             *****/

  /*constructor function for properties (game board squares)*/
  function Square(name, value, squareID) {
    //what is this property called?
    this.name = name;
    //what's the value/initial purchase price?
    this.value = value;
    //how much rent to charge when another player lands here? (30% of square value.)
    this.rent = value * 0.3;
    //where does this appear on the game board?
    this.squareID = squareID;
    //who owns the property? (initially unowned)
    this.owner = "For Sale";
  }

  /*constructor function for players*/
  function Player(name, cash, token, id) {
    this.name = name;
    this.cash = cash;
    this.token = token;
    this.id = id;
    this.currentSquare = "square1";
    this.ownedSquares = [];
  }

  //Add a method to create a player token span and add it to appropriate square
  //Adding it as a prototype of the Player constructor function
  Player.prototype.createToken = function(square) {
    var playerSpan = document.createElement("span");
    playerSpan.setAttribute("class", this.token);
    playerSpan.setAttribute("id", this.id);
    square.appendChild(playerSpan);
  };

  //method to update the amount of cash a player has
  Player.prototype.updateCash = function(amount) {
    document.getElementById(this.id + "-info_cash").innerHTML = amount;
    this.cash = amount;
  };

  return game;
})();


"use strict";

const crops = {
  "Spring": [{
    "name": "Parsnip",
    "type": "vegetable",
    "loss": 20,
    "gain": 35,
    "yield": 1,
    "days": 4,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Green Bean",
    "type": "vegetable",
    "loss": 60,
    "gain": 40,
    "yield": 1,
    "days": 10,
    "regrow": 3,
    "maxDays": 28
  }, {
    "name": "Cauliflower",
    "type": "vegetable",
    "loss": 80,
    "gain": 175,
    "yield": 1,
    "days": 12,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Potato",
    "type": "vegetable",
    "loss": 50,
    "gain": 80,
    "yield": 1.25,
    "days": 6,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Tulip",
    "type": "flower",
    "loss": 20,
    "gain": 30,
    "yield": 1,
    "days": 6,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Kale",
    "type": "vegetable",
    "loss": 70,
    "gain": 110,
    "yield": 1,
    "days": 6,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Blue Jazz",
    "type": "flower",
    "loss": 30,
    "gain": 50,
    "yield": 1,
    "days": 7,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Garlic",
    "type": "vegetable",
    "loss": 40,
    "gain": 60,
    "yield": 1,
    "days": 4,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Rhubarb",
    "type": "fruit",
    "loss": 100,
    "gain": 220,
    "yield": 1,
    "days": 13,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Strawberry",
    "suffix": "day 1",
    "type": "fruit",
    "loss": 100,
    "gain": 120,
    "yield": 1,
    "days": 8,
    "regrow": 4,
    "maxDays": 28,
    "buyOnDays": [13],
    "stockpiled": true
  }, {
    "name": "Strawberry",
    "suffix": "day 13",
    "type": "fruit",
    "loss": 100,
    "gain": 120,
    "yield": 1,
    "days": 8,
    "regrow": 4,
    "maxDays": 28,
    "buyOnDays": [13]
  }, {
    "name": "Coffee Bean",
    "type": "seed",
    "loss": 0,
    "gain": 15,
    "yield": 4,
    "days": 10,
    "regrow": 2,
    "maxDays": 28,
    "stockpiled": true
  }],


  "Summer": [{
    "name": "Blueberry",
    "type": "fruit",
    "loss": 80,
    "gain": 50,
    "yield": 3,
    "days": 13,
    "regrow": 4,
    "maxDays": 28
  }, {
    "name": "Corn",
    "type": "vegetable",
    "loss": 150,
    "gain": 50,
    "yield": 1,
    "days": 14,
    "regrow": 4,
    "maxDays": 28
  }, {
    "name": "Hops",
    "type": "vegetable",
    "loss": 60,
    "gain": 25,
    "yield": 1,
    "days": 11,
    "regrow": 1,
    "maxDays": 28
  }, {
    "name": "Hot Pepper",
    "type": "fruit",
    "loss": 40,
    "gain": 40,
    "yield": 1,
    "days": 5,
    "regrow": 3,
    "maxDays": 28
  }, {
    "name": "Melon",
    "type": "fruit",
    "loss": 80,
    "gain": 250,
    "yield": 1,
    "days": 12,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Radish",
    "type": "vegetable",
    "loss": 40,
    "gain": 90,
    "yield": 1,
    "days": 6,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Red Cabbage",
    "type": "vegetable",
    "loss": 100,
    "gain": 260,
    "yield": 1,
    "days": 9,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Starfruit",
    "type": "fruit",
    "loss": 400,
    "gain": 800,
    "yield": 1,
    "days": 13,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Tomato",
    "type": "vegetable",
    "loss": 50,
    "gain": 60,
    "yield": 1,
    "days": 11,
    "regrow": 4,
    "maxDays": 28
  }, {
    "name": "Wheat",
    "type": "vegetable",
    "loss": 10,
    "gain": 25,
    "yield": 1,
    "days": 4,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Poppy",
    "type": "flower",
    "loss": 100,
    "gain": 140,
    "yield": 1,
    "days": 7,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Summer Sprangle",
    "type": "flower",
    "loss": 50,
    "gain": 90,
    "yield": 1,
    "days": 8,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Sunflower",
    "type": "flower",
    "loss": 200,
    "gain": 80,
    "yield": 1,
    "days": 8,
    "regrow": 8, // TODO better algorithm for this
    "maxDays": 28
  }, {
    "name": "Coffee Bean",
    "type": "seed",
    "loss": 0,
    "gain": 15,
    "yield": 4,
    "days": 10,
    "regrow": 2,
    "maxDays": 28,
    "stockpiled": true
  }, {
    "name": "Coffee Bean",
    "suffix": "from Spring",
    "type": "seed",
    "loss": 0,
    "gain": 15,
    "yield": 4,
    "days": 0,
    "regrow": 2,
    "maxDays": 28,
    "stockpiled": true
  }, {
    "name": "Ancient Fruit",
    "suffix": "from Spring",
    "type": "fruit",
    "loss": 0,
    "gain": 550,
    "yield": 1,
    "days": 0,
    "regrow": 7,
    "maxDays": 28,
    "stockpiled": true
  }],


  "Fall": [{
    "name": "Amaranth",
    "type": "vegetable",
    "loss": 70,
    "gain": 150,
    "yield": 1,
    "days": 7,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Artichoke",
    "type": "vegetable",
    "loss": 30,
    "gain": 160,
    "yield": 1,
    "days": 8,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Beet",
    "type": "vegetable",
    "loss": 20,
    "gain": 100,
    "yield": 1,
    "days": 6,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Bok Choy",
    "type": "vegetable",
    "loss": 50,
    "gain": 80,
    "yield": 1,
    "days": 4,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Cranberries",
    "type": "fruit",
    "loss": 240,
    "gain": 130,
    "yield": 2,
    "days": 7,
    "regrow": 5,
    "maxDays": 28
  }, {
    "name": "Eggplant",
    "type": "vegetable",
    "loss": 20,
    "gain": 60,
    "yield": 1,
    "days": 5,
    "regrow": 5,
    "maxDays": 28
  }, {
    "name": "Grape",
    "type": "fruit",
    "loss": 60,
    "gain": 80,
    "yield": 1,
    "days": 10,
    "regrow": 3,
    "maxDays": 28
  }, {
    "name": "Pumpkin",
    "type": "vegetable",
    "loss": 100,
    "gain": 320,
    "yield": 1,
    "days": 13,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Yam",
    "type": "vegetable",
    "loss": 60,
    "gain": 160,
    "yield": 1,
    "days": 10,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Fairy Rose",
    "type": "flower",
    "loss": 200,
    "gain": 290,
    "yield": 1,
    "days": 12,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Sunflower",
    "type": "flower",
    "loss": 200,
    "gain": 80,
    "yield": 1,
    "days": 8,
    "regrow": 8, // TODO better algorithm for this
    "maxDays": 28
  }, {
    "name": "Sunflower",
    "suffix": "from Summer",
    "type": "flower",
    "loss": 0,
    "gain": 80,
    "yield": 1,
    "days": 0,
    "regrow": 8, // TODO better algorithm for this
    "maxDays": 28,
    "stockpiled": true
  }, {
    "name": "Corn",
    "type": "vegetable",
    "loss": 150,
    "gain": 50,
    "yield": 1,
    "days": 14,
    "regrow": 4,
    "maxDays": 28
  }, {
    "name": "Corn",
    "suffix": "from Summer",
    "type": "vegetable",
    "loss": 0,
    "gain": 50,
    "yield": 1,
    "days": 0,
    "regrow": 4,
    "maxDays": 28,
    "stockpiled": true
  }, {
    "name": "Wheat",
    "type": "vegetable",
    "loss": 10,
    "gain": 25,
    "yield": 1,
    "days": 4,
    "regrow": 0,
    "maxDays": 28
  }, {
    "name": "Sweet Gem Berry",
    "suffix": "day 1",
    "type": "berry",
    "loss": 0,
    "gain": 3000,
    "yield": 1,
    "days": 24,
    "regrow": 0,
    "maxDays": 28,
    "stockpiled": true
  }, {
    "name": "Ancient Fruit",
    "suffix": "from Summer",
    "type": "fruit",
    "loss": 0,
    "gain": 550,
    "yield": 1,
    "days": 0,
    "regrow": 7,
    "maxDays": 28,
    "stockpiled": true
  }]
};


class State {
  constructor(crop, gold, day, maxEnergy, waterCost, tillCost, maxCrops) {
    this.maxEnergy = maxEnergy;
    this.waterCost = waterCost;
    this.tillCost = tillCost;
    this.energy = this.maxEnergy;

    this.crop = crop;
    this.gold = gold;

    this.day = 1;
    this.startingDay = day;
    this.lastDay = day;

    this.crops = [];
    this.boughtCrops = 0;
    this.sellingCrops = 0;
    this.highest = 0;
    this.emptyPlots = 0;
    this.maxCrops = maxCrops;
  }

  water(crop) {
    this.energy -= this.waterCost;

    --crop.remainingDays;

    if (this.energy < 0) {
      console.warn(this.energy);
    }
  }

  till() {
    this.energy -= this.tillCost;

    if (this.energy < 0) {
      console.warn(this.energy);
    }
  }

  isWednesday() {
    return this.day % 7 === 3;
  }

  shouldWork() {
    return this.day >= this.startingDay;
  }

  remainingDays() {
    return this.crop.maxDays - this.day + 1;
  }

  sleep() {
    ++this.day;
    this.energy = this.maxEnergy;
    this.emptyPlots = 0; // TODO better calculation for this
  }

  calculateProfit() {
    let gain = -this.crop.loss;
    let day = this.day + this.crop.days;

    if (this.crop.regrow === 0) {
      if (day <= this.crop.maxDays) {
        gain += (this.crop.gain * this.crop.yield);
      }

    } else {
      while (day <= this.crop.maxDays) {
        gain += (this.crop.gain * this.crop.yield);
        day += this.crop.regrow;
      }
    }

    return gain;
  }

  harvestCrops() {
    let harvested = 0;

    if (this.shouldWork()) {
      const crops = this.crops;

      for (let i = 0; i < crops.length; ++i) {
        const crop = crops[i];

        if (crop.remainingDays === 0) {
          this.sellingCrops += this.crop.yield;

          if (this.crop.regrow === 0) {
            crops.splice(i, 1);
            --i;
            ++this.emptyPlots;

          } else {
            crop.remainingDays = this.crop.regrow;
          }

          harvested += this.crop.yield;
        }
      }
    }

    return harvested;
  }

  sellCrops() {
    let sold = 0;

    if (!this.isWednesday() && this.shouldWork()) {
      for (let i = 0; i < this.sellingCrops; ++i) {
        this.gold += this.crop.gain;
        ++sold;
      }

      this.sellingCrops = 0;
    }

    return sold;
  }

  waterCrops() {
    let watered = 0;

    if (this.shouldWork()) {
      const crops = this.crops;

      for (let i = 0; i < crops.length; ++i) {
        if (this.energy >= this.waterCost && crops[i].remainingDays < this.remainingDays())  {
          this.water(crops[i]);
          ++watered;
        }
      }
    }

    return watered;
  }

  canBuyMoreCrops() {
    const crops = this.crops.length + this.boughtCrops;
    return (crops < this.maxCrops &&
            this.maxEnergy >= (crops + 1) * this.waterCost);
  }

  canBuyCrop() {
    return (this.crop.buyOnDays == null ||
            this.crop.buyOnDays.indexOf(this.day) !== -1);
  }

  stockpileCrops() {
    let stocked = 0;

    if (this.day === 1 && this.crop.stockpiled) {
      while (this.gold - this.crop.loss >= 0 &&
             this.canBuyMoreCrops()) {

        ++this.boughtCrops;

        this.gold -= this.crop.loss;

        ++stocked;
      }
    }

    return stocked;
  }

  buyCrops() {
    let bought = 0;

    // TODO calculateProfit needs to take into account tilling and watering
    if (!this.isWednesday() && this.shouldWork() && this.calculateProfit() > 0) {
      while (this.gold - this.crop.loss >= 0 &&
             this.canBuyMoreCrops() &&
             this.canBuyCrop()) {

        ++this.boughtCrops;

        this.gold -= this.crop.loss;

        this.lastDay = this.day;

        ++bought;
      }
    }

    return bought;
  }

  plantCrops() {
    let planted = 0;

    if (this.shouldWork()) {
      while (this.boughtCrops !== 0 &&
             (this.emptyPlots > 0
               ? true
               : this.energy >= ((this.crops.length + 1) * this.waterCost) + this.tillCost)) {

        if (this.emptyPlots > 0) {
          --this.emptyPlots;

        } else {
          this.till();
        }

        this.crops.push({
          remainingDays: this.crop.days
        });

        --this.boughtCrops;

        this.highest = Math.max(this.highest, this.crops.length);

        ++planted;
      }
    }

    return planted;
  }
}


const calculateCropGain = (name, crop, startingGold, startingDay, maxEnergy, waterCost, tillCost, maxCrops) => {
  const state = new State(crop, startingGold, startingDay, maxEnergy, waterCost, tillCost, maxCrops);

  const days = [];

  while (state.remainingDays() > 0) {
    const beforeStockpile = state.gold;

    const stockpiled = state.stockpileCrops();

    const afterStockpile = state.gold;

    const startEnergy = state.energy;

    const day =
      (state.day === 28
        ? 28
        : state.day % 28);

    const beforeSell = state.gold;

    const prePlanted = state.plantCrops();

    const harvested = state.harvestCrops();

    const sold = state.sellCrops();

    const afterSell = state.gold;

    const bought = state.buyCrops();

    const planted = prePlanted + state.plantCrops();

    const watered = state.waterCrops();

    const endEnergy = state.energy;

    days.push({
      day: day,

      stockpiled: stockpiled,
      stockpiledAmount: (beforeStockpile - afterStockpile),

      harvested: harvested,

      sold: sold,
      soldAmount: (afterSell - beforeSell),

      bought: bought,
      boughtAmount: (afterSell - state.gold),

      planted: planted,
      watered: watered,

      startGold: beforeStockpile,
      endGold: state.gold,

      startEnergy: startEnergy,
      endEnergy: endEnergy
    });

    state.sleep();
  }

  return {
    name: name,
    lastDay: state.lastDay,
    highest: state.highest,
    days: days,
    total: state.gold
  };
};


const makeDayHeader = ($days, text) => {
  const $day = document.createElement("th");

  $day.textContent = text;

  $days.appendChild($day);
};


const makeAction = ($day, text) => {
  const $action = document.createElement("div");

  $action.textContent = text;
  $action.style.whiteSpace = "pre";

  $day.appendChild($action);
};


// TODO is this calculation correct ?
const calculateEnergyCost = (s, farmingLevel) => {
  switch (s) {
  case "Starting":
    return (2 - (farmingLevel * 0.1)) / 1;
  case "Copper":
    return (4 - (farmingLevel * 0.1)) / 3;
  case "Steel":
    return (6 - (farmingLevel * 0.1)) / 5;
  case "Gold":
    return (8 - (farmingLevel * 0.1)) / 9;
  case "Iridium":
    return (10 - (farmingLevel * 0.1)) / 18;
  case "Sprinkler":
    return 0;
  }
};


// TODO better encoding for this ?
const encodeName = (name) =>
  name.replace(/[^a-z0-9]/g, (s) =>
    "_" + s.charCodeAt(0) + "_");


const calculateArtisan = (artisan, value) =>
  (artisan ? value * 1.4 : value);


const suffix = (crop, ...args) => {
  if (crop.suffix != null) {
    args.unshift(crop.suffix);
  }

  if (args.length === 0) {
    return "";

  } else {
    return " (" + args.join(", ") + ")";
  }
};


const formatter = new Intl.NumberFormat("en-US");


const calculate = () => {
  const season = $season.value;
  const day = +$day.value;
  const gold = +$gold.value;
  const energy = +$energy.value;
  const farmingLevel = +$farmingLevel.value;
  const maxCrops = +$maxCrops.value;
  const artisanGoods = $artisanGoods.checked;
  const artisanSkill = $artisanSkill.checked;

  const waterCost = calculateEnergyCost($wateringCan.value, farmingLevel);
  const tillCost = calculateEnergyCost($hoe.value, farmingLevel);

  const output = [];

  crops[season].forEach((crop) => {
    const name = crop.name;

    output.push(calculateCropGain(name + suffix(crop), crop, gold, day, energy, waterCost, tillCost, maxCrops));

    if (artisanGoods) {
      if (name === "Coffee Bean") {
        output.push(calculateCropGain(name + suffix(crop, "coffee"), Object.assign({}, crop, {
          "gain": 150 / 5
        }), gold, day, energy, waterCost, tillCost, maxCrops));

      } else if (name === "Hops") {
        output.push(calculateCropGain(name + suffix(crop, "pale ale"), Object.assign({}, crop, {
          "gain": calculateArtisan(artisanSkill, 300)
        }), gold, day, energy, waterCost, tillCost, maxCrops));

      } else if (name === "Wheat") {
        output.push(calculateCropGain(name + suffix(crop, "beer"), Object.assign({}, crop, {
          "gain": calculateArtisan(artisanSkill, 200)
        }), gold, day, energy, waterCost, tillCost, maxCrops));

      } else {
        if (crop.type === "fruit") {
          output.push(calculateCropGain(name + suffix(crop, "wine"), Object.assign({}, crop, {
            "gain": calculateArtisan(artisanSkill, crop.gain * 3)
          }), gold, day, energy, waterCost, tillCost, maxCrops));

        } else if (crop.type === "vegetable") {
          output.push(calculateCropGain(name + suffix(crop, "juice"), Object.assign({}, crop, {
            "gain": calculateArtisan(artisanSkill, crop.gain * 2.25)
          }), gold, day, energy, waterCost, tillCost, maxCrops));
        }
      }

      if (crop.type === "fruit") {
        output.push(calculateCropGain(name + suffix(crop, "jelly"), Object.assign({}, crop, {
          "gain": calculateArtisan(artisanSkill, 50 + (crop.gain * 2))
        }), gold, day, energy, waterCost, tillCost, maxCrops));

      } else if (crop.type === "vegetable") {
        output.push(calculateCropGain(name + suffix(crop, "pickles"), Object.assign({}, crop, {
          "gain": calculateArtisan(artisanSkill, 50 + (crop.gain * 2))
        }), gold, day, energy, waterCost, tillCost, maxCrops));
      }
    }
  });

  output.sort((x, y) =>
    y.total - x.total);

  const fragment = document.createDocumentFragment();

  output.forEach((x) => {
    const $crop = document.createElement("div");
    $crop.className = "panel panel-default";

    const $header = document.createElement("div");
    $header.id = encodeName(x.name + "-heading");
    $header.className = "panel-heading";
    $header.setAttribute("role", "tab");

    const $headerCrop = document.createElement("h4");
    $headerCrop.className = "panel-title";

    const $headerLink = document.createElement("a");
    $headerLink.href = "#" + encodeName(x.name + "-body");
    $headerLink.setAttribute("role", "button");
    $headerLink.setAttribute("aria-expanded", "false");
    $headerLink.setAttribute("aria-controls", encodeName(x.name + "-body"));
    $headerLink.dataset.toggle = "collapse";
    $headerLink.dataset.parent = "#crops";

    const $headerLinkName = document.createElement("span");
    $headerLinkName.textContent = x.name;
    $headerLinkName.style.fontWeight = "bold";
    $headerLinkName.style.marginRight = "12px";

    const $headerLinkGold = document.createElement("span");
    $headerLinkGold.textContent = "$" + formatter.format(gold) + " -> $" + formatter.format(x.total) + " (profit $" + formatter.format(x.total - gold) + ")";

    $headerLink.appendChild($headerLinkName);
    $headerLink.appendChild($headerLinkGold);
    $headerCrop.appendChild($headerLink);
    $header.appendChild($headerCrop);
    $crop.appendChild($header);

    const $panelCollapse = document.createElement("div");
    $panelCollapse.className = "panel-collapse collapse";
    $panelCollapse.id = encodeName(x.name + "-body");
    $panelCollapse.setAttribute("role", "tabpanel");
    $panelCollapse.setAttribute("aria-labelledby", encodeName(x.name + "-heading"));

    const $panelBody = document.createElement("div");
    $panelBody.className = "panel-body";

    $panelCollapse.appendChild($panelBody);

    const $days = document.createElement("table");
    $days.className = "table table-striped table-bordered table-hover";
    $days.style.tableLayout = "fixed";

    const $body = document.createElement("tbody");

    $days.appendChild($body);

    const $rows = document.createElement("tr");
    $body.appendChild($rows);

    makeDayHeader($rows, "Monday");
    makeDayHeader($rows, "Tuesday");
    makeDayHeader($rows, "Wednesday");
    makeDayHeader($rows, "Thursday");
    makeDayHeader($rows, "Friday");
    makeDayHeader($rows, "Saturday");
    makeDayHeader($rows, "Sunday");

    let $row;

    x.days.forEach((day) => {
      if (day.day % 7 === 1) {
        $row = document.createElement("tr");
        $body.appendChild($row);
      }

      const $cell = document.createElement("td");
      $cell.style.width = "100%";
      $cell.style.height = "100%";
      $cell.dataset.placement = "bottom";
      $cell.dataset.toggle = "tooltip";
      $cell.title = "Gold: $" + formatter.format(day.startGold) + " -> $" + formatter.format(day.endGold) + "\nEnergy: " + Math.floor(day.startEnergy) + " -> " + Math.floor(day.endEnergy);

      // TODO destroy this when the element is removed ?
      $($cell).tooltip({
        container: "body"
      });

      const $header = document.createElement("div");

      const $day = document.createElement("span");
      $day.style.fontWeight = "bold";
      $day.textContent = "Day " + day.day;

      $header.appendChild($day);
      $cell.appendChild($header);

      makeAction($cell, (day.stockpiled !== 0 ? "Stockpiled " + day.stockpiled + " for $" + formatter.format(day.stockpiledAmount) : " "));
      makeAction($cell, (day.harvested !== 0 ? "Harvest " + day.harvested : " "));
      makeAction($cell, (day.sold !== 0 ? "Sell " + day.sold + " for $" + formatter.format(day.soldAmount) : " "));
      makeAction($cell, (day.bought !== 0 ? "Buy " + day.bought + " for $" + formatter.format(day.boughtAmount) : " "));
      makeAction($cell, (day.planted !== 0 ? "Plant " + day.planted : " "));
      makeAction($cell, (day.watered !== 0 ? "Water " + day.watered : " "));

      $row.appendChild($cell);
    });

    $panelBody.appendChild($days);
    $crop.appendChild($panelCollapse);

    fragment.appendChild($crop);
  });

  $crops.innerHTML = "";
  $crops.appendChild(fragment);
};


const synchronize = (id, name) => {
  const element = document.getElementById(id);

  if (localStorage[name] != null) {
    element.value = localStorage[name];
  }

  element.addEventListener("change", () => {
    localStorage[name] = element.value;
    calculate();
  }, true);

  return element;
};

const synchronizeBool = (id, name) => {
  const element = document.getElementById(id);

  if (localStorage[name] != null) {
    element.checked = !!localStorage[name];
  }

  element.addEventListener("change", () => {
    if (element.checked) {
      localStorage[name] = "true";

    } else {
      delete localStorage[name];
    }

    calculate();
  }, true);

  return element;
};


const $season = synchronize("season", "season");
const $day = synchronize("day", "starting-day");
const $gold = synchronize("gold", "starting-gold");
const $energy = synchronize("energy", "max-energy");
const $farmingLevel = synchronize("farming-level", "farming-level");
const $wateringCan = synchronize("watering-can", "watering-can");
const $hoe = synchronize("hoe", "hoe");
const $maxCrops = synchronize("max-crops", "max-simultaneous-crops");
const $artisanGoods = synchronizeBool("artisan-goods", "artisan-goods");
const $artisanSkill = synchronizeBool("artisan", "artisan-skill");
const $crops = document.getElementById("crops");


calculate();