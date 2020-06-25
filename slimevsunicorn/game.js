class SlimeVsUnicorn {

    constructor(){
        this.state = {}
    }

    getState(){/*returns a single object representing game state*/}
    setState(state){/* set game internal state */}
    cloneState(){/* returns a DEEP copy of game state */}

    moves(){/* returns list of valid moves given current game state*/}
    playMove(move){/* play a move, move being an element from .moves() list */}
    gameOver(){/* true if game is over, false otherwise */}
    winner(){/* number of winning player, -1 if draw" */}
}