#!/usr/bin/env node

// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under the MIT License <http://opensource.org/licenses/MIT>.
// Part of the walkner-tools project <http://lukasz.walukiewicz.eu/p/walkner-tools>

var optimist = require('optimist');
var util = require('./lib/util');
var burnLantronixImage = require('./lib/burnLantronixImage');

var USAGE = [
  "Burn Lantronix Image",
  "",
  "1. Connects to a remote Lantronix through Telnet, sets the specified",
  "   dbug-config options (if any) and then executes the reboot command.",
  "2. Immediately after, connects to the host through netcon and every",
  "   500ms sends a new line character.",
  "3. If dBUG console does not show up in 60s, then exits.",
  "4. Otherwise shows current the configuration and executes the dnfl",
  "   command. The dnfl has 3 minutes to download the image and then 3",
  "   minutes to erase the flash and program the device.",
  "5. After image has been successfully flashed, the device is reset.",
  "",
  "Usage: lantronix-burn-image.js [options] host"
];

var argv = optimist
  .usage(USAGE.join('\n'))
  .describe("user", "string        Remote user (default: root)")
  .describe("pass", "string        Remote password (default: root)")
  .describe("set",  "string=string Set dbug-config option to value")
  .argv;

if (argv._.length === 0)
{
  optimist.showHelp();
  util.errit("Host is required.");
}

var dbug = null;

if (argv.set)
{
  dbug = {};

  if (!Array.isArray(argv.set))
  {
    argv.set = [argv.set];
  }

  argv.set.forEach(function(option)
  {
    option = option.split('=');

    dbug[option[0]] = option[1];
  });
}

burnLantronixImage({
  host: argv._[0],
  user: argv.user,
  pass: argv.pass,
  dbug: dbug,
  pipe: true
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
