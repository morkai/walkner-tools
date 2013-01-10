var util = require('./util');
var EventEmitter = require('events').EventEmitter;

module.exports = ProcessTasks;

var DEFAULT_TASK_TIMEOUT = 1000;

/**
 * @constructor
 * @extends {EventEmitter}
 * @param {string} command
 * @param {Array.<string>=} args
 * @param {object=} options
 * @param {boolean=} options.stdbuf
 */
function ProcessTasks(command, args, options)
{
  EventEmitter.call(this);

  /**
   * @private
   * @type {child_process.ChildProcess}
   */
  this.process = util.spawn(command, args, options);

  this.process.stdout.setEncoding('utf8');
  this.process.stdout.on('data', this.handleData.bind(this, 'stdout'));

  this.process.stderr.setEncoding('utf8');
  this.process.stderr.on('data', this.handleData.bind(this, 'stderr'));

  this.process.on('exit', this.emit.bind(this, 'exit'));

  /**
   * @private
   * @type {Array.<object>}
   */
  this.tasks = [];

  /**
   * @private
   * @type {number|null}
   */
  this.timeoutTimer = null;
}

util.inherits(ProcessTasks, EventEmitter);

/**
 * @param {boolean=} first
 * @param {object} task
 * @param {string} task.name
 * @param {timeout=} task.timeout
 * @param {RegExp|string} task.expect
 * @param {function} task.action
 * @return {ProcessTasks}
 */
ProcessTasks.prototype.add = function(first, task)
{
  if (arguments.length === 1)
  {
    task = first;
    first = false;
  }

  var expect = task.expect;

  if (typeof task.expect === 'string')
  {
    task.expect = function(data) { return data.indexOf(expect) !== -1; };
  }
  else if (task.expect instanceof RegExp)
  {
    task.expect = function(data) { return data.match(expect); };
  }
  else
  {
    task.expect = function() { return false; };
  }

  if (first)
  {
    this.tasks.unshift(task);
  }
  else
  {
    this.tasks.push(task);
  }

  return this;
};

/**
 * @param {string} data
 */
ProcessTasks.prototype.send = function(data)
{
  this.process.stdin.write(data);
};

ProcessTasks.prototype.kill = function(signal)
{
  this.process.kill(signal);
};

/**
 * @param {Stream=} stdout
 * @param {Stream=} stderr
 */
ProcessTasks.prototype.pipeStdio = function(stdout, stderr)
{
  if (!stdout)
  {
    stdout = process.stdout;
  }

  if (!stderr)
  {
    stderr = process.stderr;
  }

  this.process.stdout.on('data', function(data)
  {
    stdout.write(data);
  });

  this.process.stderr.on('data', function(data)
  {
    stderr.write(data);
  });
};

/**
 * @private
 * @param {String} type
 * @param {String} data
 */
ProcessTasks.prototype.handleData = function(type, data)
{
  this.emit(type, data);

  if (this.tasks.length === 0)
  {
    return;
  }

  var matches = this.tasks[0].expect(data);

  if (!matches)
  {
    return;
  }

  var task = this.tasks.shift();

  clearTimeout(this.timeoutTimer);

  if (task.timeout !== 0)
  {
    this.timeoutTimer = setTimeout(
      this.handleTimeout.bind(this, task),
      task.timeout || DEFAULT_TASK_TIMEOUT
    );
  }

  var me = this;

  process.nextTick(function()
  {
    if (typeof task.action === 'string')
    {
      me.send(task.action);
    }
    else if (typeof task.action === 'function')
    {
      task.action.apply(me, Array.isArray(matches) || []);
    }
  });
};

/**
 * @private
 * @param {object} task
 */
ProcessTasks.prototype.handleTimeout = function(task)
{
  this.emit('timeout', task);
};
