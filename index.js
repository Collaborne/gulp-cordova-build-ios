'use strict';
const path = require('path');
const fs = require('fs');
const through = require('through2');
const gutil = require('gulp-util');
const {cordova} = require('cordova-lib');

module.exports = options => {
	options = options || {};
	const device = options.device || true;
	const release = options.release || false;
	const codeSignIdentity = options.codeSignIdentity;
	const provisioningProfile = options.provisioningProfile;
	const developmentTeam = options.developmentTeam;
	const packageType = options.packageType;

	return through.obj((file, enc, cb) => {
		// Change the working directory
		process.env.PWD = file.path;

		// Pipe the file to the next step
		cb(null, file);
	}, cb => {
		const self = this;
		const iosPath = path.join(cordova.findProjectRoot(), 'platforms', 'ios');
		const exists = fs.existsSync(iosPath);

		Promise.resolve()
			.then(() => {
				if (options.reAdd) {
					// First remove the platform if we have to re-add it
					return cordova.platforms('rm', 'ios');
				}
			})
			.then(() => {
				if (exists === false || options.reAdd) {
					// Add the iOS platform if it does not exist or we have to re-add it
					return cordova.platforms('add', 'ios' + (options.version ? ('@' + options.version) : ''));
				}
			})
			.then(() => {
				const options = [];

				if (device) {
					options.push('--device');
				}
				if (release) {
					options.push('--release');
				}
				if (codeSignIdentity) {
					options.push('--codeSignIdentity=' + codeSignIdentity);
				}
				if (provisioningProfile) {
					options.push('--provisioningProfile=' + provisioningProfile);
				}
				if (developmentTeam) {
					options.push('--developmentTeam=' + developmentTeam);
				}
				if (packageType) {
					options.push('--packageType=' + packageType);
				}

				// Build the platform
				return cordova.build({platforms: ['ios'], options: options});
			})
			.then(() => {
				var base = path.join(iosPath, 'build/device');
				var cwd = process.env.PWD;

				// Iterate over the output directory
				fs.readdirSync(base).forEach(function (file) {
					if (file.indexOf('.ipa') !== -1) {
						var filePath = path.join(base, file);

						// Push the file to the result set
						self.push(new gutil.File({
							base: base,
							cwd: cwd,
							path: filePath,
							contents: fs.readFileSync(path.join(base, file))
						}));
					}
				});

				cb();
			})
			.catch(error => {
				// Return an error if something happened
				// XXX: The 'ios-deploy was not found' error appears as a string, not as an Error instance.
				var message = typeof error === 'string' ? error : error.message;
				cb(new gutil.PluginError('gulp-cordova-build-ios', message));
			});
	});
};
