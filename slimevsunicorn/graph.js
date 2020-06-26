"use strict";

const nodesColors = ['#800000', '#9A6324', '#808000', '#E6194B', '#F58231', '#FFE119', '#BFEF45', '#AAFFC3', '#4363D8', '#911EB4', '#F03206', '#DCBEFF'];
const nodesIds = 'abcdefghijkl';

let defaultNode = {
	'stroke-width': 2,
	'fill-opacity': 1,
	'r': 4,
	'class': 'slime-node'
};

let defaultEdge = {
	'stroke': '#808080',
	'stroke-width': 0.5,
	'stroke-linecap': 'round',
	'class': 'slime-edge'
	// 'stroke-dasharray': '1,3'
};

function choice(items) {
	return items[Math.floor(Math.random() * items.length)];	
}


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


class SvgGraph {
	constructor(graphs, parentElement) {
		this.scaleFactor = 12;
		this.graphs = this.scale(graphs);
		console.log(this.graphs);
		this.parentElement = parentElement;
		// console.log(parentElement.getBoundingClientRect())
		// console.log(parentElement.offsetWidth, parentElement.offsetHeight);
		this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		// this.svg.setAttribute('width', parentElement.offsetWidth);
		// this.svg.setAttribute('height', parentElement.offsetHeight);
		this.svg.setAttribute('style','width: 100%; height: 100%;');
		this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		this.g.setAttribute('transform', 'translate(0,0)');
		this.svg.appendChild(this.g)
		// this.parentElement.appendChild(this.svg);
	}

	scale(graphs) {
		for (const [k, g] of Object.entries(graphs)) {
			for (let i = 0; i < g.length; i++) {
				for (let j = 0; j < g[i].length; j++) {
					const [x, y] = g[i][j][0];
					graphs[k][i][j][0] = [this.scaleFactor * x, this.scaleFactor * y];
				}
			};
		};
		return graphs;
	}

	draw(nodesCount) {
		let edges, x1, x2, y1, y2;
		let [xmin, xmax, ymin, ymax] = [1, -1, 1, -1];
		let g = choice(this.graphs[nodesCount]);
		shuffle(nodesColors);
		// draw edges first
		for (let i = 0; i < g.length; i++) {
			[[x1, y1], edges] = g[i];
			[xmin, xmax, ymin, ymax] = [Math.min(x1, xmin), Math.max(x1, xmax), Math.min(y1, ymin), Math.max(y1, ymax)];
			edges.forEach(edge => {
				[x2, y2] = g[edge][0];
				this.draw_edge(x1, y1, x2, y2)
			});
		};
		// then node
		for (let i = 0; i < g.length; i++) {
			[[x1, y1], edges] = g[i];
			this.draw_node(x1, y1, {stroke: nodesColors[i],fill: nodesColors[i]});
		}
		xmin -= this.scaleFactor / 2;
		ymin -= this.scaleFactor / 2;
		xmax += this.scaleFactor / 2;
		ymax += this.scaleFactor / 2;
		this.svg.setAttribute('viewBox', `${xmin} ${ymin} ${xmax - xmin} ${ymax - ymin}`);
		// this.svg.setAttribute('preserveAspectRatio', 'none');
		this.render();
	}

	render() {
		this.parentElement.appendChild(this.svg);
	}

	draw_node(x, y, options={}) {
		options = {
			...defaultNode,
			...options
		}
		let node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		node.setAttribute('cx', x);
		node.setAttribute('cy', y);
		for (const [k, v] of Object.entries(options)) {
			node.setAttribute(k, v);
		}
		this.g.appendChild(node);
	}

	draw_edge(x1, y1, x2, y2, options={}) {
		options = {
			...defaultEdge,
			...options
		}		
		let edge = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		edge.setAttribute('x1', x1);
		edge.setAttribute('y1', y1);
		edge.setAttribute('x2', x2);
		edge.setAttribute('y2', y2);
		for (const [k, v] of Object.entries(options)) {
			edge.setAttribute(k, v);
		}
		this.g.appendChild(edge);
	}
}

