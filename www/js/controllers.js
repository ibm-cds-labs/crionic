angular.module('starter.controllers', ['ionic', 'ngCordova'])

.controller('DashCtrl', function($scope, $timeout, DB) {
  $scope.settings = { enableMonitoring: false, city:'Boston', radius:'1/4 Mile' }
  $scope.syncStatus = 'off'
  $scope.syncPercent = 0

  // Keep the UI and config in the DB in sync.
  DB.crimes.txn({id:DB.CONFIG_ID, create:true}, DB.noop)
  .then(function(doc) {
    //console.log('Got my config', doc)
    $scope.settings.enableMonitoring = doc.enableMonitoring || $scope.settings.enableMonitoring
    $scope.settings.radius           = doc.radius           || $scope.settings.radius
    $scope.settings.city             = doc.city             || $scope.settings.city
  }).catch(function(e) { throw e })

  $scope.changeSettings = function() {
    console.log('Settings', $scope.settings)
    return DB.crimes.txn({id:DB.CONFIG_ID, create:true}, update_settings).then(done)

    function update_settings(doc) {
      doc.enableMonitoring = !! $scope.settings.enableMonitoring
      doc.radius           = $scope.settings.radius
      doc.city             = $scope.settings.city
    }

    function done(doc) {
      console.log('Settings updated:', doc)
    }
  }

  console.log('Calling up rep from the controller')
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

.controller('ChatsCtrl', function($scope, $cordovaGeolocation, DB) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  $scope.$on('$ionicView.enter', function(e) {
    console.log('Enter view', e)
    //return DB.ddoc().then(checkMyLocation)
  });

  checkMyLocation()

  function checkMyLocation() {
    $cordovaGeolocation.getCurrentPosition().then(checkNearMe)
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
