"use strict";

// ImportScripts();


var UCBExploration = Math.SQRT1_2;
var MCTSIsRunning = true;
var MCTSMessage = null;


/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}


function distinct_combinations(array, k) {
	let n = array.length;
	if (k > n) return [];
	const indices = [...Array(k).keys()];
	const results = [array.slice(0, k)];
	while (true) {
		for (var i = k - 1; i >= 0; i--) {
			if (indices[i] != i + n - k) break;
		}
		if (i < 0) return results;
		indices[i]++;
		for(let j = i + 1; j < k; j++) {
			indices[j] = indices[j - 1] + 1;
		}
		const r = [];
		for (let i of indices) r.push(array[i]);
		if (!results.some(a => r.every((v, i) => v === a[i]))) results.push(r.slice());
	}
}


function Player(id, gems=[], score=0, points=0) {
	return {
		id: id,
		gems: gems,
		score: score,
		points: points
	}
}


class SlimeVsUnicon {
	constructor(graph_data, playersId=['player1', 'player2'], animator=null) {
		const [nodesCount, edgesCount, board, bagOfGems] = this._loadGraph(graph_data), maxGemsPerPlayer = 3, players = [];
		for (let i = 0; i < 2; i++) players.push(new Player(playersId[i], gems=bagOfGems.splice(0, maxGemsPerPlayer)));
		this.state = {
			animator: animator,
			nodesCount: nodesCount,
			edgesCount: edgesCount,
			movesCount: 0,
			maxGemsPerPlayer: maxGemsPerPlayer,
			board: board,
			bagOfGems: bagOfGems,
			players: players,
			playerTurn: Math.floor(Math.random() * 2),
			rewards: Array(2).fill(0),
			gameOver: false,
			moves: null
		};
	}
	_loadGraph(graph_data) {
		const nodesCount = graph_data.length, board = [], 
		bagOfGems = shuffle([...Array(nodesCount).keys(), ...Array(nodesCount).keys(), ...Array(nodesCount).keys()]);
		let edgesCount = 0;
		for (let i = 0; i < nodesCount; i++) {
			const [coords, edges] = graph_data[i];
			edgesCount += edges.length;
			board.push({owner: -1, edges: {}});
			edges.forEach(edge => board[i].edges[edge] = -1);
		}
		return [nodesCount, edgesCount, board, bagOfGems];
	}
	newGame(graph_data) {
		// todo: animate
		[this.state.nodesCount, this.state.edgesCount, this.state.board, this.state.bagOfGems] = this._loadGraph(graph_data);
		this.state.players.forEach(player => {
			player.points = 0;
			player.gems = this.state.bagOfGems.splice(0, this.state.maxGemsPerPlayer);
		}); 
		this.state = {
			...this.state,
			movesCount: 0,
			playerTurn: Math.floor(Math.random() * 2),
			rewards: Array(2).fill(0),
			gameOver: false,
			moves: null			
		};
	}
	getState() { return this.state; }
	setState(state) { this.state = state; }
	cloneState() { return JSON.parse(JSON.stringify(this.state)); }
	cloneAndRandomizeState(player) {
		const state = this.cloneState();
		state.randomSeed = Math.random();
		state.players.forEach((p, i) => {
			if (i != player) {
				state.bagOfGems = state.bagOfGems.concat(p.gems);
				p.gems = [];
			}
		});
		shuffle(state.bagOfGems);
		state.players.forEach((p, i) => {
			if (i != player) {
				p.gems = state.bagOfGems.splice(0, state.maxGemsPerPlayer);
			}
		});
		return state;
	}
	playerTurn() { return this.state.playerTurn; }
	moves() {
		if (this.state.moves === null) {
			const moves = [], player = this.state.players[this.state.playerTurn];
			distinct_combinations(player.gems, 1).forEach(([from]) => {
				for (let to in this.state.board[from].edges) {
					if (this.state.board[from].edges[to] == -1) moves.push([from, to]);
				}
			});
			distinct_combinations(player.gems, 2).forEach(([from, to]) => {
				if (from == to) {
					for (let to in this.state.board[from].edges) {
						if (![-1, this.state.playerTurn].includes(this.state.board[from].edges[to])) moves.push([from, from, to]);
					}
				} else {
					if (this.state.board[from].edges.hasOwnProperty(to)) {
						if (![-1, this.state.playerTurn].includes(this.state.board[from].edges[to])) moves.push([from, to, to]);
					}
				}
			});
			this.state.moves = (moves.length > 0) ? moves : [null];
		}
		return this.state.moves;
	}
	_nodeOwner(node) {
		let n = Math.floor(this.state.board[node].edges.length / 2), i;
		const total = {-1: 0, 0: 0, 1: 0};
		for (let edge in this.state.board[node].edges) {
			i = Math.max(0, this.state.board[node].edges[edge]);
			if (++total[i] > n) return i;
		}
	}
	_updateEdge(from, to, animate) {
		let value = (this.state.board[from].edges[to] == -1) ? this.state.playerTurn : -1, nodeOwner;
		// todo: animate
		[this.state.board[from].edges[to], this.state.board[to].edges[from]] = [value, value];
		const nodesToCheck = [from, to];
		for (let node of nodesToCheck) {
			nodeOwner = this._nodeOwner(node);
			if (nodeOwner != this.state.board[node].owner) {
				if (nodeOwner == -1) this.state.players[this.state.board[node].owner].points--;
				// todo: animate
				this.state.board[node].owner = nodeOwner;
				if (nodeOwner != -1) {
					this.state.players[nodeOwner].points++;
					// remove other player's edges if some
					for (let edge in this.state.board[node].edges) {
						if (![-1, nodeOwner].includes(this.state.board[node].edges[edge])) {
							// todo: animate
							this.state.board[node].edges[edge] = -1; 
							this.state.board[edge].edges[node] = -1;
							if (!nodesToCheck.includes(edge)) nodesToCheck.push(edge);
						}
					}
				}
			}
		}
	}
	playMove(move, animate=false) {
		if (this.state.gameOver) throw 'game is over';
		this.state.movesCount++;
		if (move === null) { // game is over / todo: animate
			this.state.gameOver = true;
			this.state.winner = -1;
			for (let i = 0; i < 2) {
				const [player, opponent] = [this.state.players[i], this.state.players[1 - i]];
				this.state.rewards[i] = player.points - opponent.points;
				if (this.state.rewards[i] > 0) {
					player.score++;
					this.state.winner = i;
				}
			}
		} else {
			// discard one or two gems / todo: animate
			this.state.bagOfGems = this.state.bagOfGems.concat(move.slice(0, move.length - 1));
			// replace one or two gems in player's hand
			for (let i = 0; i < move.length - 1; i++) this.state.players[this.state.playerTurn].gems[this.state.players[this.state.playerTurn].gems.indexOf(move[i])] = this.state.bagOfGems.splice(Math.floor(Math.random() * this.state.bagOfGems.length), 1)[0];
			// do move
			this._updateEdge(move[0], move[move.length - 1], animate);
			// reset moves and assign next player / todo: animate
			this.state.moves = null;
			this.state.playerTurn = (this.state.playerTurn == 0) ? 1 : 0;
		}
	}
	reward(player) { return this.state.rewards[player]; }
	gameOver() { return this.state.gameOver; }
	winner() { return this.state.winner; }
}


class ISMCTSNode {
	// Node used in ISMCTS
	constructor(move=null, player=null, parent=null) {
		this.move = JSON.parse(move);
		this.player = player;
		this.parent = parent;
		this.visits = 0;
		this.rewards = 0;
		this.avails = 1;
		this.children = {};
	}
	get UCB() {
		return this.rewards / this.visits + UCBExploration * Math.sqrt(Math.log(this.avails) / this.visits);
	}
}


class ISMCTS {
	// Information Set MCTS to handle game with random / incomplete information
	constructor(game, max_iterations=-1, verbose=false) {
		this.game = game;
		this.max_iterations = max_iterations;
		this.verbose = verbose;
	}
	log(message) {
		console.log(`worker:ISMCTS: ${message}`);
	}
	selectMove() {
		if (this.verbose) console.time('worker:ISMCTS:selectMove');
		const originalState = this.game.getState();
		//const possibleMoves = this.game.moves();
		const player = this.game.playerTurn();
		const root = new ISMCTSNode(null, this.game.playerTurn);
		let maxVisits = 0, maxVisitsMove;
		let selectedNode, expandedNode, reward;
		while (MCTSIsRunning) {
			const clonedState = this.game.cloneAndRandomizeState();
			this.game.setState(clonedState);
			let expandedNode = this.selectAndExpandNode(root);
			this.playout(expandedNode);
			const [move, visits] = this.backprop(expandedNode);
			if (visits > maxVisits) {
				maxVisits = visits;
				maxVisitsMove = move;
			}
			this.game.setState(originalState);
			if ((max_iterations > 0) && (root.visits >= max_iterations)) break;
			if (MCTSMessage !== null) {
				switch (MCTSMessage) {
					case 'stop':
						MCTSIsRunning = false;
						break;
					case 'info':
						this.log(`${root.visits} games simulated with average reward of ${root.rewards / root.visits}`);
						const [maxRewards maxAverageReward] = [-Infinity -Infinity];
						const [maxRewardsIndex maxAverageRewardIndex maxVisitsIndex] = [-1 -1, -1];
						let i = 0;
						for (move in root.children) {
							i++;
							const [rewards averageReward] = [root.children[move].rewards root.children[move].rewards / root.children[move].visits];
							if (rewards > maxRewards) {
								maxRewards = rewards;
								maxRewardsIndex = i;
							}
							if (averageReward > maxAverageReward) {
								maxAverageReward = averageReward;
								maxAverageRewardIndex = i;
							}
							if ((maxVisitsIndex == -1) && (root.children[move].visits == maxVisits)) {
								maxVisitsIndex = i;
							}
						}
						this.log(`move ${maxVisitsIndex} has ${maxVisits} visits`);
						this.log(`move ${maxRewardsIndex} has total rewards of ${maxRewards}`);
						this.log(`move ${maxAverageRewardIndex} has best average reward of ${maxAverageReward}`);
						break;
				}
				MCTSMessage = null;
			}
		}
		if (verbose) {
			console.timeEnd('worker:ISMCTSNode:selectedMove');
			this.log(`${root.visits} games simulated with average reward of ${root.rewards / root.visits}`);
		}
		return maxVisitsMove;
	}
	get legalMoves() {
		return this.game.moves.map(move => JSON.stringify(move));
	}
	selectAndExpandNode(root) {
		let selectedMove, maxUCBScore, UCBScore;
		while (true) {
			const unexpandedMoves = [], expandedMoves = [];
			if (this.game.gameOver()) break;
			maxUCBScore = -Infinity;
			this.legalMoves.forEach(move => {
				if (!root.children.hasOwnProperty(move)) unexpandedMoves.push(move);
				else if (unexpandedMoves.length == 0) {
					expandedMoves.push(move);
					UCBScore = root.children[move].UCB;
					if (UCBScore > maxUCBScore) {
						maxUCBScore = UCBScore;
						selectedMove = move;
					}
				}
			});
			if (unexpandedMoves.length > 0) break;
			expandedMoves.forEach(move => {
				root.children[move].avails++;
			});
			root = root.children[selectedMove] 
			this.game.playMove(root.move);
		}
		if (unexpandedMoves.length == 0) { // means game over
			if (this.game.reward(root.player) < 0) root.rewards = Number.MIN_SAFE_INTEGER;
		} else {
			move = unexpandedMoves[Math.floor(Math.random() * unexpandedMoves.length)];
			root.children[move] = new ISMCTSNode(move, this.game.playerTurn, root);
			root = root.children[move];
			this.game.playMove(root.move);
		}
		return root;
	}
	playout(node) {
		while (!this.game.gameOver()) {
			const moves = this.game.moves();
			this.game.playMove(moves[Math.floor(Math.random() * moves.length)]);
		}
	}
	backprop(node) {
		while(node !== null) {
			node.visits++;
			node.rewards += this.game.reward(node.player);
			if (node.parent !== null) const r = [node.move, node.visits];
			else return r;
			node = node.parent;
		}
		throw 'ISMCTS: backprop from null node'; 
	}
}


onmessage = function(e) {
	console.log(`worker: message received: ${e.data}`);
	MCTSMessage = e.data;
}
