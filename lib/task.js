(function() {
  var EventEmitter, Task, async, child_process, path,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  async = require('async');

  child_process = require('child_process');

  path = require('path');

  EventEmitter = require('events').EventEmitter;

  module.exports = Task = (function(_super) {
    __extends(Task, _super);

    function Task(module, options) {
      this.module = module;
      this.options = options;
      this.on('worker:message', (function(_this) {
        return function(data) {
          _this.processWorkerMessage(data);
        };
      })(this));
      this.on('worker:completed', (function(_this) {
        return function(subtaskComplete) {
          _this.workerCompleted(subtaskComplete);
        };
      })(this));
    }

    Task.prototype.run = function(callback) {
      var configureWorker, i, workerModulePath;
      this.progress = {
        started: 0,
        finished: 0,
        rate: 0
      };
      this.workerIndex = 0;
      workerModulePath = path.join(__dirname, 'worker.coffee');
      this.workers = (function() {
        var _i, _ref, _results;
        _results = [];
        for (i = _i = 0, _ref = this.options.processes; 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
          _results.push(child_process.fork(workerModulePath, [this.module]));
        }
        return _results;
      }).call(this);
      configureWorker = (function(_this) {
        return function(worker, cb) {
          worker.on('message', function(m) {
            var w, _i, _len, _ref;
            if (m.subtaskComplete) {
              worker.finished = m.subtaskComplete.finished;
              _this.allWorkersFinished = true;
              _ref = _this.workers;
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                w = _ref[_i];
                if (!w.finished) {
                  _this.allWorkersFinished = false;
                  break;
                }
              }
              _this.emit('worker:completed', m.subtaskComplete);
            } else if (m.progress) {
              _this.progress.started += m.progress.started;
              _this.progress.finished += m.progress.finished;
              _this.progress.rate += m.progress.rate;
            }
          });
          worker.on('exit', function(code, signal) {
            console.log(code, signal);
          });
          cb(null);
        };
      })(this);
      async.each(this.workers, configureWorker, (function(_this) {
        return function(err) {
          if (err) {
            return callback(err);
          } else {
            return _this.start();
          }
        };
      })(this));
      this.on('completed', function(val) {
        this.stop();
        if (callback) {
          callback(null, val);
        }
      });
      return this.on('error', function(err) {
        this.stop();
        if (callback) {
          callback(err);
        }
      });
    };

    Task.prototype.start = function() {
      this.stop();
    };

    Task.prototype.stop = function() {
      var worker, _i, _len, _ref;
      _ref = this.workers;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        worker = _ref[_i];
        worker.kill();
      }
    };

    Task.prototype.processWorkerMessage = function(data) {
      throw new Error('not implemented');
    };

    Task.prototype.workerCompleted = function(subtaskComplete) {
      throw new Error('not implemented');
    };

    Task.prototype.sendToWorker = function(data) {
      this.workers[this.workerIndex].send(data);
      this.workerIndex++;
      if (this.workerIndex === this.workers.length) {
        return this.workerIndex = 0;
      }
    };

    return Task;

  })(EventEmitter);

}).call(this);
