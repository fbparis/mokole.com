"use strict";


class FBMCTSNode {
	// Node used in FBMCTS
	constructor(move=null, player=null, parent=null) {
		this.move = JSON.parse(move);
		this.player = player;
		this.parent = parent;
		this.visits = 0;
		this.rewards = 0;
		this.avails = 0;
		this.rave_visits = 0;
		this.rave_rewards = 0;
		this.beta = 0.5;
		this.children = {};
	}
	get UCB() {
		//return (this.visits > 0) ? (1 - this.beta) * (this.rewards / this.visits) + this.beta * (this.rave_rewards / this.rave_visits) + UCBExploration * Math.sqrt(Math.log(this.avails) / this.visits) : (1 - this.beta) + this.beta * (this.rave_rewards / this.rave_visits) + UCBExploration;
		return (1 - this.beta) * (this.rewards / this.visits) + this.beta * (this.rave_rewards / this.rave_visits) + UCBExploration * Math.sqrt(Math.log(this.avails) / this.visits);
	}
	updateBeta(reward, alpha) {
		let rave = this.rave_rewards / this.rave_visits,
		mcts = this.rewards / this.visits;
		if (reward != 0) {
			if (rave != mcts) {
				this.beta = (1 - alpha) * this.beta;
				if ((reward > 0) == (rave > mcts)) this.beta += alpha;
			} else this.beta += alpha * 0.5;
		}
	}
}


class FBMCTS {
	/* Extended version of Information Set MCTS
	 * MC-Rave with local auto tune schedule function (exponential mobile average
	 * with parameter alpha, possibly auto tuned according to max_iterations)
	 */
	constructor(game, max_iterations=-1, verbose=false, alpha=0.05) {
		this.game = game;
		this.max_iterations = max_iterations;
		this.verbose = verbose;
		this.alpha = alpha;
		this.rave_moves = {};
	}
	log(message) {
		console.log(`worker:FBMCTS: ${message}`);
	}
	selectMove() {
		if (this.verbose) console.time('worker:FBMCTS:selectMove');
		const originalState = this.game.getState();
		var root = new FBMCTSNode(null, this.game.playerTurn());
		let maxVisits = 0, maxVisitsMove;
		let selectedNode, expandedNode, reward, move, visits;
		while (MCTSIsRunning) {
			const clonedState = this.game.cloneAndRandomizeState(this.game.playerTurn());
			this.game.setState(clonedState);
			expandedNode = this.selectAndExpandNode(root);
			this.playout(expandedNode);
			let r = this.backprop(expandedNode);
			[root, move, visits] = r;
			if (visits > maxVisits) {
				maxVisits = visits;
				maxVisitsMove = move;
			}
			this.game.setState(originalState);
			if ((this.max_iterations > 0) && (root.visits >= this.max_iterations)) break;
			if (MCTSMessage !== null) {
				switch (MCTSMessage) {
					case 'stop':
						MCTSIsRunning = false;
						break;
					case 'info':
						this.log(`${root.visits} games simulated with average reward of ${root.rewards / root.visits}`);
						const [maxRewards, maxAverageReward] = [-Infinity, -Infinity];
						const [maxRewardsIndex, maxAverageRewardIndex, maxVisitsIndex] = [-1, -1, -1];
						let i = 0;
						for (move in root.children) {
							i++;
							const [rewards, averageReward] = [root.children[move].rewards, root.children[move].rewards / root.children[move].visits];
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
		if (this.verbose) {
			console.timeEnd('worker:FBMCTS:selectMove');
			this.log(`${root.visits} games simulated with average reward of ${root.rewards / root.visits}`);
		}
		return maxVisitsMove;
	}
	get legalMoves() {
		return this.game.moves().map(move => JSON.stringify(move));
	}
	selectAndExpandNode(root) {
		let selectedMove, maxUCBScore, UCBScore;
		let unexpandedMoves, expandedMoves;
		while (true) {
			unexpandedMoves = [];
			expandedMoves = [];
			if (this.game.gameOver()) break;
			maxUCBScore = -Infinity;
			this.legalMoves.forEach(move => {
				if (!root.children.hasOwnProperty(move) || (root.children[move].visits == 0)) unexpandedMoves.push(move);
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
			let move = unexpandedMoves[Math.floor(Math.random() * unexpandedMoves.length)];
			if (!root.children.hasOwnProperty(move)) root.children[move] = new FBMCTSNode(move, this.game.playerTurn(), root);
			else root.children[move].player = this.game.playerTurn();
			root = root.children[move];
			root.avails++;
			this.game.playMove(root.move);
		}
		return root;
	}
	playout(node) {
		let move, moveIndex;
		this.rave_moves = {};
		while (!this.game.gameOver()) {
			const moves = this.game.moves();
			move = moves[Math.floor(Math.random() * moves.length)]
			moveIndex = JSON.stringify(move);
			if (!this.rave_moves.hasOwnProperty(moveIndex)) this.rave_moves[moveIndex] = {move: move, playedBy: []};
			this.rave_moves[moveIndex].playedBy.push(this.game.playerTurn());
			this.game.playMove(move);
		}
	}
	backprop(node) {
		let reward, moveIndex, r;
		while(node !== null) {
			node.visits++;
			node.rave_visits++;
			reward = this.game.reward(node.player);
			node.rewards += reward;
			node.rave_rewards += reward;
			node.updateBeta(reward, this.alpha);
			for (let moveIndex in this.rave_moves) {
				for (let player of this.rave_moves[moveIndex].playedBy) {
					if (!node.children.hasOwnProperty(moveIndex)) node.children[moveIndex] = new FBMCTSNode(moveIndex, null, node);
					node.children[moveIndex].rave_visits++;
					node.children[moveIndex].rave_rewards += this.game.reward(player);
				}
			}
			moveIndex = JSON.stringify(node.move);
			if (!this.rave_moves.hasOwnProperty(moveIndex)) this.rave_moves[moveIndex] = {move: node.move, playedBy: []};
			this.rave_moves[moveIndex].playedBy.push(node.player);
			if (node.parent !== null) r = [node.move, node.visits];
			else return [node, ...r];
			node = node.parent;
		}
		throw 'FBMCTS: backprop from null node'; 
	}
}