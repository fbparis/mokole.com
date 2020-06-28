"use strict";

function distinct_decomposed_permutations(array) {
    let results = [];
    distinct_permutations(array).forEach(_ => {
        distinct_decompositions(_).forEach(r => {
            if (!array_in_array(r, results)) results.push(r.slice())
        });
    });
    return results;
}

function distinct_decompositions(array) {
    let results = [], r, a;
    for (let n = 0; n <= array.length; n++) {
        items2T([1, 2], n).forEach(_ => {
            distinct_permutations(_).forEach(dec => {
                a = array.slice();
                r = dec.map(i => a.splice(0, i));
                if (!array_in_array(r, results)) results.push(r.slice());
            });
        }); 
    }
    return results;
}

function items2T([n,...ns],t) {
    var c = ~~(t/n);
    return ns.length ? Array(c+1).fill()
                                 .reduce((r,_,i) => r.concat(items2T(ns, t-n*i).map(s => Array(i).fill(n).concat(s))),[])
                     : t % n ? []
                             : [Array(c).fill(n)];
}

function distinct_permutations(array) {
    const N = array.length;
    let A = array.slice();
    let results = [A.slice()];
    let c = new Array(N).fill(0);
    let i = 1;
    let k;
    while (i < N) {
        if (c[i] < i) {
            k = i % 2 && c[i];
            [A[i], A[k]] = [A[k], A[i]];
            ++c[i];
            i = 1;
            if (!array_in_array(A, results)) results.push(A.slice());
        } else {
            c[i] = 0;
            ++i;
        }
    }
    return results;
}

function product(pools) {
    let results = [];
    let i = 0;
    const indexes = new Array(pools.length).fill(0);
    const result = indexes.map((x, i) => pools[i][x]);
    indexes[0] = -1;
    while (i < indexes.length) {
        if (indexes[i] < pools[i].length - 1) {
            indexes[i]++;
            result[i] = pools[i][indexes[i]];
            i = 0;

            // NB: can remove `.slice()` for a performance improvement if you don't mind mutating the same result object
            results.push(result.slice());
        } else {
            indexes[i] = 0;
            result[i] = pools[i][0];
            i++;
        }
    }
    return results;
}

function array_in_array(needle, haystack) {
    return haystack.some(a => needle.every((v, i) => v === a[i]));
}

class SlimeVsUnicorn {

    constructor(graph_data, animator=null) {
        let nodesCount = graph_data.length;
        let edgesCount = 0;
        let bagOfGems = shuffle([...Array(nodesCount).keys(), ...Array(nodesCount).keys()]);
        // let drawedGems = Array(nodesCount).fill(0);
        let gemsPerPlayer, maxGemsPerPlayer
        let player1Gems = [];
        let player2Gems = [];
        let publicGems = [];
        if (nodesCount  <= 6) {
            gemsPerPlayer = 1;
            maxGemsPerPlayer = 3;
        } else if (nodesCount <= 9) {
            gemsPerPlayer = 2;
            maxGemsPerPlayer = 4;
        } else if (nodesCount <= 12) {
            gemsPerPlayer = 3;
            maxGemsPerPlayer = 5;
        } else {
            throw 'Invalid number of nodes (must be between 4 and 12 included)';
        }
        for (let i = 0; i < gemsPerPlayer; i++) {
            player1Gems.push(bagOfGems.pop());
            player2Gems.push(bagOfGems.pop());
            publicGems.push(bagOfGems.pop());
        }
        let board = [];
        for (let i = 0; i < nodesCount; i++) {
            const [coords, edges] = graph_data[i];
            edgesCount += edges.length;
            board.push({
                owner: -1,
                edges: []
            });
            edges.forEach(edge => board[i].edges.push({owner: -1, to: edge}));
        }
        this.state = {
            animator: animator,
            nodesCount: nodesCount,
            edgesCount: edgesCount,
            randomSeed: Math.random(),
            movesCount: 0,
            maxGemsPerPlayer: maxGemsPerPlayer,
            publicGemsCount: gemsPerPlayer,
            board: board,
            bagOfGems: bagOfGems,
            discardedGems: [],
            publicGems: publicGems,
            player1Gems: player1Gems,
            player2Gems: player2Gems,
            player1Score: 0,
            player2Score: 0,
            round: 1,
            remainingTurns: -1,
            playerTurn: (Math.random() < .5) ? 1 : 2,
            gameOver: false,
            winner: -1
        };
        if (this.state.animator !== null) this.state.animator.say(`player${this.state.playerTurn} plays first`);
    }

    getState() {
        return this.state;
    }

    setState(state) {
        this.state = state;
    }

    cloneState() {
        let board = [], edges;
        this.state.board.forEach(item => {
            edges = [];
            item.edges.forEach(edge => edges.push({...edge}));
            board.push({owner: item.owner, edges: edges});
        });
        return {
            ...this.state,
            board: board,
            bagOfGems: this.state.bagOfGems.slice(),
            publicGems: this.state.publicGems.slice(),
            player1Gems: this.state.player1Gems.slice(),
            player2Gems: this.state.player2Gems.slice(),
            discardedGems: this.state.discardedGems.slice()
        }
    }

    getEdges() {
        let edgesState = {};
        this.state.board.forEach((item, i) => {
            item.edges.forEach(edge => {
                edgesState[[i, edge.to]] = {owner: edge.owner};
            });
        });
        return edgesState;        
    }

    moves() {
        // returns: [ [ actions, discard_index, take_index ], ... ]
        // actions: [ [ gem_color1, gem_color2 |, node_index ], ... ]
        let moves = [];
        let playerGems = (this.state.playerTurn == 1) ? this.state.player1Gems : this.state.player2Gems;
        let opponent = (this.state.playerTurn == 1) ? 2 : 1;
        let seqs, items, isValid;
        let take = [], take_values = [], discard_values = [];
        this.state.publicGems.forEach((v, i) => {
            if (!take_values.includes(v)) {
                take.push(i);
                take_values.push(v);
            }
        }); 
        if (this.state.bagOfGems.length > 0) take.push(this.state.publicGemsCount);
        let edgesState, edge;
        // list all possible sequences of actions given player gems
        distinct_decomposed_permutations(playerGems).forEach(seq => {
            // combine sequence with all possible options for each action in the sequence
            seqs = [];
            isValid = true;
            for (let item of seq) {
                items = []
                if (item.length == 1) {
                    this.state.board[item[0]].edges.forEach(edge => {
                        if (edge.owner != this.state.playerTurn) {
                            items.push(item.concat([edge.to]));
                        }
                    });
                } else {
                    if (item[0] == item[1]) {
                        this.state.board[item[0]].edges.forEach(edge => {
                            if (edge.owner == opponent) {
                                items.push(item.concat([edge.to]));
                            }
                        });
                    } else if (this.state.board[item[0]].edges.some(edge => (edge.owner == opponent) && (edge.to == item[1]))) {
                        items.push(item.concat([item[1]]));
                    }
                }
                if (items.length == 0) {
                    isValid = false;
                    break;
                }
                seqs.push(items.slice());
            }
            // check each new sequences and keep valid ones
            if (isValid) {
                if (seqs.length == 0) seqs = [[[]]];
                product(seqs).forEach(_seq => {
                    if (_seq[0].length == 0) _seq = [];
                    isValid = true;
                    edgesState = this.getEdges();
                    for (let item of _seq) {
                        edge = edgesState[[item[0], item[item.length - 1]]];
                        if (((item.length == 2) && (edge.owner != -1)) || ((item.length == 3) && (edge.owner != opponent))) {
                            isValid = false;
                            break;
                        }
                        if (item.length == 2) {
                            edge.owner = edgesState[[item[item.length - 1], item[0]]].owner = this.state.playerTurn; 
                        } else {
                            edge.owner = edgesState[[item[item.length - 1], item[0]]].owner = -1; 
                        }
                    }
                    if (isValid) {
                        // discard if needed
                        if ((_seq.length == 0) && (playerGems.length == this.state.maxGemsPerPlayer) && (this.state.remainingTurns < 0)) {
                            for (let i = 0; i < this.state.maxGemsPerPlayer; i++) {
                                if (!discard_values.includes(playerGems[i])) {
                                    _seq.push([[], i]);
                                    discard_values.push(playerGems[i]);
                                }
                                
                            }
                        } else {
                            _seq = [[_seq, -1]];
                        }
                        // draw a new gem if needed
                        if (this.state.remainingTurns > 0) {
                            _seq.forEach(s => {
                                moves.push(s.concat([-1]))
                            });
                        } else {
                            _seq.forEach(s => {
                                take.forEach(t => {
                                    moves.push(s.concat(t));
                                });                            
                            });
                        }
                    }
                });
            }
        });
        // if (moves.length == 0) {
        //     console.log(this.state);
        //     throw 'no move found';
        // } else if (moves[0][0].length !== 0) console.log(`moves[0]=${moves[0].toSource()}`);
        return moves;
    }

    getEdge(node_from, node_to) {
        for (let edge of this.state.board[node_from].edges) {
            if (edge.to == node_to) return edge;
        }
    }

    updateEdge(node_from, node_to, owner, animate) {
        // todo animate
        // update owner on both sides
        if (animate && (this.state.animator !== null)) this.state.animator.edgeOwner(owner, node_from, node_to);
        this.getEdge(node_from, node_to).owner = owner;
        this.getEdge(node_to, node_from).owner = owner;
        // cascading shit with style
        var nodes_to_check =  [node_from, node_to]
        let newOwner;
        for (let node of nodes_to_check) {
            newOwner = this.nodeOwner(node);
            if (newOwner != this.state.board[node].owner) {
                if (animate && (this.state.animator !== null)) {
                    this.state.animator.nodeOwner(newOwner, node);
                    if (this.state.board[node].owner != -1) {
                        this.state.animator.say(`player${this.state.board[node].owner} has lost node ${node}`);
                    }                 
                    if (newOwner != -1) {
                        this.state.animator.say(`player${newOwner} has taken node ${node}`);
                    }                 
                }
                this.state.board[node].owner = newOwner;
                // if new owner is a player, remove other player's edges
                if (newOwner != -1) {
                    for (let edge of this.state.board[node].edges) {
                        if ([-1, newOwner].indexOf(edge.owner) == -1) {
                            edge.owner = -1;
                            this.getEdge(edge.to, node).owner = -1;
                            if (animate && (this.state.animator !== null)) this.state.animator.edgeOwner(-1, node, edge.to);
                            // will have to check other side of the edge...
                            if (nodes_to_check.indexOf(edge.to) == -1) {
                                nodes_to_check.push(edge.to);
                            }
                        }
                    }
                }
            }
        }
    }

    nodeOwner(node) {
        let n = Math.floor(this.state.board[node].edges.length / 2);
        let total = [0, 0, 0], i;
        for (let edge of this.state.board[node].edges) {
            i = Math.max(0, edge.owner);
            if (++total[i] > n) return (i == 0) ? -1 : i;
        }
        return -1;
    }

    addEdge(node_from, node_to, animate=false) {
        // todo: animate
        let playerGems = (this.state.playerTurn == 1) ? this.state.player1Gems : this.state.player2Gems;
        // discard used gem
        let gem_idx = playerGems.indexOf(node_from);
        this.state.discardedGems.push(playerGems[gem_idx]);
        playerGems.splice(gem_idx, 1);
        // add edge
        this.updateEdge(node_from, node_to, this.state.playerTurn, animate);
    }

    removeEdge(node_from, node_alt, node_to, animate=false) {
        // todo: animate
        let playerGems = (this.state.playerTurn == 1) ? this.state.player1Gems : this.state.player2Gems;
        let gem_idx;
        // discard used gems
        for (let gem of [node_from, node_alt]) {
            gem_idx = playerGems.indexOf(gem);
            this.state.discardedGems.push(playerGems[gem_idx]);
            playerGems.splice(gem_idx, 1);
        }
        // remove edge
        this.updateEdge(node_from, node_to, -1, animate);
    }

    discardGem(discard_idx, animate=false) {
        // todo animate
        let playerGems = (this.state.playerTurn == 1) ? this.state.player1Gems : this.state.player2Gems;
        if (playerGems.length < this.state.maxGemsPerPlayer) throw 'forbidden move: discarding gem when gems count is less than maxGemsPerPlayer';
        this.state.discardedGems.push(playerGems[discard_idx]);
        playerGems.splice(discard_idx, 1);
    }

    takeGem(gem_idx, animate=false) {
        // todo: animate
        let playerGems = (this.state.playerTurn == 1) ? this.state.player1Gems : this.state.player2Gems;
        if (playerGems.length >= this.state.maxGemsPerPlayer) throw 'forbidden move: drawing a gem when gems count is equal to maxGemsPerPlayer';
        if (gem_idx < this.state.publicGemsCount) {
            playerGems.push(this.state.publicGems[gem_idx]);
            this.state.publicGems.splice(gem_idx, 1);
            if (this.state.bagOfGems.length > 0) {
                this.state.publicGems.push(this.state.bagOfGems.pop());
            } 
        } else {
            playerGems.push(this.state.bagOfGems.pop());
        }
    }

    endTurn (animate=false) {
        // todo: animate
        let roundEnded = (this.state.remainingTurns < 0) && (Math.max(this.state.bagOfGems.length, this.state.publicGems.length) == 0);
        if (this.state.remainingTurns > 0) {
            // we are in the last two turns
            this.state.remainingTurns--;
            if (this.state.remainingTurns == 0) { // game is over
                // update scores and assign winner
                let player1Score = 0, player2Score = 0;
                let player1Edges = 0, player2Edges = 0;
                this.state.board.forEach(item => {
                    if (item.owner == 1) player1Score++;
                    else if (item.owner == 2) player2Score++;
                    item.edges.forEach(edge => {
                        if (edge.owner == 1) player1Edges++;
                        else if (edge.owner == 2) player2Edges++;
                    });    
                });
                if (player1Score > player2Score) this.state.player1Score += player1Score - player2Score;
                else if (player2Score > player1Score) this.state.player2Score += player2Score - player1Score;
                if (this.state.player1Score == this.state.player2Score) {
                    if (player1Score == player2Score) {
                        this.state.winner = (player1Edges == player2Edges) ? -1 : ((player1Edges > player2Edges) ? 1 : 2);
                    } else this.state.winner = (player1Score > player2Score) ? 1 : 2;
                } else this.state.winner = (this.state.player1Score > this.state.player2Score) ? 1 : 2;
                this.state.gameOver = true;
                if (animate && (this.state.animator !== null)) {
                    this.state.animator.updatePoints(1, this.state.player1Score);
                    this.state.animator.updatePoints(2, this.state.player2Score);
                    this.state.animator.updateScore(this.state.winner, 1);
                    if (this.state.winner == -1) this.state.animator.say(`draw game with score ${this.state.player1Score}-${this.state.player2Score}`);
                    else this.state.animator.say(`player${this.state.winner} won the game with score ${this.state.player1Score}-${this.state.player2Score}`);
                }
            }
        } else if (roundEnded) {
            if (this.state.round < 3) {
                // compute round scores
                let player1Score = 0, player2Score = 0;
                this.state.board.forEach(item => {
                    if (item.owner == 1) player1Score++;
                    else if (item.owner == 2) player2Score++;
                });
                // round winner takes the points
                if (player1Score > player2Score) {
                    this.state.player1Score += this.state.round;
                } else if (player2Score > player1Score) {
                    this.state.player2Score += this.state.round;
                } 
                if (animate && (this.state.animator !== null)) {
                    this.state.animator.updatePoints(1, this.state.player1Score);
                    this.state.animator.updatePoints(2, this.state.player2Score);                    
                    this.state.animator.say(`round ${this.state.round} ended on score ${this.state.player1Score}-${this.state.player2Score}`);
                }
                // init the board for next round
                Math.seedrandom(this.state.toSource());
                this.state.bagOfGems = shuffle(this.state.discardedGems);
                this.state.discardedGems = [];
                for (let i = 0; i < this.state.publicGemsCount; i++) this.state.publicGems.push(this.state.bagOfGems.pop());
                this.state.round++;
            } else {
                // we were in the last round, players can play one last turn
                this.state.remainingTurns = 2;
            }
        }
        // if not game over, next player turn
        if (!this.gameOver()) this.state.playerTurn = (this.state.playerTurn == 1) ? 2 : 1;
    }

    evaluate(playerTurn=this.state.playerTurn) {
        // evaluate a position
        let nodesDiff = 0;
        let edgesDiff = 0;
        let score = this.state.player1Score - this.state.player2Score;
        this.state.board.forEach(item => {
            if (item.owner == 1) nodesDiff++;
            else if (item.owner == 2) nodesDiff--;
            item.edges.forEach(edge => {
                if (edge.owner == 1) edgesDiff++;
                else if (edge.owner == 2) edgesDiff--
            });    
        });
        score += nodesDiff + edgesDiff / (1 + this.state.edgesCount);
        return (playerTurn == 1) ? score : -score;
    }

    playMove(move, animate=false) {
        // play a move, updating game state
        if (this.gameOver()) throw 'can not play move when game is over';
        this.state.movesCount++;
        // todo: decompose steps
        if (animate && (this.state.animator !== null)) {
            this.state.animator.log(`player${this.state.playerTurn} plays move ${move.toSource()}`);
        }
        const [actions, discard, take] = move;

        // performining actions in order
        if (actions.length > 0) {
            let node_from, node_to, node_alt;
            actions.forEach(action => {
                switch (action.length) {
                    case 2: // adding edge
                        [node_from, node_to] = action;
                        this.addEdge(node_from, node_to, animate);
                        break;
                    case 3: // removing opponent edge
                        [node_from, node_alt, node_to] = action;
                        this.removeEdge(node_from, node_alt, node_to, animate);
                        break 
                }
            });
        }

        // discarding a gem if required
        if (discard != -1) {
            this.discardGem(discard, animate);
        }

        // draw a new gem if possible
        if (take != -1) {
            this.takeGem(take, animate);
        } 

        // end turn
        this.endTurn(animate);
    }

    gameOver() {
        return this.state.gameOver;
    }

    winner() {
        return this.state.winner;
    }
}