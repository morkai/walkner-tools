// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under the MIT License <http://opensource.org/licenses/MIT>.
// Part of the walkner-tools project <http://lukasz.walukiewicz.eu/p/walkner-tools>

var util = require('./util');
var ProcessTasks = require('./ProcessTasks');
var LantronixTelnetTasks = require('./LantronixTelnetTasks');

module.exports = burnLantronixImage;

var NETCON_PING_INTERVAL = .5 * 1000;
var NETCON_DBUG_TIMEOUT = 60 * 1000;
var DOWNLOAD_TIMEOUT = 3 * 60 * 1000;
var ERASE_PROGRAM_TIMEOUT = 3 * 60 * 1000;

/**
 * @param {object} options
 * @param {string} options.host
 * @param {string=} options.user
 * @param {string=} options.pass
 * @param {object.<string, string>=} options.dbug
 * @param {boolean=} options.pipe
 * @param {function(?Error)=} done
 */
function burnLantronixImage(options, done)
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

  if (options.dbug !== null)
  {
    telnet.add({
      name: "Show initial dbug-config",
      expect: "/ #",
      action: "dbug-config\n"
    });

    for (var optionName in options.dbug)
    {
      if (!options.dbug.hasOwnProperty(optionName))
      {
        continue;
      }

      (function(name, value)
      {
        telnet.add({
          name: util.format("Set dbug-config [%s] to [%s]", name, value),
          expect: "/ #",
          action: util.format("dbug-config %s %s\n", name, value)
        });
      })(optionName, options.dbug[optionName]);
    }
  }

  telnet.add({
    name: "Reboot",
    expect: "/ #",
    action: "reboot\n"
  });

  telnet.add({
    name: "Check reboot",
    expect: "Connection closed",
    timeout: 0,
    action: startNetcon.bind(null, options, done)
  });
}

function startNetcon(options, done)
{
  var netcon = new ProcessTasks('netcon', [options.host], {stdbuf: true});
  var netconPingTimer = null;
  var netconDbugTimer = null;

  if (options.pipe)
  {
    netcon.pipeStdio();
  }

  netcon.on('exit', function(code)
  {
    clearTimeout(netconPingTimer);
    clearTimeout(netconDbugTimer);

    if (!done)
    {
      return;
    }

    process.nextTick(function()
    {
      if (code !== 0)
      {
        done(new Error("Netcon failed with code: " + code));
      }
      else
      {
        done(null);
      }
    });
  });

  netcon.on('timeout', function(task)
  {
    clearTimeout(netconDbugTimer);

    done && done(new Error(util.format(
      "Netcon task timed out: %s", task.name
    )));
  });

  netconDbugTimer = setTimeout(
    function()
    {
      clearTimeout(netconPingTimer);
      netcon.kill();
    },
    NETCON_DBUG_TIMEOUT
  );

  function ping()
  {
    netcon.send("\n");

    netconPingTimer = setTimeout(ping, NETCON_PING_INTERVAL);
  }

  netcon.add({
    name: "Show dbug-config",
    expect: "dBUG>",
    action: function()
    {
      clearTimeout(netconPingTimer);
      clearTimeout(netconDbugTimer);

      netcon.send("show\n");
    }
  });

  netcon.add({
    name: "Download and flash (dnfl)",
    expect: "dBUG>",
    timeout: DOWNLOAD_TIMEOUT,
    action: "dnfl\n"
  });

  netcon.add({
    name: "Confirm erase",
    expect: "Continue (yes | no)?",
    timeout: ERASE_PROGRAM_TIMEOUT,
    action: "yes\n"
  });

  netcon.add({
    name: "Reset",
    expect: "Program successfully flashed",
    timeout: 0,
    action: function()
    {
      netcon.send("reset\n");
      netcon.kill();
    }
  });

  ping();
}
