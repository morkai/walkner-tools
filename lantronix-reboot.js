#!/usr/bin/env node

// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under the MIT License <http://opensource.org/licenses/MIT>.
// Part of the walkner-tools project <http://lukasz.walukiewicz.eu/p/walkner-tools>

var optimist = require('optimist');
var util = require('./lib/util');
var rebootLantronix = require('./lib/rebootLantronix');

var USAGE = [
  "Reboot Lantronix",
  "",
  "1. Connects to remote a Lantronix through Telnet and executes the",
  "   reboot command.",
  "2. If the ping option is specified, waits 5s and pings the remote",
  "   host until either it responds or the time limit is up.",
  "",
  "Usage: lantronix-reboot.js [options] host"
];

var argv = optimist
  .usage(USAGE.join('\n'))
  .describe("user", "string Remote user (default: root)")
  .describe("pass", "string Remote password (default: root)")
  .describe("ping", "number Ping after reboot for at most the specified number of seconds")
  .argv;

if (argv._.length === 0)
{
  optimist.showHelp();
  util.errit("Host is required.");
}

rebootLantronix({
  host: argv._[0],
  user: argv.user,
  pass: argv.pass,
  ping: argv.ping,
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
