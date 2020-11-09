"use strict";

Object.defineProperty(Array.prototype, 'shuffle', {
    value: function() {
        for (var i = this.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this[i], this[j]] = [this[j], this[i]];
        }
        return this;
    }
});

Object.defineProperty(Set.prototype, 'pick', {
    value: function() {
    	return choice(Array.from(this.values()));
    }
});

function randint(min, max=null) {
	if (max === null) {
		max = min - 1;
		min = 0;
	}
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function choice(array) {
	return array[randint(array.length)];
}

function range(n) {
	return [...Array(n).keys()];
}

function flat_to_xy(i) {
	return [i % board_size, Math.floor(i / board_size)];
}

function xy_to_flat(x, y) {
	return x + y * board_size;
}

function xy_to_id(x, y) {
	return col_labels[x] + row_labels[y];
}

function id_to_xy(id) {
	return [col_labels.indexOf(id[0]), row_labels.indexOf(id[1])];
}

function flat_to_id(i) {
	return xy_to_id(...flat_to_xy(i));
}

function id_to_flat(id) {
	return xy_to_flat(...id_to_xy(id));
}

function get_size(piece) {
	return [piece[0].length, piece.length];
}

function get_rank(piece) {
	return Math.max.apply(null, piece.map(function(row){ return Math.max.apply(Math, row); }));
}

function is_left_square(piece, x, y) {
	return (x == 0) || (piece[y][x - 1] == 0);
}

function is_right_square(piece, x, y) {
	return (x == piece[y].length - 1) || (piece[y][x + 1] == 0);
}

function is_bottom_square(piece, x, y) {
	return (y == 0) || (piece[y - 1][x] == 0);
}

function is_top_square(piece, x, y) {
	return (y == piece.length - 1) || (piece[y + 1][x] == 0);
}

function rotate_piece(piece) {
	const w = piece.length;
	const h = piece[0].length;
	let b = new Array(h);
	for (let y=0; y<h; y++) {
		b[y] = new Array(w);
		for (let x=0; x<w; x++) {
			b[y][x] = piece[w-1-x][y];
		}
	}
	return b;
}

const polyominoes_promise = fetch('polyominoes.json')
	.then(response => response.json())
	.then(data => {
		return data;
	});

const board_size = 9;
const col_labels = Array(board_size).fill("");
const row_labels = Array(board_size).fill("");

for (var i = 0; i < board_size; i++) {
	col_labels[i] += String.fromCharCode(i + "A".charCodeAt(0));
	row_labels[i] += (i + 1);
}

const white_cells = Array(21).fill('white');
const yellow_cells = Array(20).fill('yellow');
const red_cells = Array(20).fill('red');
const blue_cells = Array(20).fill('blue');
const board_cells = white_cells.concat(yellow_cells, red_cells, blue_cells).shuffle();
