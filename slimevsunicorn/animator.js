"use strict";

class Animator {

	constructor(info=null, player1='player1', player2='player2', player1Points=null, player2Points=null, player1Score=null, player2Score=null, log_to_console=true, player1Node='player1node', player2Node='player2node', player1Edge='player1edge', player2Edge='player2edge') {
		this.info = info;
		this.player1 = player1;
		this.player2 = player2;
		this.player1Points = player1Points;
		this.player2Points = player2Points;
		this.player1Score = player1Score;
		this.player2Score = player2Score;
		this.log_to_console = log_to_console;
		this.player1Node = player1Node;
		this.player2Node = player2Node;
		this.player1Edge = player1Edge;
		this.player2Edge = player2Edge;
	}

	nodeOwner(player, node) {
		Array.from(document.getElementsByClassName(`n${node} node`)).forEach(x => {
			// reset classes
			x.classList.remove(this.player1Node, this.player2Node);
			if (player == 1) x.classList.add(this.player1Node);
			else if (player == 2) x.classList.add(this.player2Node);
		});
	}

	edgeOwner(player, node_from, node_to) {
		Array.from(document.getElementsByClassName(`n${node_from} n${node_to} edge`)).forEach(x => {
			// reset classes
			x.classList.remove(this.player1Edge, this.player2Edge);
			if (player == 1) x.classList.add(this.player1Edge);
			else if (player == 2) x.classList.add(this.player2Edge);
		});
	}

	updateScore(player, score) {
		if ((player == 1) && (this.player1Score !== null)) this.player1Score.firstChild.nodeValue = score;
		else if (player == 2) this.player2Score.firstChild.nodeValue = score;
	}

	updatePoints(player, points) {
		if (player == 1) this.player1Points.firstChild.nodeValue = points;
		else if (player == 2) this.player2Points.firstChild.nodeValue = points;

	}

	say(message) {
		this.log(message);
		this.info.innerHTML = message.replace('player1', this.player1).replace('player2', this.player2);
	}

	log(message) {
		if (this.log_to_console) console.log(message);
	}
}