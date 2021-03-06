async = require('async')
child_process = require('child_process')
path = require('path')

{EventEmitter} = require('events')

module.exports = class Task extends EventEmitter
  constructor: (@module, @options) ->
    @on 'worker:message', (data) =>
      @processWorkerMessage(data)
      return
      
    @on 'worker:completed', (subtaskComplete) =>
      @workerCompleted(subtaskComplete)
      return
      
  run: (callback) ->
    @progress =
      started: 0
      finished: 0
      rate: 0
    
    @workerIndex = 0
    
    workerModulePath = path.join(__dirname, 'worker.coffee')
    @workers = (child_process.fork(workerModulePath, [@module]) for i in [0...@options.processes])
    
    configureWorker = (worker, cb) =>
      worker.on 'message', (m) =>
        if (m.subtaskComplete)
          worker.finished = m.subtaskComplete.finished
          
          @allWorkersFinished = true
          for w in @workers
            if (!w.finished)
              @allWorkersFinished = false
              break
            
          @emit('worker:completed', m.subtaskComplete) 
        else if (m.progress)
          @progress.started += m.progress.started
          @progress.finished += m.progress.finished
          @progress.rate += m.progress.rate
          
        return
      
      worker.on 'exit', (code, signal) ->
        console.log(code, signal)
        return
          
      cb(null)
      
      return
      
    async.each @workers, configureWorker, (err) =>
      if (err)
        callback(err)
      else 
        @start()
        
    @on 'completed', (val) ->
      @stop()
      callback(null, val) if callback
      return
      
    @on 'error', (err) ->
      @stop()
      callback(err) if callback
      return
  
  start: ->
    @stop()
    #throw new Error('not implemented')
    return
  
  stop: ->
    worker.kill() for worker in @workers
    return
      
  processWorkerMessage: (data) ->
    throw new Error('not implemented')
  
  workerCompleted: (subtaskComplete) ->
    throw new Error('not implemented')
    
  sendToWorker: (data) ->
    @workers[@workerIndex].send(data)
    @workerIndex++
    @workerIndex = 0 if @workerIndex is @workers.length