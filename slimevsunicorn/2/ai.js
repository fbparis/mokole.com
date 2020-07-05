"use strict";

/*	persistent mcts for random/hidden informations 
	inspired by:
		- https://core.ac.uk/download/pdf/30267707.pdf
		- python implementation: https://gist.github.com/kjlubick/8ea239ede6a026a61f4d
*/

importScripts('alea.min.js');

var UCBExploration = Math.SQRT1_2;
var MCTSIsRunning = true;
var MCTSUpdateRoot = null;

class _GameBase {
	constructor() {
		this.state = {
			playersCount: 0,
			playerTurn: -1,
			gameOver: false,
			movesCount: 0,
		}
		this.state.reward = Array(this.state.playersCount).fill(0);
	}
	getState() { return this.state; }
	setState(state) { this.state = state; }
	cloneState() { return JSON.parse(JSON.stringify(this.state)); }
	cloneAndRandomizeState(player=null) { return this.cloneState(); }
	playerTurn() { return this.state.playerTurn; }
	gameOver() { return this.state.gameOver; }
	winner() {
		// game has a winner if reward is > 0 and > other players rewards
		// else we say it's a draw
		let maxReward = Math.max(...this.state.reward);
		if (maxReward <= 0) return -1;
		let winner = this.state.reward.indexOf(maxReward);
		if (winner != this.state.reward.lastIndexOf(maxReward)) return -1;
		retun winner;
	}
	reward(player) { return this.state.reward[player]; }
	moves() { throw 'Not Implemented'; }
	playMove(move) { throw 'Not Implemented'; }
}

class _BSTVectorBase {
	constructor(parent=null) {
		this.parent = parent;		
	}
	get(index) { throw 'Not Implemented'; }
	set(index, value) { throw 'Not Implemented'; }
	get UCB() { return this._UCB; }
}

class _BSTVectorLeaf extends _BSTVectorBase {
	constructor(parent=null) {
		super(parent);
		this._dim = 1;
		this.visits = 0;
		this.rewards = 0;
		this._UCB = 0;
	}
	get parentVisits() return this.parent.visits;
	get(index) {
		if (index != 0) throw 'Index Error';
		return [this.visits, this.rewards];
	}
	set(index, value) {
		[this.visits, this.rewards] = value;
		this._update_UCB();
	}
	update(index, value) {
		const [visits, rewards] = value;
		this.visits += visits;
		this.rewards += rewards;
		this._update_UCB();
	}
	selectNodeIndex() { return 0; }
	_update_UCB() {
		this._UCB = this.rewards / this.visits + UCBExploration * Math.sqrt(Math.log(this.parent.visits) / this.visits);
	}
}

class _BSTVectorNode extends _BSTVectorBase {
	constructor(dim, parent=null) {
		super(parent);
		this._dim = dim;
		this._UCB = 0;
		this.left = null;
		this.right = null;
	}
	get cutoff() { return Math.floor(this._dim / 2); }
	get parentVisits() return this.parent.visits;
	get(index) {
		if (index >= this._dim) throw 'Index Error';
		let childLeft = true, childIndex = index;
		if (index >= this.cutoff) {
			childLeft = false;
			childIndex = index - this.cutoff;
		}
		let child = childLeft ? this.left : this.right;
		if (child === null) return [0, 0];
		return child.get(childIndex);
	}
	set(index, value) {
		let childLeft = true, childIndex = index, childSize = this.cutoff;
		if (index >= this.cutoff) {
			childLeft = false;
			childIndex = index - this.cutoff;
			childSize = this._dim - this.cutoff;
		}
		let child = childLeft ? this.left : this.right;
		if (child === null) {
			this[childLeft ? 'left' : 'right'] = new BSTVector(childSize);
			child = childLeft ? this.left : this.right;
		}
		child.set(childIndex, value);
		if (child.UCB == 0) this[childLeft ? 'left' : 'right'] = null;
		this._update_UCB();
	}
	update(index, value) {
		let childLeft = true, childIndex = index, childSize = this.cutoff;
		if (index >= this.cutoff) {
			childLeft = false;
			childIndex = index - this.cutoff;
			childSize = this._dim - this.cutoff;
		}
		let child = childLeft ? this.left : this.right;
		if (child === null) {
			this[childLeft ? 'left' : 'right'] = new BSTVector(childSize);
			child = childLeft ? this.left : this.right;
			child.set(childIndex, value);
		} else child.update(childIndex, value);
		if (child.UCB == 0) this[childLeft ? 'left' : 'right'] = null;
		this._update_UCB();
	}
	_update_UCB() {
		this._UCB = Math.max((this.left !== null) ? this.left.UCB : 0, (this.right !== null) ? this.right.UCB : 0);
	}
	selectNodeIndex() {
		if (this.UCB == 0) throw 'Value Error (No nonzero entries)';
		if ((this.left === null) || (this.left.UCB < this.UCB)) return this.cutoff + this.right.selectNodeIndex();
		return this.left.selectNodeIndex();
	}
}

function BSTVector(dim, parent=null) {
	return (dim == 1) ? _BSTVectorLeaf(parent) : _BSTVectorNode(dim, parent);
}

class BSTMCTSNode {
	// Node used in BSTMCTS
	constructor(moves, player, parent=null, index=null) {
		this.parent = parent;
		this.player = player;
		this.moveIndex = index; // index in parent's moves
		this.moves = moves;
		this.visits = 0;
		this.children = Array(moves.length).fill(null);
		this.childrenVector = BSTVector(moves.length, this);
		this.unexpandedMoves = [...Array(moves.length).keys()]; // could use another BST vector here
		if (parent === null) this.rewards = 0;
	}
}

class BSTMCTS {
	// Classic MCTS with BSTVectors to represent children and compute UCB in O(1)
	constructor(game, max_iterations=-1, verbose=false) {
		this.game = game;
		this.max_iterations = max_iterations;
		this.verbose = verbose;
	}
	selectMove() {
		if (this.verbose) console.time('BSTMCTS:selectMove');
		MCTSUpdateRoot = [];
		let player, maxVisits, maxVisitsMoveIndex;
		let selectedNode, expandedNode, reward;
		while (MCTSIsRunning) {
			if (MCTSUpdateRoot !== null) { // in prevision of future webworker interface
				if (this.verbose) console.log('updating root node');
				for (let move of MCTSUpdateRoot) this.game.playMove(move);
				const originalState = this.game.getState();
				const possibleMoves = this.game.moves();
				player = this.game.playerTurn;
				const root = new BSTMCTSNode(possibleMoves, player);
				MCTSUpdateRoot = null;
				maxVisits = 0, maxVisitsMoveIndex = -1;
				root.children.forEach(node, i => {
					if (node !== null) {
						if (node.visits > maxVisits) {
							maxVisits = node.visits;
							maxVisitsMoveIndex = i;
						}
					}
				});
			}
			const clonedState = this.game.cloneState();
			this.game.setState(clonedState);
			selectedNode = this.selectNode(root);
			if (this.game.gameOver()) {
				// prevent worst moves
				if (this.game.reward(selectedNode.parent.player) < 0) selectedNode.parent.childrenVector.update(selectedNode.moveIndex, [0, Number.MIN_SAFE_INTEGER]);
			}
			expandedNode = this.expandNode(selectedNode);
			this.playout(expandedNode);
			const [moveIndex, visits] = this.backprop(expandedNode);
			if (visits > maxVisits) {
				maxVisits = visits;
				maxVisitsMoveIndex = moveIndex;
			}
			this.game.setState(originalState);
			if ((max_iterations > 0) && (root.visits >= max_iterations)) break;
		}
		// choose move with most rewards, or visits, or rewards / visits?
		let maxReward = -Infinity, maxScore = -Infinity;
		let maxRewardtMoveIndex = -1, maxScoreMoveIndex = -1, score;
		for (let i in root.moves) {
			const [visits, rewards] = root.childrenVector.get(i);
			score = rewards / visits;
			if (rewards > maxReward) {
				maxReward = rewards;
				maxRewardMoveIndex = i;
			}
			if (score > maxScore) {
				maxScore = score;
				maxScoreMoveIndex = i;
			}
		}
		this.game.setState(originalState);
		if (verbose) {
			console.timeEnd('BSTMCTS:selectMove');
			console.log(`${root.visits} games simulated with average reward of ${root.rewards / root.visits}`);
			console.log(`move ${maxVisitsMoveIndex} had ${maxVisits} visits`;
			console.log(`move ${maxRewardMoveIndex} had ${maxReward} rewards`;
			console.log(`move ${maxScoreMoveIndex} had score ${maxScore}`;
		}
		return root.moves[maxRewardMoveIndex];
	}
	selectNode(root) {
		let selectedNodeIndex;
		while (root.unexpandedMoves.length == 0) {
			selectedNodeIndex = root.childrenVector.selectNodeIndex();
			this.game.playMove(root.moves[selectedNodeIndex]);
			root = root.children[selectedNodeIndex];
			if (this.game.gameOver()) break;
		}
		return root;
	}
	expandNode(node) {
		if (this.game.gameOver()) return node;
		const childIndex = this.selectRandomUnexpandedChild(node);
		this.game.playMove(node.moves[childIndex]);
		node.children[childIndex] = BSTMCTSNode(this.game.moves(), this.game.playerTurn, node, childIndex);
		return node.children[childIndex];
	}
	playout(node) {
		while (!this.game.gameOver()) {
			const moves = this.game.moves();
			this.game.playMove(moves[Math.floor(Math.random() * moves.length)]);
		}
	}
	backprop(node) {
		while (node != null) {
			node.visits += 1
			if (node.parent !== null) {
				const [moveIndex, visits] = [node.moveIndex, node.visits];
				node.parent.childrenVector.update(moveIndex, [1, this.game.reward(node.player)]);
			} else this.rewards += this.game.reward(node.player);
			node = node.parent;
		}
		return [moveIndex, visits];
	}
	selectRandomUnexpandedChild(node) {
		let childIndex = Math.floor(Math.random() * node.unexpandedMoves.length);
		[childIndex] = node.unexpandedMoves.splice(childIndex, 1);
		return childIndex;
	}
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
	selectMove() {
		if (this.verbose) console.time('ISMCTS:selectMove');
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
		}
		if (verbose) {
			console.timeEnd('ISMCTSNode:selectedMove');
			console.log(`${root.visits} games simulated with average reward of ${root.rewards / root.visits}`);
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