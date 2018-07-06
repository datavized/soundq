export default function dragDrop(callback) {
	function drop(evt) {
		evt.preventDefault();

		const files = evt.dataTransfer.files;
		// for (let i = 0; i < files.length; i++) {
		// 	inputFile(files[i]);
		// }
		callback(files);
	}

	function stopEvent(evt) {
		evt.preventDefault();
		evt.stopPropagation();
	}

	document.addEventListener('dragover', stopEvent, true);
	document.addEventListener('dragenter', stopEvent, true);
	document.addEventListener('drop', drop, true);
}