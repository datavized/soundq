module.exports = {
	env: {
		browser: false,
		node: true,
		es6: true,
		commonjs: true,
		'jest/globals': true
	},
	plugins: ['jest'],
	extends: ['plugin:jest/recommended']
};