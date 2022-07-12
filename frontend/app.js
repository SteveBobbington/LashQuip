'use strict';

const crossFetch = require('cross-fetch');

const APP_KEY = "n7TC5ivIUl1do0nM6ewAUYwTlEzmh0Dpy2jmdt/i4V/i6ZrJwaSJ2Q==";

//Set up express
const express = require('express');
const app = express();

//Setup socket.io
const server = require('http').Server(app);
const io = require('socket.io')(server);

let clientsToSockets = new Map();
let socketsToClients = new Map();
//{@id: {id: @id, username: '', score: 0, state: 0}}
/*player state:
0:not logged in
1:waiting for game
2:submitting prompt
3:submitted prompt
4:submitting answer
5:submitted answer
6:voting
7:voted
8:looking at voting results
9:looking at round results
10:final scores*/
let players = new Map();
//{@id: @roundScore}
let playerRoundScore = new Map();
let audience = new Map();
let logins = new Map();
//{@text: {text: @text, creator: 0, answer1: '', answer2: '', answer1Votes: 0, answer2Votes: 0, answer1User: 0, answer2User: 0}}
let prompts = new Map();
let nextClientNumber = 1;
let state = {state: 1, currentPrompt: '', countdown: 0, round: 0, answerRound: 1};
let timer = null;
let numberOfPlayers=0;

//Setup static page handling
app.set('view engine', 'ejs');
app.use('/static', express.static('public'));

//Handle client interface on /
app.get('/', (req, res) => {
  res.render('client');
});
//Handle display interface on /display
app.get('/display', (req, res) => {
  res.render('display');
});

//Start the server
function startServer() {
    const PORT = process.env.PORT || 8080;
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

function player_register(input_value) {
    const URI = 'https://quiplash-ts2g19.azurewebsites.net/api/adduser'
    let response = crossFetch.fetch(URI, {
		method: 'post',
		body: JSON.stringify(input_value),
		headers:{'x-functions-key' : APP_KEY}
	}).then(
	function(response) {return response.json();},
	function(error) {console.log("Error: No Response");}
	);
    return response;
}

function player_login(input_value) {
    const URI = 'https://quiplash-ts2g19.azurewebsites.net/api/playerlogin'
    let response = crossFetch.fetch(URI, {
		method: 'post',
		body: JSON.stringify(input_value),
		headers:{'x-functions-key' : APP_KEY}
	}).then(
	function(response) {return response.json();},
	function(error) {console.log("Error: No Response");}
	);
    return response;
}

function player_update(input_value) {
    const URI = 'https://quiplash-ts2g19.azurewebsites.net/api/playerupdate'
    let response = crossFetch.fetch(URI, {
		method: 'post',
		body: JSON.stringify(input_value),
		headers:{'x-functions-key' : APP_KEY }
	}).then(
	function(response) {return response.json();},
	function(error) {console.log("Error: No Response");}
	);
    return response;
}

function player_leaderboard(input_value) {
    const URI = 'https://quiplash-ts2g19.azurewebsites.net/api/playerleaderboard'
    let response = crossFetch.fetch(URI, {
		method: 'post',
		body: JSON.stringify(input_value),
		headers:{'x-functions-key' : APP_KEY }
	}).then(
	function(response) {return response.json();},
	function(error) {console.log("Error: No Response");}
	);
    return response;
}

function prompt_create(input_value) {
    const URI = 'https://quiplash-ts2g19.azurewebsites.net/api/promptcreate'
    let response = crossFetch.fetch(URI, {
		method: 'post',
		body: JSON.stringify(input_value),
		headers:{'x-functions-key' : APP_KEY }
	}).then(
	function(response) {return response.json();},
	function(error) {console.log("Error: No Response");}
	);
    return response;
}

function prompt_edit(input_value) {
    const URI = 'https://quiplash-ts2g19.azurewebsites.net/api/promptedit'
    let response = crossFetch.fetch(URI, {
		method: 'post',
		body: JSON.stringify(input_value),
		headers:{'x-functions-key' : APP_KEY }
	}).then(
	function(response) {return response.json();},
	function(error) {console.log("Error: No Response");}
	);
    return response;
}

function prompt_delete(input_value) {
    const URI = 'https://quiplash-ts2g19.azurewebsites.net/api/promptdelete'
    let response = crossFetch.fetch(URI, {
		method: 'post',
		body: JSON.stringify(input_value),
		headers:{'x-functions-key' : APP_KEY }
	}).then(
	function(response) {return response.json();},
	function(error) {console.log("Error: No Response");}
	);
    return response;
}

function prompts_get(input_value) {
    const URI = 'https://quiplash-ts2g19.azurewebsites.net/api/promptget'
    let response = crossFetch.fetch(URI, {
		method: 'post',
		body: JSON.stringify(input_value),
		headers:{'x-functions-key' : APP_KEY }
	}).then(
	function(response) {return response.json();},
	function(error) {console.log("Error: No Response");}
	);
    return response;
}

function prompts_get_random(input_value) {
    const URI = 'https://quiplash-ts2g19.azurewebsites.net/api/promptgetrandom'
    let response = crossFetch.fetch(URI, {
		method: 'post',
		body: JSON.stringify(input_value),
		headers:{'x-functions-key' : APP_KEY }
	}).then(
	function(response) {return response.json();},
	function(error) {console.log("Error: No Response");}
	);
    return response;
}

async function handleRegister(socket, username, password) {
	console.log("Registering "+username);
	let response = await player_register({username:username, password:password});
	console.log("Response: "+JSON.stringify(response));
	if (response.result==true) {
		if (players.size<8) {
			players.set(socketsToClients.get(socket), {id: socketsToClients.get(socket), username: username, score: 0, state: 1});
		}
		else {
			audience.set(socketsToClients.get(socket), {id: socketsToClients.get(socket), username: username, score: 0, state: 1});
		}
		logins.set(username, password);
		updateAll();
	}
	else {
		handleError(socket, "register", response.msg);
	}
}

async function handleLogin(socket, username, password) {
	console.log("Logging in "+username);
	let response = await player_login({username:username, password:password});
	console.log("Response: "+JSON.stringify(response));
	if (response) {
		if (response.result==true) {
			if (players.size<8) {
				console.log("Adding player "+socketsToClients.get(socket));
				players.set(socketsToClients.get(socket), {id: socketsToClients.get(socket), username: username, score: 0, state: 1});
			}
			else {
				console.log("Adding audience member "+socketsToClients.get(socket));
				audience.set(socketsToClients.get(socket), {id: socketsToClients.get(socket), username: username, score: 0, state: 1});
			}
			logins.set(username, password);
			updateAll();
		}
		else {
			handleError(socket, "login", response.msg);
		}
	}
}

async function handlePrompt(id, promptText) {
	let response = await prompt_create({text:promptText, username:players.get(id).username, password:logins.get(players.get(id).username)});
	console.log("Response: "+JSON.stringify(response));
	if (response.result==true) {
		prompts.set(promptText, {text: promptText, creator: id, answer1: '', answer2: '', answer1Votes: 0, answer2Votes: 0, answer1User: '', answer2User: ''});
		players.get(id).state=3;
		console.log("Prompt \""+promptText+"\" created");
		updateAll();
	}
	else {
		handleError(clientsToSockets.get(id), "addPrompt", response.msg);
	}
}

function handleAnswer(id, prompt) {
	console.log("Answer submitted by "+id+" :")
	console.log(prompt);
	if (prompts.get(prompt.text).answer1=='') {
		if (prompt.answer2) {
			prompts.get(prompt.text).answer1=prompt.answer2;
		}
		else {
			prompts.get(prompt.text).answer1=prompt.answer1;
		}
		prompts.get(prompt.text).answer1User=id;
	}
	else {
		if (prompt.answer2) {
			prompts.get(prompt.text).answer2=prompt.answer2;
		}
		else {
			prompts.get(prompt.text).answer2=prompt.answer1;
		}
		prompts.get(prompt.text).answer2User=id;
	}
	players.get(id).state=5;
	updateAll();
}

function handleVote(id, promptText, answer) {
	console.log("Player "+id+" submitted vote for "+answer);
	if (prompts.get(promptText).answer1==answer) {
		prompts.get(promptText).answer1Votes+=100;
		const answerUser = prompts.get(promptText).answer1User;
		const currentRoundScore = playerRoundScore.get(answerUser);
		playerRoundScore.set(answerUser, currentRoundScore+100);
		players.get(answerUser).score+=100;
	}
	else if (prompts.get(promptText).answer2==answer) {
		prompts.get(promptText).answer2Votes+=100;
		const answerUser = prompts.get(promptText).answer2User;
		const currentRoundScore = playerRoundScore.get(answerUser);
		playerRoundScore.set(answerUser, currentRoundScore+100);
		players.get(answerUser).score+=100;
	}
	players.get(id).state=7;
	updateAll();
}

function handleAdvance() {
	switch (state.state) {
		case 1:
			startPrompts();
			break;
		case 2:
			endPrompts();
			break;
		case 3:
			if (state.answerRound==1 && players.size%2==1) {
				state.answerRound=2;
				startAnswers();
				break;
			}
			startVotes();
			break;
		case 4:
			startResults();
			break;
		case 5:
			let shouldBreak=false;
			for (const [text, prompt] of prompts.entries()) {
				if (prompt.answer1Votes==0 && prompt.answer2Votes==0) {
					state.currentPrompt = text;
					startVotes();
					shouldBreak=true;
					break;
				}
			}
			if (shouldBreak) {
				break;
			}
			startScores();
			break;
		case 6:
			if (state.round==3) {
				endGame();
				break;
			}
			startPrompts();
			break;
		case 7:
			throw "End of Game";
			break;
	}
}

function startPrompts() {
	state.answerRound=1;
	numberOfPlayers = players.size;
	for (const [id, player] of players.entries()) {
		player.state=2;
		players.set(id, player);
	}
	if (audience.size>0) {
		for (const [id, audienceM] of audience.entries()) {
			audienceM.state=2;
		}
	}
	state.state=2;
	state.round++;
	state.currentPrompt="";
	playerRoundScore = new Map();
	for (const [id, player] of players) {
		playerRoundScore.set(id, 0);
	}
	state.countdown = 30;
	if (timer==null) {
		timer = setInterval(() => {
			tickGame();
		}, 1000);
	}
	updateAll();
	console.log("State is now "+state.state);
}

async function endPrompts() {
	let promptsInRound = numberOfPlayers;
	if (numberOfPlayers%2==0) {
		promptsInRound/=2;
	}
	const fromDatabase = ((promptsInRound+1)/2>>0);
	let gamePrompts=new Map();
	for (let i=0; i<promptsInRound-fromDatabase; i++) {
		const randomPrompt=getRandomKey(prompts);
		if (typeof randomPrompt !== "undefined") {
			gamePrompts.set(randomPrompt, prompts.get(randomPrompt));
		}
		else {
			fromDatabase++;
		}
	}
	let response = await prompts_get_random({n:fromDatabase});
	if (!response.hasOwnProperty("result")) {
		for (const prompt of response) {
			gamePrompts.set(prompt.text, {text: prompt.text, creator: 0, answer1: '', answer2: '', answer1Votes: 0, answer2Votes: 0, answer1User: '', answer2User: ''});
		}
	}
	for (let i=0; i<promptsInRound-gamePrompts.size; i++) {
		gamePrompts.set(i, {text: i, creator: 0, answer1: '', answer2: '', answer1Votes: 0, answer2Votes: 0, answer1User: 0, answer2User: ''});
	}
	prompts=gamePrompts;
	console.log("Prompts for this round: ");
	console.log(prompts);
	startAnswers();
}

function startAnswers() {
	let tempPrompts = new Map(JSON.parse(JSON.stringify(Array.from(prompts))));
	for (const [id, player] of players) {
		let assignedPrompt = {text: '', answer1: '', answer2: ''};
		for (const [text, prompt] of tempPrompts) {
			if (prompt.creator!==id && (prompt.answer1=='' || (prompt.answer2=='' && prompt.answer1User!==id))) {
				assignedPrompt = {text: text, answer1: prompts.get(text).answer1, answer2: prompts.get(text).answer2};
				if (prompt.answer1=='') {
					prompt.answer1="h";
				}
				else {
					prompt.answer2="h";
				}
				break;
			}
		}
		if (assignedPrompt.text=='') {
			prompts.set('', {text: '', creator: 0, answer1: '', answer2: '', answer1Votes: 0, answer2Votes: 0, answer1User: 0, answer2User: 0});
		}
		clientsToSockets.get(id).emit("promptToAnswer", assignedPrompt);
	}
	for (const [id, player] of players.entries()) {
		player.state=4;
	}
	if (audience.size>0) {
		for (const [id, audienceM] of audience.entries()) {
			audienceM.state=5;
		}
	}
	state.countdown = 30;
	state.state=3;
	updateAll();
	console.log("State is now "+state.state);
}

function startVotes() {
	for (const [id, player] of players.entries()) {
		player.state=6;
	}
	if (audience.size>0) {
		for (const [id, audienceM] of audience.entries()) {
			audienceM.state=6;
		}
	}
	if (state.currentPrompt=='') {
		for (const [text, prompt] of prompts.entries()) {
			if (prompt.answer1Votes==0 && prompt.answer2Votes==0) {
				state.currentPrompt = text;
				break;
			}
		}
	}
	state.countdown = 10;
	state.state=4;
	updateAll();
	console.log("State is now "+state.state);
}

function startResults() {
	for (const [id, player] of players.entries()) {
		player.state=8;
	}
	if (audience.size>0) {
		for (const [id, audienceM] of audience.entries()) {
			audienceM.state=8;
		}
	}
	state.countdown = 10;
	state.state=5;
	updateAll();
	console.log("State is now "+state.state);
}

function startScores() {
	for (const [id, player] of players.entries()) {
		player.state=9;
		let data = [];
		for (const [text, prompt] in prompts) {
			data.push({text: text, answerText:prompt.answer1, score: prompt.answer1Votes, user: prompt.answer1User});
			data.push({text: text, answerText:prompt.answer2, score: prompt.answer2Votes, user: prompt.answer2User});
		}
		clientsToSockets.get(id).emit("roundScores", data);
	}
	if (audience.size>0) {
		for (const [id, audienceM] of audience.entries()) {
			audienceM.state=9;
		}
	}
	state.countdown = 10;
	state.state=6;
	updateAll();
	console.log("State is now "+state.state);
}

function endGame() {
	for (const [id, player] of players.entries()) {
		player.state=10;
	}
	if (audience.size>0) {
		for (const [id, audienceM] of audience.entries()) {
			audienceM.state=10;
		}
	}
	state.countdown = 60;
	state.state=7;
	updateAll();
	console.log("State is now "+state.state);
}

function getRandomKey(collection) {
    let keys = Array.from(collection.keys());
    return keys[Math.floor(Math.random() * keys.length)];
}

//sends a message to the client saying what request failed, and what the error was
function handleError(socket, request, message) {
	console.log("Handling error "+message);
	socket.emit('error', {request:request, message: message});
}

function updateClient(socket) {
    const id = socketsToClients.get(socket);
	let client=null
	let voteAllowed = true;
	let localCurrentPrompt = {text:state.currentPrompt, answer1:'', answer2:'', voteAllowed: false, answer1Votes: 0, answer2Votes: 0}
	if (players.has(id)) {
		client=players.get(id);
	}
	else if (audience.has(id)) {
		client=audience.get(id);
	}
	else {
		const data = {state: state.state, currentPrompt: localCurrentPrompt, client: {id: 0, username: '', password: '', score: 0, state: 0}, players: Object.fromEntries(players), countdown: state.countdown, round: state.round};
		socket.emit('state',data);
		return;
	}
	if ((state.state==4||state.state==5) && prompts.size!=0) {
		if (id==prompts.get(state.currentPrompt).answer1User || id==prompts.get(state.currentPrompt).answer2User) {
			voteAllowed = false;
		}
		localCurrentPrompt = {text:state.currentPrompt, answer1:prompts.get(state.currentPrompt).answer1, answer2:prompts.get(state.currentPrompt).answer2, voteAllowed: voteAllowed, answer1Votes: prompts.get(state.currentPrompt).answer1Votes, answer2Votes: prompts.get(state.currentPrompt).answer2Votes}
	}
    const data = {state: state.state, currentPrompt: localCurrentPrompt, client: client, players: Object.fromEntries(players), countdown: state.countdown, round: state.round};
    socket.emit('state',data);
}

function updateAll() {
    for(const socket of clientsToSockets.values()) {
        updateClient(socket);
    }
}

//Chat message
function handleChat(message) {
    console.log('Handling chat: ' + message); 
    io.emit('chat',message);
}

function handleQuit(socket) {
    if(!socketsToClients.has(socket)) {
        console.log('Handling quit');
        return;
    }
    const client = socketsToClients.get(socket);
    socketsToClients.delete(socket);
    clientsToSockets.delete(client);
	if (players.has(client)) {
		players.delete(client);
		playerRoundScore.delete(client);
	}
	else {
		audience.delete(client);
	}
	if (players.size==0) {
		throw "End of Game";
	}
	updateAll();
    console.log('Handling quit from client ' + client);
}

function tickGame() {
    if(state.countdown>0) {
        state.countdown--;
		updateAll();
    } else if (state.countdown==0) {
        handleAdvance();
	}
}

//Handle new connection
io.on('connection', socket => { 
  console.log('New connection');
  clientsToSockets.set(nextClientNumber, socket);
  socketsToClients.set(socket, nextClientNumber);
  nextClientNumber+=1;

  //Handle on chat message received
  socket.on('chat', message => {
    handleChat(message);
  });
  
  socket.on('register', data => {
    handleRegister(socket, data.username, data.password);
  });
  
  socket.on('login', data => {
    handleLogin(socket, data.username, data.password);
  });
  
  socket.on('createPrompt', data => {
    handlePrompt(data.id, data.promptText);
  });
  
  socket.on('submitAnswer', data => {
    handleAnswer(data.id, data.prompt);
  });
  
  socket.on('vote', data => {
    handleVote(data.id, data.promptText, data.answer);
  });
  
  socket.on('start', () => {
    handleAdvance();
  });

  //Handle disconnection
  socket.on('disconnect', () => {
    console.log('Dropped connection');
	handleQuit(socket);
  });
});

//Start server
if (module === require.main) {
  startServer();
}

module.exports = server;
