angular.module('starter.services', ['ionic'])

.factory('DB', function($q) {
  var key_user = 'merstrockesserallicatigh'
  var key_pass = '3991455f205673b6dcf9d01bef7ffa8647e76928'
  var crimes_origin = new PouchDB('https://'+key_user+':'+key_pass+'@opendata.cloudant.com/crimes')
  var crimes = new PouchDB('crimes')
  var config = new PouchDB('config')
  var noop = function() {}

  // Use this quick and dirty Txn workalike.
  crimes.txn = config.txn = txn
  crimes.pull = config.pull = pull_replicate

  var inFlightPull = null
  var CONFIG_ID = 'config'

  return {crimes:crimes, config:config, txn:txn, noop:noop, pullCrimes:pullCrimes, CONFIG_ID:CONFIG_ID}

  function pull_replicate(sourceUrl, opts) {
    opts = opts || {}

    console.log('Replicate from:', sourceUrl, opts)
    var rep = PouchDB.replicate(sourceUrl, this, opts)

    rep.on('error', function(er) {
      console.log('Pull error', sourceUrl, er)
    })
    rep.on('active', function() {
      console.log('Pull is active', sourceUrl)
    })
    //rep.on('change', function(info) {
    //  console.log('Change in pull', sourceUrl, info)
    //})
    rep.on('complete', function(info) {
      console.log('Pull complete', sourceUrl, info)
    })

    return rep
  }

  function pullCrimes() {
    if (inFlightPull) {
      console.log('pullCrimes: Return in-flight pull')
      return inFlightPull
    }

    console.log('pullCrimes: begin')
    var deferred = $q.defer()
    inFlightPull = deferred.promise

    getLastSeq()
      .then(findLatest)
      .then(replicate_view)

    return deferred.promise

    function getLastSeq() {
      console.log('Find last_seq for new crimes replication')
      return config.txn({id:CONFIG_ID}, noop)
      .then(function(config) {
        console.log('Config is', config)
        return config.last_seq
      })
    }

    function findLatest(last_seq) {
      // Figure out the timestamp of "one week ago."
      var oneWeekAgo = new Date
      oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7)
      oneWeekAgo = oneWeekAgo.valueOf()

      var viewName = 'view/cityTime'
      var lookup =
        { reduce: false
        , stale: 'ok'
        , start_key: ['Boston', oneWeekAgo ]
        , end_key  : ['Boston', {}         ]
        }

      console.log('Query view %s', viewName, lookup)
      return crimes_origin.query(viewName, lookup)
      .then(function(result) {
        return {last_seq:last_seq, view:result}
      })
//      .catch(function(er) {
//        console.error('Replication error', er)
//        deferred.reject(er)
//      })
    }

    function replicate_view(db) {
      console.log('Replicate docs found in view: %s', db.view.rows.length)
      //for (var X of db.view.rows)
      //  console.log('Days since %s stamped at %s: %s', X.id, X.key[1], (new Date - X.key[1]) / 1000 / 60 / 60 / 24)

      var okCount = db.view.rows.length
      var okIds = db.view.rows.map(function(row) { return row.id })

      var seen = 0
      function isGoodDocId(doc) {
        seen += 1
        if (seen % 10 == 0 && puller)
          puller.emit('filter-seen', seen, okCount)

        return true
      }

      var opts =
        { filter    : isGoodDocId
        , query_params: { bustTheCache: Math.random() }
        , batch_size: 50
        , doc_ids   : okIds
        , timeout   : 2 * 60 * 1000
        }

      if (db.last_seq)
        opts.since = db.last_seq

      console.log('Begin pull %s docs from %s', okCount, crimes_origin, opts)

      var puller = crimes.pull(crimes_origin, opts)
      puller.on('complete', pullComplete)
      puller.on('error', pullError)
      return deferred.resolve({puller:puller})

      function pullComplete(info) {
        console.log('Clear in-flight pull after successful replication', info)
        inFlightPull = null
      }

      function pullError(er) {
        console.log('Clear in-flight pull after replication error', er)
        inFlightPull = null
      }

    }
  }

  // A quick and dirty TXN clone.
  function txn(opts, operation) {
    var db = this
    var deferred = $q.defer()

    go(0)
    return deferred.promise

    function go(i) {
      i += 1
      if (i > 5)
        return deferred.reject(new Error('Failed to update '+opts.id+' after '+i+' iterations'))

      if (typeof opts == 'string')
        opts = {id:opts}

      db.get(opts.id, function(er, doc) {
        if (er && er.status == 404 && opts.create)
          doc = {_id:opts.id}
        else if (er)
          return deferred.reject(er)

        var before = JSON.stringify(doc)
        var op_handled = false

        try { operation(doc, op_done) }
        catch (er) { return deferred.reject(er) }

        if (! op_handled)
          op_done() // The operation function did not call the callback

        function op_done(er) {
          op_handled = true
          console.log('txn: op_done')

          if (er)
            return deferred.reject(er)

          var after = JSON.stringify(doc)
          if (before == after) {
            console.log('Skip no-op change:', doc._id)
            return deferred.resolve(doc)
          }

          doc.updated_at = new Date
          doc.created_at = doc.created_at || doc.updated_at

          db.put(doc, function(er, res) {
            if (er)
              return deferred.reject(er)

            doc._rev = res.rev
            deferred.resolve(doc)
          })
        }
      })
    } // go
  }
});
