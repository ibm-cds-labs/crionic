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

  return {crimes:crimes, config:config, txn:txn, noop:noop, pullCrimes:pullCrimes}

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
    rep.on('change', function(info) {
      console.log('Change in pull', sourceUrl, info)
    })
    rep.on('complete', function(info) {
      console.log('Pull complete', sourceUrl, info)
    })

    return rep
  }

  function pullCrimes() {
    console.log('Find doc IDs to replicate')
    var deferred = $q.defer()

    var viewName = 'view/bostonlast7days'
    crimes_origin.query(viewName, {reduce:false})
      .then(replicate_view)
      .catch(function(er) { console.error('Replication error', er) })
    return deferred.promise

    function replicate_view(res) {
      console.log('Use %s documents to replicate from view: %s', res.rows.length, viewName)

      var okCount = res.rows.length
      var okIds = res.rows.map(function(row) { return row.id })

      var seen = 0
      function isGoodDocId(doc) {
        seen += 1
        if (seen % 100 == 0 && puller)
          puller.emit('filter-seen', seen, okCount)

        return true
      }

      var opts = {filter:isGoodDocId, batch_size:100, doc_ids:okIds, timeout:2 * 60 * 1000}
      console.log('Begin pull %s docs from %s', okCount, crimes_origin, opts)

      var puller = crimes.pull(crimes_origin, opts)
      puller.on('change', function(info) {
        console.log('Pull change', info)
      })
      puller.on('complete', function(info) {
        console.log('Replication complete, result:', info)
        puller = null
      })
      puller.on('error', function(er) {
        console.log('Error pulling crimes DB', er)
        puller = null
      })

      console.log('RESOLVE PULLER NOW', puller)
      return deferred.resolve({puller:puller})
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
