export default (options, arg) =>
	typeof options === 'function' ?
		options(arg) :
		options;