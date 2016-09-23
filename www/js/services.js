angular.module('starter.services', ['ionic'])

.factory('Location', function($q, $cordovaLocalNotification, DB, Util) {
  var geo = null
  var getter = null

  function getGeo() {
    if (getter)
      return getter

    var def = $q.defer()
    console.log('Add listener for ready')
    document.addEventListener('deviceready', ready, false)

    getter = def.promise
    return getter

    function ready() {
      geo = window.backgroundGeoLocation
      console.log('Device ready, geo can run now', geo)
      def.resolve(geo)
    }
  }

  function init() {
    console.log('Initialize Location')
        $cordovaLocalNotification.schedule({
          id: 1,
          title: 'Title here',
          text: 'Text here',
          data: { customProperty: 'custom value' }
        }).then(function (result) {
          console.log('Result from schedule', JSON.stringify(result))
        })
    try {
    return getGeo()
      .then(configure)
      .then(function(geo) {
        // Run these simultaneously.
        //watch(geo)
        return check(geo)
      })
    } catch (er) {
      console.log('ERROR', er)
    }
  }

  var isConfigured = false
  function configure(geo) {
    if (isConfigured) {
      console.log('Geo already configured')
      return geo
    }

    console.log('Configure geo settings')
    // BackgroundGeolocation is highly configurable. See platform specific configuration options
    geo.configure(onLocation, onFail, {
        desiredAccuracy: 10,
        stationaryRadius: 20,
        distanceFilter: 30,
        maxLocations: 1000,
        //interval: 5 * 60 * 1000
        interval: 1 * 60 * 1000
        //interval: 5 * 1000
    })

    isConfigured = true
    return geo
  }

  function watch(geo) {
    console.log('watchLocationMode()')
    var def = $q.defer()
    geo.watchLocationMode(onOk, onError)
    return def.promise

    function onOk(enabled) {
      console.log('||||||||||||||||||||||||')
      console.log('watchLocationMode returned', enabled)
      if (enabled) {
        console.log('Location serices are enabled')
        // call backgroundGeolocation.start
        // only if user already has expressed intent to start service
      } else {
        // location service are now disabled or we don't have permission
        // time to change UI to reflect that
      }

      def.resolve(geo)
    }

    function onError(error) {
      console.log('Error watching location mode. Error:' + error);
      def.reject(error)
    }
  }

  function check(geo) {
    console.log('Check for location enabled')
    geo.isLocationEnabled(onOk, onErr)
    return geo

    function onOk(enabled) {
      console.log('isLocationEnabled returned', enabled)
      if (enabled) {
        geo.start(onStarted, onStartErr)
      } else {
        console.log('Location services disabled')
        // Location services are disabled
        if (window.confirm('Location is disabled. Would you like to open location settings?', 'hi')) {
          backgroundGeolocation.showLocationSettings();
        }
      }
    }

    function onErr(er) {
      console.log('Check error', er)
    }
  }

  function onStarted() {
    console.log('Service started successfully')
    // you should adjust your app UI for example change switch element to indicate
    // that service is running
  }

  function onStartErr(error) {
    console.log('Start error', error)
    // Tracking has not started because of error
    // you should adjust your app UI for example change switch element to indicate
    // that service is not running
    if (error.code === 2) {
      if (window.confirm('Not authorized for location updates. Would you like to open app settings?')) {
        backgroundGeolocation.showAppSettings();
      }
    } else {
      window.alert('Start failed: ' + error.message);  
    }
  }

  function onLocation(loc) {
    console.log('Yay! Location =', JSON.stringify(loc))

    crimeCounts([loc]).then(function(locs) {
      var loc = locs[0]
      if (loc.crimeCount > 5) {
        console.log('XXX')
        console.log('XXX High crime here! ', loc.crimeCount)
        console.log('XXX')

        $cordovaLocalNotification.schedule({
          id: 1,
          title: 'High Crime Area',
          text: 'This area has had some crimes here recently',
          badge: 1
        }).then(function (result) {
          console.log('Result from schedule', JSON.stringify(result))
          geo.finish()
        });
        
        console.log('Local notification error', eer && eer.message)
        console.log('What about -----------', cordova.plugins.notification.local)

//        var action = 
//           { identifier: 'MORE_SIGNIN_OPTIONS',
//             title: 'More Options',
//             icon: 'res://ic_moreoptions',
//             activationMode: 'foreground',
//             destructive: false,
//             authenticationRequired: false
//            }
//
//        $cordovaLocalNotification.schedule(
//          { id: 1
//          , category: 'SIGN_IN_TO_CLASS'
//          , title: 'High Crime Area'
//          , text: 'This area has had '+loc.crimeCount+' crimes nearby'
//          //, actions: [action]
//          //at: monday_9_am,
//          })
      }

    })
  }

  function onFail(er) {
    geo.finish()
    console.log('backgroundGeolocation error:', er.message)
  }

  // Return locations with their crime counts.
  function crimeCounts(locations) {
    var def = $q.defer()
    DB.crimes.get('config')
      .then(gotConfig)
      .catch(function(er) { def.reject(er) })
    return def.promise

    function gotConfig(config) {
      console.log('Crime counts for config:', JSON.stringify(config))
      // Dupe the objects and filter out ones that are very close together in time.
      var locs = JSON.parse(JSON.stringify(locations))
      locs = locations.sort(function(A, B) { return B.time - A.time }) // Sort newest to oldest.

      locations = []
      for (var i = 0; i < locs.length; i++) {
        var loc = locs[i]
        if (i == 0)
          locations.push(loc)
        else {
          var duration = locations[locations.length - 1].time - loc.time
          duration = duration / 1000 / 60 // Convert ms -> minutes

          //console.log('Time diff: ', duration)
          if (duration >= 5)
            locations.push(loc)
        }
      }

      var distances = {'1/8 Mile':1/8, '1/4 Mile':1/4, '1/2 Mile':1/2, '1 Mile':1}
      var maxDistance = distances[config.radius]

      var result = []
      go()
      function go() {
        var loc = locations.shift()
        if (! loc)
          return def.resolve(result)

        var lat1 = loc.latitude
        var lon1 = loc.longitude

        if (config.debug == 'Boston no crime') {
          lat1 = 42.375186
          lon1 = -71.111702
        } else if (config.debug == 'Boston high crime') {
          lat1 = 42.3368915
          lon1 = -71.077551
        }

        DB.nearby(lat1, lon1)
        .catch(function(er) { def.reject(er) })
        .then(function(docs) {
          console.log('Trim out %s crime docs with distance greater than %s miles', docs.length, maxDistance)

          var count = 0
          for (var i = 0; i < docs.length; i++) {
            var doc = docs[i]
            var lat2 = doc.geometry.coordinates[1]
            var lon2 = doc.geometry.coordinates[0]

            var distance = Util.distance(lat1, lon1, lat2, lon2)
            if (distance <= maxDistance) {
              count += 1
            } else {
              //console.log('Trim crime doc at distance %s: %s', distance, doc._id)
            }
          }

          console.log('Crime count for location ' + JSON.stringify(loc) + ': ' + count)
          loc.crimeCount = count
          result.push(loc)

          go()
        })
      }
    }
  }

  return {geo:getGeo, init:init, crimeCounts:crimeCounts}
})

.factory('DB', function($q) {
  var key_user = 'merstrockesserallicatigh'
  var key_pass = '3991455f205673b6dcf9d01bef7ffa8647e76928'
  var crimes_origin = new PouchDB('https://'+key_user+':'+key_pass+'@opendata.cloudant.com/crimes')
  var crimes = new PouchDB('crimes')
  var noop = function() {}

  // Use this quick and dirty Txn workalike.
  crimes.txn = txn
  crimes.pull = pull_replicate

  var inFlightPull = null
  var CONFIG_ID = 'config'

  return {crimes:crimes, txn:txn, noop:noop, pullCrimes:pullCrimes, CONFIG_ID:CONFIG_ID, nearby:findNearby}

  function findNearby(latitude, longitude, range) {
    console.log('Find nearby crimes')
    return makeDDoc().then(function() {
      range = range || 0.1
      range = 1000
      var lat = {startkey:latitude - range, endkey:latitude + range}
      var lon = {startkey:longitude- range, endkey:longitude+ range}

      var rows = {}
      lat = crimes.query('crimes/latitude', lat).then(function(res) { rows.lat = res.rows })
      lon = crimes.query('crimes/longitude', lon).then(function(res) { rows.lon = res.rows })

      return $q.all([lat, lon]).then(function() {
        console.log('Compare %s latitude and %s longitude matches', rows.lat.length, rows.lon.length)

        // Find docs that ended up in both views.
        var latIds = {}
        rows.lat.forEach(function(row) {
          //console.log('Doc within latitude range: %s', row.id)
          latIds[row.id] = true
        })

        var docs = []
        rows.lon.forEach(function(row) {
          var doc = row.value
          if (latIds[doc._id]) {
            //console.log('Found nearby doc: %s', doc._id)
            docs.push(doc)
          }
        })

        console.log('Docs nearby (%s,%s): %s', latitude, longitude, docs.length)
        return docs
      })
    })
  }

  function makeDDoc() {
    return crimes.txn({id:'_design/crimes', create:true}, mk_ddoc)

    function mk_ddoc(ddoc) {
      ddoc.views = {
        latitude: {
          map: function(doc) {
            if (doc.geometry && doc.geometry.coordinates)
              emit(doc.geometry.coordinates[1], doc)
          }.toString()
        },
        longitude: {
          map: function(doc) {
            if (doc.geometry && doc.geometry.coordinates)
              emit(doc.geometry.coordinates[0], doc)
          }.toString()
        }
      }
    }
  }

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
      return crimes.txn({id:CONFIG_ID, create:true}, noop)
      .then(function(config) {
        console.log('Config is', config)
        return config.last_seq
      })
    }

    function findLatest(last_seq) {
      // Figure out the timestamp of "one week ago."
      var oneWeekAgo = new Date
      //oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 7)
      oneWeekAgo.setUTCDate(oneWeekAgo.getUTCDate() - 11)
      oneWeekAgo = oneWeekAgo.valueOf()

      var viewName = 'view/cityTime'
      var lookup =
        { reduce: false
        //, stale: 'ok'
        , start_key: ['Boston', oneWeekAgo ]
        , end_key  : ['Boston', {}         ]
        }

      console.log('Query view %s', viewName, lookup)
      return crimes_origin.query(viewName, lookup)
      .then(function(result) {
        return {last_seq:last_seq, view:result}
      })
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
        , batch_size: 10
        , doc_ids   : okIds
        , timeout   : 5 * 60 * 1000
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
          //console.log('txn: op_done')

          if (er)
            return deferred.reject(er)

          var after = JSON.stringify(doc)
          if (before == after) {
            //console.log('Skip no-op change:', doc._id)
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
})

.factory('Util', function() {
  return {distance:getDistanceFromLatLonInMi}

  function getDistanceFromLatLonInMi(lat1, lon1, lat2, lon2) {
    return getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) * 0.621371
  }

  function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2-lat1);  // deg2rad below
    var dLon = deg2rad(lon2-lon1); 
    var a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ; 
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    var d = R * c; // Distance in km
    return d;
  }

  function deg2rad(deg) {
    return deg * (Math.PI/180)
  }
})
