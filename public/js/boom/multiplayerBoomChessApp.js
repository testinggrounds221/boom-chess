// import './../boardEditor.js'
const formEl = document.querySelectorAll('#joinForm > div > input')
const joinButtonEl = document.querySelector('#joinButton')
const messageEl = document.querySelector('#message')
const statusEl = document.querySelector('#status')
const roomsListEl = document.getElementById('roomsList');
const myAudioEl = document.getElementById('myAudio');
const totalRoomsEl = document.getElementById('rooms')
const totalPlayersEl = document.getElementById('players')
const ChatEl = document.querySelector('#chat')
const sendButtonEl = document.querySelector('#send')
const chatContentEl = document.getElementById('chatContent')

var game = new Chess()
var turnt = 0;

var editorTurnt = 0;
let play = true;
var editorBoard = null;
var boardJqry = $('#boardEditor')
var editorGame = new Chess()
var fen, editorGame, piece_theme, promote_to, promoting, promotion_dialog;
promotion_dialog = $("#promotion-dialog");
promoting = false;
piece_theme = "img/chesspieces/wikipedia/{piece}.png";
var squareToHighlight = null
var squareClass = 'square-55d63'

let waitForBoom = false

let configEditor = {
	draggable: true,
	position: 'start',
	orientation: 'white',
	onSnapEnd: onSnapEndEditor,
	onDrop: onDropEditor,
	onMoveEnd: onMoveEnd,
}
editorBoard = Chessboard('boardEditor', configEditor);

$(function () {
	$("#dialog-4").dialog({
		autoOpen: false,
		modal: true,
		buttons: {
			Yes: function () {
				moveBack($(this).data('move'))
				$(this).dialog("close");
				waitForBoom = false
				handleBoomMove($(this).data('move').from, $(this).data('move').to)
			},
			No: function () {
				$(this).dialog("close");
				waitForBoom = false
				handleValidMove($(this).data('move').from, $(this).data('move').to)
				alertCheckMate()
			},
		},
	});
	// css("font-size", "30px");
	$("#opener-4").click(function () {
		$("#dialog-4").dialog("open");
	});
});
// old
var time_in_minutes = 30;
var current_time = null;
var deadline = null;
var paused = false;
var time_left;
var timeinterval;

// initializing semantic UI dropdown
$('.ui.dropdown')
	.dropdown();
$("#dialog").dialog({
	autoOpen: false
});

// function for defining onchange on dropdown menus
$("#roomDropdown").dropdown({
	onChange: function (val) {
		// console.log(val)
		// console.log('running the function')
		formEl[1].value = val
	}
});

//Connection will be established after webpage is refreshed
const socket = io()

//Triggers after a piece is dropped on the editorBoard
function onDrop(source, target) {
	//emits event after piece is dropped
	pause_clock();
	var room = formEl[1].value;
	myAudioEl.play();
	// isMyTurn(false)
	socket.emit('Dropped', { source, target, room })
}

function onDropEditor(source, target) {
	// see if the move is legal
	var move = editorGame.move({
		from: source,
		to: target,
		promotion: 'q' // NOTE: always promote to a queen for example simplicity
	})

	let currentFen = editorGame.fen()
	let fun = 0;
	let validMovesOfPieces = editorGame.moves({ verbose: true, legal: false })
	for (let i = 0; i < validMovesOfPieces.length; i++) {
		if (validMovesOfPieces[i].from === source && validMovesOfPieces[i].to === target) {
			console.log(validMovesOfPieces[i].from)
			fun = 1;
			break;
		}
	}
	myAudioEl.play();
	// illegal move
	if (move === null) {
		console.log("Move is null")
		if (editorGame.get(target) && !isCheckAfterRemovePiece(currentFen, target)
			&& fun === 1) {
			moveIllegal(source, target);
		}
		// TODO: EMit Check mate

		if (editorGame.in_checkmate() || editorGame.in_check()) {
			console.log('Check Mate')
			if (editorGame.get(target) && !isCheckAfterRemovePiece(currentFen, target) && fun === 1) {
				moveIllegal(source, target);
			} else {
				return
			}
		} else {

			console.log('Snap 2');
			return
		}
		return;
	} else {
		// changeSquareColorAfterMove(source, target)
	}
	if (move != null && 'captured' in move && move.piece != 'p') {
		waitForBoom = true
		$("#dialog-4").data('move', move).dialog("open");
	}
	editorGame.undo(); //move is ok, now we can go ahead and check for promotion
	// is it a promotion?
	var source_rank = source.substring(2, 1);
	var target_rank = target.substring(2, 1);
	if (source != null) {
		var piece = editorGame.get(source).type;
		if (
			piece === "p" &&
			((source_rank === "7" && target_rank === "8") ||
				(source_rank === "2" && target_rank === "1"))
		) {
			promoting = true;
			// get piece images
			$(".promotion-piece-q").attr("src", getImgSrc("q"));
			$(".promotion-piece-r").attr("src", getImgSrc("r"));
			$(".promotion-piece-n").attr("src", getImgSrc("n"));
			$(".promotion-piece-b").attr("src", getImgSrc("b"));
			//show the select piece to promote to dialog
			promotion_dialog
				.dialog({
					modal: true,
					height: 52,
					width: 184,
					resizable: true,
					draggable: false,
					close: () => {
						move.promotion = promote_to
						editorGame.move(move)
					},
					closeOnEscape: false,
					dialogClass: "noTitleStuff",
				})
				.dialog("widget")
				.position({
					of: $("#boardEditorGame"),
					my: "middle middle",
					at: "middle middle",
				});
			//the actual move is made after the piece to promote to
			//has been selected, in the stop event of the promotion piece selectable
			return;
		} else {
			var move = editorGame.move({
				from: source,
				to: target,
				promotion: 'q' // NOTE: always promote to a queen for example simplicity
			})
		}

		// squareToHighlight = move.to
		editorTurnt = 1 - editorTurnt;
		// make random legal move for black
		// window.setTimeout(makeRandomMoveEditor, 250)

	}
	if (!waitForBoom) {
		alertCheckMate()
		handleValidMove(source, target)
	}
}

function onMoveEnd() {
	boardJqry.find('.square-' + squareToHighlight)
		.addClass('highlight-black')
}

function handleValidMove(source, target) {
	pause_clock();
	var room = formEl[1].value;
	myAudioEl.play();
	socket.emit('Dropped', { source, target, room })
}

function handleBoomMove(source, target) {
	pause_clock();
	var room = formEl[1].value;
	myAudioEl.play();
	socket.emit('boomDropped', { source, target, room })
}

function onSnapEndEditor(params) {
	if (promoting) return; //if promoting we need to select the piece first
	editorBoard.position(editorGame.fen())
}

//Update Status Event
socket.on('updateEvent', ({ status, fen, pgn }) => {
	statusEl.textContent = status

})

socket.on('printing', (fen) => {
	console.log(fen)
})

//Catch Display event
socket.on('DisplayBoard', (fenString, mvSq, userId) => {
	// console.log(fenString)
	//This is to be done initially only
	if (userId != undefined) {
		current_time = Date.parse(new Date());
		deadline = new Date(current_time + time_in_minutes * 60 * 1000);
		messageEl.textContent = 'Match Started!! Best of Luck...'
		if (socket.id == userId) {
			configEditor.orientation = 'black'
			run_clock('clck', deadline);
			pause_clock()
		} else {
			run_clock('clck', deadline);
		}
		document.getElementById('joinFormDiv').style.display = "none";
		document.querySelector('#chessGame').style.display = null
		ChatEl.style.display = null
		document.getElementById('statusPGN').style.display = null
	}

	console.log(mvSq)
	configEditor.position = fenString
	console.log(`Is received Fen String Valid ? ${editorGame.load(fenString)}`)
	editorBoard = ChessBoard('boardEditor', configEditor)
	changeSquareColorAfterMove(mvSq.source, mvSq.target)


	// console.log(turnt)
	// document.getElementById('pgn').textContent = pgn
})

//To turn off dragging
socket.on('Dragging', id => {
	if (socket.id != id) {
		configEditor.draggable = true;//"white dont drag"		
	} else {
		configEditor.draggable = false;//black dont drag		
	}
})



//To Update Status Element
socket.on('updateStatus', (turn) => {
	if (editorBoard.orientation().includes(turn)) {
		statusEl.textContent = "Your turn"
		resume_clock()
	}
	else {
		statusEl.textContent = "Opponent's turn"
		pause_clock()
	}
})

//If in check
socket.on('inCheck', turn => {
	if (editorBoard.orientation().includes(turn)) {
		statusEl.textContent = "You are in Check!!"
	}
	else {
		statusEl.textContent = "Opponent is in Check!!"
	}
})

//If win or draw
socket.on('gameOver', (turn, win) => {
	configEditor.draggable = false;
	if (win) {
		if (editorBoard.orientation().includes(turn)) {
			statusEl.textContent = "You lost, better luck next time :)"
		}
		else {
			statusEl.textContent = "Congratulations, you won!!"
		}
	}
	else {
		statusEl.value = 'Game Draw'
	}
})

//Client disconnected in between
socket.on('disconnectedStatus', () => {
	alert('Opponent left the game!!')
	messageEl.textContent = 'Opponent left the game!!'
})

//Receiving a message
socket.on('receiveMessage', (user, message) => {
	var chatContentEl = document.getElementById('chatContent')
	//Create a div element for using bootstrap
	chatContentEl.scrollTop = chatContentEl.scrollHeight;
	var divEl = document.createElement('div')
	if (formEl[0].value == user) {
		divEl.classList.add('myMessage');
		divEl.textContent = message;
	}
	else {
		divEl.classList.add('youMessage');
		divEl.textContent = message;
		document.getElementById('messageTone').play();
	}
	var style = window.getComputedStyle(document.getElementById('chatBox'));
	if (style.display === 'none') {
		document.getElementById('chatBox').style.display = 'block';
	}
	chatContentEl.appendChild(divEl);
	divEl.focus();
	divEl.scrollIntoView();
})
//Rooms List update
socket.on('roomsList', (rooms) => {
	// roomsListEl.innerHTML = null;
	// console.log('Rooms List event triggered!! ',  rooms);
	totalRoomsEl.innerHTML = rooms.length
	var dropRooms = document.getElementById('dropRooms')
	while (dropRooms.firstChild) {
		dropRooms.removeChild(dropRooms.firstChild)
	}
	// added event listener to each room
	rooms.forEach(x => {
		var roomEl = document.createElement('div')
		roomEl.setAttribute('class', 'item')

		roomEl.setAttribute('data-value', x)
		roomEl.textContent = x;
		dropRooms.appendChild(roomEl)
	})
})

socket.on('updateTotalUsers', totalUsers => {
	// console.log('event listened')
	totalPlayersEl.innerHTML = totalUsers;
})

//Message will be sent only after you click the button
sendButtonEl.addEventListener('click', (e) => {
	e.preventDefault()
	var message = document.querySelector('#inputMessage').value
	var user = formEl[0].value
	var room = formEl[1].value
	document.querySelector('#inputMessage').value = ''
	document.querySelector('#inputMessage').focus()
	socket.emit('sendMessage', { user, room, message })
})

//Connect clients only after they click Join
joinButtonEl.addEventListener('click', (e) => {
	e.preventDefault()

	var user = formEl[0].value, room = formEl[1].value

	if (!user || !room) {
		messageEl.textContent = "Input fields can't be empty!"
	}
	else {
		joinButtonEl.setAttribute("disabled", "disabled");
		formEl[0].setAttribute("disabled", "disabled")
		document.querySelector('#roomDropdownP').style.display = 'none';
		formEl[1].setAttribute("disabled", "disabled")
		//Now Let's try to join it in room // If users more than 2 we will 
		socket.emit('joinRoom', { user, room }, (error) => {
			messageEl.textContent = error
			if (alert(error)) {
				window.location.reload()
			}
			else    //to reload even if negative confirmation
				window.location.reload();
		})
		messageEl.textContent = "Waiting for other player to join"
	}
})

function time_remaining(endtime) {
	var t = Date.parse(endtime) - Date.parse(new Date());
	var seconds = Math.floor((t / 1000) % 60);
	var minutes = Math.floor((t / 1000 / 60) % 60);
	var hours = Math.floor((t / (1000 * 60 * 60)) % 24);
	var days = Math.floor(t / (1000 * 60 * 60 * 24));
	return { 'total': t, 'days': days, 'hours': hours, 'minutes': minutes, 'seconds': seconds };
}

function run_clock(id, endtime) {
	var clock = document.getElementById(id);
	function update_clock() {
		var t = time_remaining(endtime);
		clock.innerHTML = t.minutes + ' : ' + t.seconds;
		if (t.total <= 0) { clearInterval(timeinterval); }
	}
	update_clock(); // run function once at first to avoid delay
	timeinterval = setInterval(update_clock, 1000);
}

function pause_clock() {
	if (!paused) {
		paused = true;
		clearInterval(timeinterval); // stop the clock
		time_left = time_remaining(deadline).total; // preserve remaining time
	}
}

function resume_clock() {
	if (paused) {
		paused = false;
		deadline = new Date(Date.parse(new Date()) + time_left);
		run_clock('clck', deadline);
	}
}

//For removing class from all buttons


// Color Buttons
document.getElementById('messageBox').addEventListener('click', e => {
	e.preventDefault();
	var style = window.getComputedStyle(document.getElementById('chatBox'));
	if (style.display === 'none') {
		document.getElementById('chatBox').style.display = 'block';
	} else {
		document.getElementById('chatBox').style.display = 'none';
	}
})

function isCheckAfterRemovePiece(fen, square) {
	// we see isCheck for turn
	let c = new Chess()
	c.load(fen)
	c.remove(square)
	return c.in_check() // If in Check dont allow to cut, remove from valid moves
}

function moveIllegal(source, target) {
	if (!editorGame.get(target)) return
	let currentFen = editorGame.fen()
	console.log(source, target)
	var custommove = editorGame.get(source);
	editorGame.load(currentFen)
	console.log(editorGame.put({ type: custommove.type, color: custommove.color }, target))
	editorGame.remove(target)
	let isCheck = null
	let eg = editorGame.fen()
	console.log(editorGame.fen())
	console.log(editorGame.in_check())

	if (editorGame.turn() === 'w') {
		let myArray = eg.split(" ");
		myArray[1] = "b";
		isCheck = myArray.join(" ");
	}
	if (editorGame.turn() === 'b') {
		let myArray = eg.split(" ");
		myArray[1] = "w";
		isCheck = myArray.join(" ");
	}
	console.log("Load Check")
	editorGame.load(isCheck)
	console.log(editorGame.in_check())
	console.log(editorGame.fen())
	editorBoard.position(isCheck, false);

	// changeSquareColorAfterMove(source, target)
}

function changeSquareColorAfterMove(source, target) {
	boardJqry.find('.' + squareClass)
		.removeClass('highlight-from')
	boardJqry.find('.' + squareClass)
		.removeClass('highlight-to')
	boardJqry.find('.square-' + source).addClass('highlight-from')
	boardJqry.find('.square-' + target).addClass('highlight-to')
}
//TODO: Emit Check mate
function alertCheckMate() {
	if (editorGame.in_checkmate() && isBoomCheckMate(editorGame.fen())) {
		if (editorGame.turn() === 'w')
			alert('Black Wins')
		if (editorGame.turn() === 'b')
			alert('White Wins')
		return
	}
}

function isBoomCheckMate(fen) {
	let c = new Chess()
	c.load(fen)

	// console.log(c.moves({ verbose: true, legal: false }))
	let f = 0
	let mvs = c.moves({ verbose: true, legal: false })
	for (let i = 0; i < mvs.length; i++) {
		const mv = mvs[i];
		console.log(mv.flags)

		if (mv.flags === 'c' && !isCheckAfterRemovePiece(fen, mv.to)) {
			console.log(mv) // ! DO NOT DLT. Keep This Console Log for moves
			f++;
		}
	}
	return (!f > 0)
}

function moveBack(move) {
	let currentFen = editorGame.fen()
	console.log('Move Me to my old position')
	editorGame.load(currentFen)
	editorGame.put({
		type: move.piece,
		color: move.color
	}, move.from)
	editorGame.remove(move.to)
	if (!editorGame.fen().includes("k")) {
		editorGame.put({
			type: 'k',
			color: 'b'
		}, move.from)
	}
	if (!editorGame.fen().includes("K")) {
		editorGame.put({
			type: 'k',
			color: 'w'
		}, move.from)
	}
	editorBoard.position(editorGame.fen())
	let isCheck = null
	let eg = editorGame.fen()
	if (editorGame.turn() === 'w') {
		let myArray = eg.split(" ");
		myArray[1] = "b";
		isCheck = myArray.join(" ");
	}
	if (editorGame.turn() === 'b') {
		let myArray = eg.split(" ");
		myArray[1] = "w";
		isCheck = myArray.join(" ");
	}
	let tempG = new Chess()
	console.log("Is valid fen", tempG.load(isCheck))
	if (tempG.in_check()) {
		editorGame.load(currentFen)
		editorBoard.position(editorGame.fen())
		return {
			s: -1,
			m: "Cant Move back as it leads to Check"
		}
	}
	editorTurnt = 1 - editorTurnt;
	alertCheckMate()
	waitForBoom = false
	return {
		s: 1,
		m: "Moved Back"
	}

}

window.changeSquareColorAfterMove = changeSquareColorAfterMove