// Copyright (c) 2014, Łukasz Walukiewicz <lukasz@walukiewicz.eu>. Some Rights Reserved.
// Licensed under the MIT License <http://opensource.org/licenses/MIT>.
// Part of the walkner-tools project <http://lukasz.walukiewicz.eu/p/walkner-tools>

var util = require('util');
var os = require('os');
var spawn = require('child_process').spawn;

exports.inherits = util.inherits;

exports.format = util.format;

exports.errit = function()
{
  console.error.apply(console, arguments);
  process.exit(1);
};

exports.spawn = function(command, args, options)
{
  if (typeof options !== 'object')
  {
    options = {};
  }

  if (options.stdbuf === true)
  {
    args.unshift('-i0', '-e0', '-o0', command);
    command = 'stdbuf';

    delete options.stdbuf;
  }

  if (typeof options.env !== 'object')
  {
    options.env = process.env;
  }

  return spawn(command, args, options);
};

/**
 * @return {string}
 */
exports.ip = function()
{
  var ifaces = os.networkInterfaces();
  var iface;

  if (ifaces.hasOwnProperty('eth0'))
  {
    iface = ifaces.eth0;
  }
  else
  {
    for (var name in ifaces)
    {
      if (!ifaces.hasOwnProperty(name))
      {
        continue;
      }

      if (name.indexOf('eth') === 0)
      {
        iface = ifaces[name];

        break;
      }
    }
  }

  if (Array.isArray(iface))
  {
    for (var i = 0; i < iface.length; ++i)
    {
      if (iface[i].family === 'IPv4' && !iface[i].interval)
      {
        return iface[i].address;
      }
    }
  }

  return '0.0.0.0';
};
