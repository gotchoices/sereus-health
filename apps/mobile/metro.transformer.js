const fs = require('fs');
let upstreamTransformer;
try {
	// React Native >=0.72 commonly uses this package
	upstreamTransformer = require('@react-native/metro-babel-transformer');
} catch (_err) {
	// Fallback to the Metro default transformer (older setups)
	upstreamTransformer = require('metro-babel-transformer');
}

/**
 * Metro transformer to import `.qsql` files as raw strings at bundle time.
 *
 * This lets app code do:
 *   import schemaSQL from '../../../../design/specs/domain/schema.qsql';
 */
module.exports.transform = function transform({ src, filename, options }) {
	if (filename.endsWith('.qsql')) {
		const contents = fs.readFileSync(filename, 'utf8');
		const code = `module.exports = ${JSON.stringify(contents)};`;
		return upstreamTransformer.transform({ src: code, filename, options });
	}

	return upstreamTransformer.transform({ src, filename, options });
};


