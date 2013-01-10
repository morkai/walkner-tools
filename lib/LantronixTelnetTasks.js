var util = require('./util');
var ProcessTasks = require('./ProcessTasks');

module.exports = LantronixTelnetTasks;

var DEFAULT_USER = 'root';
var DEFAULT_PASS = 'root';

/**
 * @constructor
 * @extends {ProcessTasks}
 * @param {object} options
 * @param {string} options.host
 * @param {number=} options.port
 * @param {string=} options.user
 * @param {string=} options.pass
 */
function LantronixTelnetTasks(options)
{
  var args = [options.host];

  if (typeof options.port !== 'undefined')
  {
    args.push(options.port);
  }

  ProcessTasks.call(this, 'telnet', args);

  this.addLoginTask(
    options.user || DEFAULT_USER,
    options.pass || DEFAULT_PASS
  );
}

util.inherits(LantronixTelnetTasks, ProcessTasks);

/**
 * @param {function} done
 */
LantronixTelnetTasks.prototype.addExitTask = function(done)
{
  this.add({
    name: "Exit",
    expect: /\/.*? # /,
    action: "exit\n"
  });

  this.add({
    name: "Check exit",
    expect: "Connection closed",
    timeout: 0,
    action: done
  })
};

/**
 * @private
 * @param {string} user
 * @param {string} pass
 */
LantronixTelnetTasks.prototype.addLoginTask = function(user, pass)
{
  this.add({
    name: "Enter login",
    expect: "uClinux login:",
    action: user + "\n"
  });

  this.add({
    name: "Enter password",
    expect: "Password:",
    action: pass + "\n"
  });
};
