// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under the MIT License <http://opensource.org/licenses/MIT>.
// Part of the walkner-tools project <http://lukasz.walukiewicz.eu/p/walkner-tools>

var util = require('./util');
var LantronixTelnetTasks = require('./LantronixTelnetTasks');

module.exports = rebootLantronix;

/**
 * @param {object} options
 * @param {string} options.host
 * @param {string=} options.user
 * @param {string=} options.pass
 * @param {boolean=} options.pipe
 * @param {function(?Error, boolean)=} done
 */
function rebootLantronix(options, done)
{
  var telnet = new LantronixTelnetTasks({
    host: options.host,
    user: options.user,
    pass: options.pass
  });

  telnet.on('timeout', function(task)
  {
    telnet.kill();

    done && done(new Error(util.format(
      "Telnet task timed out: %s", task.name
    )));
  });

  if (options.pipe)
  {
    telnet.pipeStdio();
  }

  telnet.add({
    name: "Reboot",
    expect: "/ #",
    timeout: 3000,
    action: "reboot\n"
  });

  telnet.add({
    name: "Check reboot",
    expect: "Connection closed",
    timeout: 0,
    action: function()
    {
      if (parseInt(options.ping) > 0)
      {
        setTimeout(function() { startPing(options, done); }, 5001);
      }
      else
      {
        done(null, false);
      }
    }
  });
}

function startPing(options, done)
{
  var ping = util.spawn('ping', [options.host], {stdbuf: true});
  var availableRegExp = /time=[0-9.]+ m?s/;
  var available = false;
  var timeoutTimer = null;

  ping.on('exit', function()
  {
    clearTimeout(timeoutTimer);

    done(null, available);
  });

  ping.stdout.setEncoding('utf8');
  ping.stdout.on('data', function(data)
  {
    if (available)
    {
      return;
    }

    if (options.pipe)
    {
      process.stdout.write(data);
    }

    if (availableRegExp.test(data))
    {
      available = true;

      ping.kill();
    }
  });

  ping.stderr.setEncoding('utf8');
  ping.stderr.on('data', function(data)
  {
    if (available)
    {
      return;
    }

    if (options.pipe)
    {
      process.stderr.write(data);
    }
  });

  timeoutTimer = setTimeout(function() { ping.kill(); }, options.ping * 1000);
}
