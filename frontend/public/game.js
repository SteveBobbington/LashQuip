var socket = null;

//Prepare game
var app = new Vue({
    el: '#game',
    data: {
        connected: false,
        messages: [],
        chatmessage: '',
		promptBox: '',
		answerBox: '',
		me: {id: 0, username: '', password: '', score: 0, state: 0, promptToAnswer: {text:'', answer1:'', answer2:''}},
        state: {state: 1, currentPrompt: {text:'', answer1:'', answer2:'', voteAllowed: false, answer1Votes: 0, answer2Votes: 0}, countdown: 0, round: 0},
		//{@id: {id: @id, username: '', score: 0, state: 0}}
        players: new Map(),
		//{@promptText: {text: @promptText, answerText:@answerText, score: 0, user: @user}}
		roundScores: new Map(),
		loading:false,
		incorrect: false,
		dupedPrompt: false,
    },
    mounted: function() {
        connect();
    },
    methods: {
        handleChat(message) {
            if(this.messages.length + 1 > 10) {
                this.messages.pop();
            }
            this.messages.unshift(message);
        },
		handleUpdateState(data) {
			this.state.currentPrompt = data.currentPrompt;
			this.state.countdown = data.countdown;
			this.state.round = data.round;
			this.me.id = data.client.id;
			this.me.score = data.client.score;
			this.me.state = data.client.state;
			this.players = data.players;
			this.loading=false;
			this.state.state = data.state;
		},
		handlePromptRecieved(data) {
			this.me.promptToAnswer = data;
		},
		handleRoundScores(data) {
			for (const prompt of data) {
				this.roundScores.set(prompt.text, {text: prompt.text, answerText:prompt.answerText, score: prompt.score, user: prompt.user});
			}
		},
        chat() {
            socket.emit('chat',this.chatmessage);
            this.chatmessage = '';
        },
		register() {
			this.loading=true;
			incorrect=false;
            socket.emit('register',{username:this.me.username, password:this.me.password});
        },
		login() {
			this.loading=true;
			incorrect=false;
            socket.emit('login',{username:this.me.username, password:this.me.password});
        },
		createPrompt() {
			this.loading=true;
			this.dupedPrompt=false;
            socket.emit('createPrompt',{id:this.me.id, promptText:this.promptBox});
            this.promptBox = '';
        },
		submitAnswer() {
			this.loading=true;
			let submittedAnswer = {text:'', answer1:'', answer2:''}
			if (this.me.promptToAnswer.answer1=='') {
				submittedAnswer = {text: this.me.promptToAnswer.text, answer1:this.answerBox, answer2:''};
			}
			else {
				submittedAnswer = {text: this.me.promptToAnswer.text, answer1:this.me.promptToAnswer.answer1, answer2:this.answerBox};
			}
			socket.emit('submitAnswer',{id:this.me.id, prompt: submittedAnswer});
            this.answerBox = '';
        },
		vote1() {
            socket.emit('vote',{id:this.me.id, promptText:this.state.currentPrompt.text, answer:this.state.currentPrompt.answer1});
        },
		vote2() {
            socket.emit('vote',{id:this.me.id, promptText:this.state.currentPrompt.text, answer:this.state.currentPrompt.answer2});
        },
		start() {
            socket.emit('start');
        },
		handleError(message) {
			if (message.request=="login"||message.request=="register") {
				this.loading=false;
				this.incorrect=true;
			}
			if (message.request=="addPrompt") {
				this.loading=false;
				this.dupedPrompt=true;
			}
		}
    }
});

function connect() {
    //Prepare web socket
    socket = io();

    //Connect
    socket.on('connect', function() {
        //Set connected state to true
        app.connected = true;
    });

    //Handle connection error
    socket.on('connect_error', function(message) {
        alert('Unable to connect: ' + message);
    });

    //Handle disconnection
    socket.on('disconnect', function() {
        alert('Disconnected');
        app.connected = false;
    });

    //Handle incoming chat message
    socket.on('chat', function(message) {
        app.handleChat(message);
    });
	
	socket.on('state', function(data) {
        app.handleUpdateState(data);
    });
	
	socket.on('promptToAnswer', function(data) {
		app.handlePromptRecieved(data);
	});
	
	socket.on('roundScores', function(data) {
		app.handleRoundScores(data);
	});
	
	socket.on('error', function(message) {
		app.handleError(message);
	});
}

