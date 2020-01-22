const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const extractShared = require('./extract-shared');
const noop = () => {};

exports.coverProcess = false;

exports.coverToJpg = function(opts, cb)
{
	cb = cb || noop;

	if(!opts.file)
		return cb(new Error('No music file specified'));

	if(!opts.outPath && !opts.outDir)
		return cb(new Error('No cover output file path'));

	exports.coverProcess = true;

	if(!opts.outPath && opts.outDir)
	{
		var parsed = path.parse(opts.file);
		opts.outPath = `${opts.outDir}/${parsed.name}.jpg`;
	}

	if(opts.overwrite)
		convertCoverToJpg(opts, cb);
	else
	{
		fs.access(opts.outPath, fs.constants.F_OK, (err) =>
		{
			if(!err)
			{
				exports.coverProcess = false;
				return cb(null);
			}

			convertCoverToJpg(opts, cb);
		});
	}
}

exports.getPossibleCoverNames = function(coverArr)
{
	if(!Array.isArray(coverArr)) return null;

	var possible = [];

	coverArr.forEach(coverName =>
	{
		possible.push(coverName);
		possible.push(coverName.charAt(0).toUpperCase() + coverName.slice(1));
		possible.push(coverName.toUpperCase());
	});

	return possible;
}

exports.findCoverInDir = function(dirPath, coverArr, cb)
{
	cb = cb || noop;

	if(!dirPath)
		return cb(new Error('No search dir specified'));

	if(!coverArr || !coverArr.length)
		return cb(new Error('No array with cover names provided'));

	fs.readdir(dirPath, (err, files) =>
	{
		if(err) return cb(new Error(`Could not obtain files in ${dirPath} dir`));

		cb(coverArr.some(cover => files.includes(cover)));
	})
}

exports.getIsCoverMerged = function(ffprobeData)
{
	return extractShared.findInStreams(
		ffprobeData, 'codec_name', 'mjpeg'
	);
}

exports.getMetadata = function(ffprobeData)
{
	const metadata = ffprobeData.format.tags;
	var parsedMetadata = {};

	if(metadata.TITLE)
	{
		for(var name in metadata)
			parsedMetadata[name.toLowerCase()] = metadata[name];
	}
	else if(metadata.title)
		parsedMetadata = metadata;
	else
		parsedMetadata = null;

	return parsedMetadata;
}

function convertCoverToJpg(opts, cb)
{
	opts.spawnArgs = [
		'-i', opts.file,
		'-c', 'copy',
		opts.outPath, '-y'
	];

	extractShared.convertFile(opts, (err) =>
	{
		exports.coverProcess = false;
		cb(err);
	});
}
