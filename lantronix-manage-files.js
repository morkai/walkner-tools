#!/usr/bin/env node

var path = require('path');
var optimist = require('optimist');
var util = require('./lib/util');
var manageLantronixFiles = require('./lib/manageLantronixFiles');

var USAGE = [
  "Manage Files on Lantronix",
  "",
  "1. If the kill operation is specified, executes the killall command ",
  "   on the remote host through Telnet for each of the specified process",
  "   names.",
  "2. Deletes all the specified files through Telnet.",
  "3. Creates directories for nested uploads through Telnet.",
  "4. Uploads all the specified files to /mnt/flash through FTP.",
  "   Each file must be uploaded within 60s.",
  "5. Changes modes of the specified files through FTP.",
  "6. If the reboot option is specified, executes the reboot command on",
  "   the remote host through Telnet.",
  "7. If a numeric value was specified for the reboot option, then the host",
  "   will be pinged until it responds or up to the specified number of seconds.",
  "",
  "NOTE: Operations have the following format:",
  "      for killall: 0,process-name",
  "      for uploads: +,local-file,[remote-file],[mode]",
  "      for deletes: -,remote-file",
  "",
  "NOTE: Relative local file paths will be resolved to the CWD:",
  "      " + process.cwd(),
  "",
  "Usage: lantronix-manage-files.js [options] host [< operations-file]"
];

var argv = optimist
  .usage(USAGE.join('\n'))
  .describe("user",   "string Remote user (default: root)")
  .describe("pass",   "string Remote password (default: root)")
  .describe("reboot", "number Reboot the device after all ops (default: -1)")
  .describe("op",     "string Operation (repeatable)")
  .argv;

if (argv._.length === 0)
{
  optimist.showHelp();
  util.errit("Host is required.");
}

var stdinData = '';
var modeRegExp = /^0?[0-7][0-7][0-7]$/;

function parseInputData(inputData)
{
  var ops = {
    kill: [],
    delete: [],
    upload: {},
    chmod: {}
  };

  inputData.split('\n').forEach(function(line)
  {
    line = line.trim();

    if (line.length === 0)
    {
      return;
    }

    var columns = line
      .split(',')
      .map(function(column) { return column.trim(); });

    var operation = columns[0];
    var name = columns[1];

    if (operation === '-')
    {
      ops.delete.push(name);
    }
    else if (operation === '0')
    {
      ops.kill.push(name);
    }
    else if (operation === '+')
    {
      var remoteFile = columns[2];
      var mode = columns[3];
      var localFile = resolveFile(name);

      if (typeof remoteFile !== 'string' || remoteFile.length === 0)
      {
        remoteFile = path.basename(localFile);
      }

      ops.upload[localFile] = remoteFile;

      if (typeof mode === 'string' && mode.length > 0)
      {
        if (modeRegExp.test(mode))
        {
          ops.chmod[remoteFile] = mode;
        }
        else
        {
          throw new Error(util.format(
            "Invalid mode for file [%s]: %s", remoteFile, mode
          ));
        }
      }
    }
    else
    {
      throw new Error("Unknown operation: " + operation);
    }
  });

  return ops;
}

function resolveFile(file)
{
  if (file.length === 0)
  {
    throw new Error("File name cannot be empty!");
  }

  if (file[0] === '/')
  {
    return file;
  }

  return path.resolve(process.cwd(), file);
}

function main()
{
  if (stdinData.length > 0)
  {
    console.log();
  }

  console.log("Parsing input data...");

  if (typeof argv.op === 'string')
  {
    stdinData += '\n' + argv.op;
  }
  else if (Array.isArray(argv.op))
  {
    stdinData += '\n' + argv.op.join('\n');
  }

  var ops;

  try
  {
    ops = parseInputData(stdinData);
  }
  catch (err)
  {
    util.errit(err.message);
  }

  var reboot = -1;

  if (argv.reboot === true)
  {
    reboot = 0;
  }
  else if (/^[0-9]+$/.test(argv.reboot))
  {
    reboot = parseInt(argv.reboot);
  }

  manageLantronixFiles({
    host: argv._[0],
    user: argv.user,
    pass: argv.pass,
    pipe: true,
    kill: ops.kill,
    delete: ops.delete,
    upload: ops.upload,
    chmod: ops.chmod,
    reboot: reboot
  }, function(err)
  {
    console.log();

    if (err)
    {
      console.error(err.message);
    }
    else
    {
      console.log("Done, bye!");
    }
  });
}

console.log("Waiting for data on stdin (ENTER to catch, then ENTER, CTRL+D to release)...");

process.stdin.setEncoding('utf8');
process.stdin.resume();
process.stdin.on('data', function(data)
{
  stdinData += data;
});

var stdinTimer = null;

process.stdin.on('end', function()
{
  clearTimeout(stdinTimer);
  main();
});

stdinTimer = setTimeout(function()
{
  if (stdinData.length === 0)
  {
    console.log("No data received on stdin. Proceeding...");

    process.stdin.pause();
    process.nextTick(main);
  }
}, 1000);
