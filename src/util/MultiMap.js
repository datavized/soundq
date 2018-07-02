export default function MultiMap() {
	const root = {
		values: new Map(),
		maps: new Map()
	};
	let size = 0;

	this.get = path => {
		let node = root;
		let key;
		if (!path || !path.length) {
			path = [undefined];
		}

		for (let i = 0, last = path.length - 1; i < last; i++) {
			key = path[i];

			node = node.maps.get(key);
			if (!node) {
				return undefined;
			}
		}

		return node.values.get(key);
	};

	/*
	todo: Fix weird edge case - someone set `undefined` as a value
	*/
	this.has = path => this.get(path) !== undefined;

	this.set = (path, value) => {
		let node = root;
		if (!path || !path.length) {
			path = [undefined];
		}

		const last = path.length - 1;
		for (let i = 0; i < last; i++) {
			const key = path[i];

			let next = node.maps.get(key);
			if (!next) {
				next = {
					values: new Map(),
					maps: new Map()
				};
				node.maps.set(key, next);
			}
			node = next;
		}

		const k = path[last];
		if (!node.values.has(k)) {
			size++;
		}
		node.values.set(k, value);
		return this;
	};

	this.delete = path => {
		let node = root;
		let key;
		if (!path || !path.length) {
			path = [undefined];
		}

		const parentPath = [];
		const keysPath = [];
		for (let i = 0, last = path.length - 1; i < last; i++) {
			key = path[i];
			parentPath.push(node);
			keysPath.push(key);

			node = node.maps.get(key);
			if (!node) {
				return this;
			}
		}

		if (node.values.has(key)) {
			size--;
			node.values.delete(key);

			// clean out empty nodes
			while (!node.values.size && !node.maps.size && parentPath.length) {
				const parent = parentPath.pop();
				// const k = keysPath.pop();
				parent.maps.delete(key);
				node = parent;
				key = keysPath.pop();
			}
		}

		return this;
	};

	this.clear = () => {
		root.values.clear();
		root.maps.clear();
		size = 0;
		return this;
	};

	Object.defineProperties(this, {
		length: {
			value: 0,
			writeable: false
		},
		size: {
			get: () => size
		}
	});
}