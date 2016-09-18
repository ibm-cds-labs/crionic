angular.module('starter.controllers', ['ionic', 'ngCordova'])

.controller('DashCtrl', function($scope, $timeout, DB) {
  $scope.settings = { enableMonitoring: false, city:'Boston' }
  $scope.syncStatus = 'off'
  $scope.syncPercent = 0

  // Keep the UI and config in the DB in sync.
  var config_id = 'config' // Document ID of the app configuration
  DB.config.txn({id:config_id, create:true}, DB.noop)
  .then(function(doc) {
    console.log('Got my config', doc)
    $scope.settings.enableMonitoring = doc.enableMonitoring || $scope.settings.enableMonitoring
    $scope.settings.city             = doc.city             || $scope.settings.city
  }).catch(function(e) { throw e })

  $scope.changeCity = function() {
    console.log('TODO: City changed', $scope.settings)
  }

  $scope.changeMonitoring = function() {
    console.log('Monitoring setting changed', $scope.settings.enableMonitoring)
    DB.config.txn({id:config_id, create:true},
      function(doc) { doc.enableMonitoring = !! $scope.settings.enableMonitoring })
    .then(function(doc) {
      console.log('Monitoring settings updated:', doc.enableMonitoring)
    })
  }

  console.log('Calling up rep from the controller')
  DB.pullCrimes().then(function(result) {
    $scope.syncStatus = 'sync'

    var rep = result.puller
    rep.on('filter-seen', function(ok, total, seen) {
      console.log('Status: %s/%s IDs found; total seen: %s', ok, total, seen)
      $scope.$apply(function() {
        $scope.syncPercent = Math.floor(ok / total)
      })
    })
    rep.then(function(x) {
      console.log('- - - - - - - - - - - - - - - Rep.then called', x)
      //$scope.syncStatus = 'ok'
    })
    rep.on('complete', function(info) {
      $scope.$apply(function() {
        $scope.syncStatus = 'ok'
      })
    })
    rep.on('error', function(er) {
      $scope.$apply(function() {
        $scope.syncStatus = 'off'
      })
    })
  }, function(er) { console.error(er) }
  ).catch(function(er) { console.error(er) })
})

.controller('ChatsCtrl', function($scope, $cordovaGeolocation, DB) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  $scope.$on('$ionicView.enter', function(e) {
    console.log('Enter view', e)
    console.log('DB.crimes', DB.crimes)
  });

  window.g = $cordovaGeolocation
  console.log('check "g"')
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})
