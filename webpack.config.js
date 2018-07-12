/* eslint-env node, browser: false */
const webpack = require('webpack');
const env = process.env.NODE_ENV || 'development';
const path = require('path');
const fs = require('fs');
const merge = require('webpack-merge');

process.traceDeprecation = true;

// webpack plugins and related utils
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
const WebpackBuildNotifierPlugin = require('webpack-build-notifier');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const eslintFormatter = require('react-dev-utils/eslintFormatter');
const autoprefixer = require('autoprefixer');

// Make sure any symlinks in the project folder are resolved:
// https://github.com/facebookincubator/create-react-app/issues/637
const appDirectory = fs.realpathSync(process.cwd());
const buildDirectory = path.resolve(appDirectory, 'build');
const examplesDirectory = path.resolve(appDirectory, 'examples');
const resolveApp = relativePath => path.resolve(appDirectory, relativePath);

const examples = fs.readdirSync(examplesDirectory)
	.filter(n => /\.js$/.test(n))
	.map(n => n.substr(0, n.length - 3));

// configuration
const eslintConfig = require('./.eslintrc.js');
const port = '9900';
const host = 'localhost';
const browsers = [
	'>1%',
	'last 4 versions',
	'Firefox ESR',
	'not ie < 12'
];

function buildEntryPoint(entryPoint) {
	const e = [entryPoint];
	if (env === 'development') {
		e.push(`webpack-dev-server/client?http://${host}:${port}/`);
	}
	return e;
}

const entry = {};
examples.forEach(name => {
	entry['example-' + name] = buildEntryPoint(path.resolve(examplesDirectory, name + '.js'));
});

const babelPlugins = env === 'development' ? [] : [];

const plugins = [
	new CaseSensitivePathsPlugin(),
	new CleanWebpackPlugin(['build/**/*'], {
		verbose: false
	})
];

const config = {
	entry,
	devtool: 'source-map',
	output: {
		path: buildDirectory,
		filename: '[name].bundle-[hash].js',
		pathinfo: env !== 'production'
	},
	module: {
		rules: [
			// preLoaders
			{
				test: /\.js$/,
				exclude: /node_modules/,
				enforce: 'pre',
				loader: 'eslint-loader',
				options: Object.assign({}, eslintConfig, {
					formatter: eslintFormatter,
					failOnHint: env === 'production',
					emitWarning: true
				})
			},

			{
				oneOf: [
					// 'url' loader works like 'file' loader except that it embeds assets
					// smaller than specified limit in bytes as data URLs to avoid requests.
					// A missing `test` is equivalent to a match.
					{
						test: [/\.gif$/, /\.jpe?g$/, /\.png$/],
						loader: require.resolve('url-loader'),
						options: {
							limit: 10000,
							name: 'examples/assets/[name].[hash:8].[ext]'
						}
					},

					// Process JS with babel
					{
						test: /\.js$/,
						exclude: /node_modules/,
						loader: 'babel-loader',
						options: {
							babelrc: false,
							presets: [
								[
									'env',
									{
										targets: {
											browsers
										},
										useBuiltIns: false,
										modules: false
									}
								]
							],
							plugins: [
								...babelPlugins,
								'transform-class-properties',
								['transform-object-rest-spread', { useBuiltIns: true }],
								['transform-runtime', {
									helpers: false,
									polyfill: false,
									regenerator: true
								}],
								'syntax-dynamic-import',
								'fast-async'

								// todo: for tests
								// https://github.com/facebookincubator/create-react-app/blob/master/packages/babel-preset-react-app/index.js#L72
							],
							cacheDirectory: true
						}
					},

					// 'postcss' loader applies autoprefixer to our CSS.
					// 'css' loader resolves paths in CSS and adds assets as dependencies.
					// 'style' loader turns CSS into JS modules that inject <style> tags.
					// In production, we use a plugin to extract that CSS to a file, but
					// in development 'style' loader enables hot editing of CSS.
					{
						test: /\.css$/,
						use: [
							require.resolve('style-loader'),
							{
								loader: require.resolve('css-loader'),
								options: {
									importLoaders: 1
								}
							},
							{
								loader: require.resolve('postcss-loader'),
								options: {
									// Necessary for external CSS imports to work
									// https://github.com/facebookincubator/create-react-app/issues/2677
									ident: 'postcss',
									plugins: () => [
										require('postcss-flexbugs-fixes'),
										autoprefixer({
											browsers,
											flexbox: 'no-2009'
										})
									]
								}
							}
						]
					},

					{
						test: /\.html$/,
						loader: 'raw-loader'
					},

					// 'file' loader makes sure those assets get served by WebpackDevServer.
					// When you `import` an asset, you get its (virtual) filename.
					// In production, they would get copied to the `build` folder.
					// This loader doesn't use a 'test' so it will catch all modules
					// that fall through the other loaders.
					{
						// Exclude `js` files to keep 'css' loader working as it injects
						// its runtime that would otherwise processed through 'file' loader.
						// Also exclude `html` and `json` extensions so they get processed
						// by webpacks internal loaders.
						exclude: [/\.(js|mjs)$/, /\.html$/, /\.json$/],
						loader: require.resolve('file-loader'),
						options: {
							name: 'examples/assets/[name].[hash:8].[ext]'
						}
					}
				]
			}/*,

			{
				test: /\.js$/,
				include: [
					path.resolve(__dirname, 'src/workers')
				],
				loader: 'worker-loader'
			}*/
		]
	},
	resolve: {
		// root: path.resolve('./src'),
		extensions: ['.js']
	},
	plugins,
	optimization: {
		namedModules: true,
		splitChunks: {
			minChunks: 2
		}
	}
};

const devConfig = {
	devtool: 'cheap-module-source-map',
	mode: 'development',
	output: {
		// workaround for https://github.com/facebookincubator/create-react-app/issues/2407
		sourceMapFilename: '[file].map',
		publicPath: `http://${host}:${port}/`
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify('development'),
			DEBUG: true
		}),
		new WebpackBuildNotifierPlugin({
			title: path.basename(__dirname),
			suppressSuccess: true
		})
		// new webpack.HotModuleReplacementPlugin(),

		// temporarily disabled pending bug fix
		// https://github.com/facebook/create-react-app/issues/4466
		// new WatchMissingNodeModulesPlugin(resolveApp('node_modules')),
	].concat(examples.map(name => {
		return new HtmlWebpackPlugin({
			inject: true,
			template: path.resolve(examplesDirectory, 'template.html'),
			chunks: ['common', 'example-' + name],
			// filename: `./examples/${name}/index.html`
			filename: `./examples/${name}.html`
		});
	})),
	devServer: {
		// hot: true,
		progress: true,
		inline: true,
		// contentBase: './public',
		stats: {
			all: false,
			colors: true,
			errors: true,
			warnings: true
		},
		port,
		host
	}
};

const distConfig = {
	output: {
		filename: 'index-[chunkhash].js'
	},
	mode: 'production',
	plugins: [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify('production'),
			DEBUG: false
		}),
		new HtmlWebpackPlugin({
			inject: true,
			template: __dirname + '/public/index.html',
			minify: {
				removeComments: true,
				removeCommentsFromCDATA: true,
				removeCDATASectionsFromCDATA: true,
				collapseWhitespace: true,
				collapseBooleanAttributes: true,
				removeAttributeQuotes: true,
				removeRedundantAttributes: true,
				useShortDoctype: true,
				removeEmptyAttributes: true,
				removeScriptTypeAttributes: true,
				// lint: true,
				caseSensitive: true,
				minifyJS: true,
				minifyCSS: true
			}
		}),
		new BundleAnalyzerPlugin({
			openAnalyzer: false,
			analyzerMode: 'static',
			reportFilename: '../report.html'
		})
	]
};

module.exports = merge.smart(config, env === 'production' ? distConfig : devConfig);
