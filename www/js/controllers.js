angular.module('starter.controllers', ['ionic', 'ngCordova'])

.controller('DashCtrl', function($scope, $timeout, DB, Location) {
  $scope.settings = { enableMonitoring: false, city:'Boston', radius:'1/4 Mile', debug:'Normal Location' }
  $scope.syncStatus = 'off'
  $scope.syncPercent = 0

  $scope.changeSettings = changeSettings


  // Keep the UI and config in the DB in sync.
  DB.crimes.txn({id:DB.CONFIG_ID, create:true}, DB.noop).then(updateConfig)

  function updateConfig(doc) {
    //console.log('Got my config', doc)
    $scope.settings.enableMonitoring = doc.enableMonitoring || $scope.settings.enableMonitoring
    $scope.settings.radius           = doc.radius           || $scope.settings.radius
    $scope.settings.debug            = doc.debug            || $scope.settings.debug
    $scope.settings.city             = doc.city             || $scope.settings.city

    monitorGeo()
  }

  function changeSettings() {
    console.log('Settings', $scope.settings)
    return DB.crimes.txn({id:DB.CONFIG_ID, create:true}, update_settings).then(done)

    function update_settings(doc) {
      doc.enableMonitoring = !! $scope.settings.enableMonitoring
      doc.radius           = $scope.settings.radius
      doc.city             = $scope.settings.city
      doc.debug            = $scope.settings.debug
    }

    function done(doc) {
      console.log('Settings updated:', doc)
      monitorGeo()
    }
  }
  
  function monitorGeo() {
    console.log('Monitoring geo')
    if (! $scope.settings.enableMonitoring) {
      console.log('Stop location monitoring')
      return Location.geo().then(function(geo) { geo.stop() })
    }

    console.log('Start (or continue) location monitoring')
    Location.init()
      .then(function() { console.log('Back in the controller; init is done') })
  }

  console.log('Calling up rep from the controller')
  if(0) // XXX
  DB.pullCrimes().then(function(result) {
    $scope.syncStatus = 'sync'

    var rep = result.puller

    rep.on('error', function(er) {
      $scope.$apply(function() {
        $scope.syncStatus = 'off'
      })
    })

    var start = new Date
    rep.on('filter-seen', function(seen, total) {
      var end = new Date
      var elapsedSeconds = (end - start) / 1000
      var docsPerSec = Math.round(seen / elapsedSeconds)
      console.log('Status: %s/%s IDs found; %s docs/sec', seen, total, docsPerSec)
      $scope.$apply(function() {
        $scope.syncPercent = Math.floor(100 * seen / total)
      })
    })

    rep.on('complete', function(info) {
      $scope.$apply(function() { $scope.syncStatus = 'ok' })

      var last_seq = info.last_seq

      console.log('Remember last_seq to skip over these in next replication: %s', last_seq)
      return DB.crimes.txn({id:DB.CONFIG_ID, create:true}, setLastSeq).then(done)

      function setLastSeq(doc) {
        doc.last_seq = last_seq
      }

      function done(doc) {
        console.log('Remembered last_seq: %s', doc.last_seq)
      }
    })
  }).catch(function(er) {
    console.log('Unknown error from pullCrimes()')
    console.error(er)
  })
})

.controller('ChatsCtrl', function($scope, $q, DB, Location) {
  $scope.enabled = false
  $scope.warnings = []

  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  $scope.$on('$ionicView.enter', function(e) {
    console.log('Enter view', e)
    DB.crimes.txn({id:DB.CONFIG_ID, create:true}, DB.noop).then(updateSettings)

    return checkMyLocation()
  });

  function updateSettings(config) {
    // Hmm, I think in principle the doc could be missing, or these values could be missing. But I don't think it will matter.
    $scope.enabled = config.enableMonitoring
    $scope.city    = config.city
    $scope.radius  = config.radius
  }


  function checkMyLocation() {
    console.log('Check location for activity page')
    return Location.geo().then(function(geo) {
      var def = $q.defer()
      geo.getLocations(onOk, onErr)
      return def.promise

      function onErr(er) {
        console.log('ERROR getting locations', er)
        def.reject()
      }

      function onOk(locations) {
        console.log('Got %s locations', locations.length)
        var mostRecent = locations[locations.length - 1]
        $scope.lastCheck = moment(mostRecent.time).fromNow()
        $scope.warnings = [ mostRecent ]
      }
    })
  }

  function checkNearMe(position) {
    var lat = position.coords.latitude
    var lon = position.coords.longitude

    return DB.nearby(lat, lon).then(logNearby)
  }

  function logNearby(crimes) {
    console.log('Nearby crimes', crimes)
  }
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})
