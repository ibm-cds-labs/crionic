angular.module('starter.controllers', ['ionic', 'ngCordova'])

.controller('DashCtrl', function($scope, $timeout, DB) {
  $scope.settings = { enableMonitoring: false, city:'Boston' }
  $scope.syncStatus = 'off'
  $scope.seen = 0

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
  var rep = DB.pullCrimes()
  rep.once('filter-seen', function() {
    $scope.$apply(function() {
      console.log('The filter running indicates replication in progress')
      $scope.syncStatus = 'sync'
    })
  })
  rep.on('filter-seen', function(n) {
    $scope.$apply(function() {
      if (n % 100 == 0) {
        console.log('Filter has processed %s docs', n)
        $scope.seen = n
      }
    })
  })
  rep.on('complete', function() {
    $scope.$apply(function() {
      $scope.syncStatus = 'ok'
    })
  })
  rep.on('error', function(er) {
    $scope.$apply(function() {
      $scope.syncStatus = 'off'
    })
  })

  console.log('Rep is', rep)
  console.log('typeof rep.then', typeof rep.then)
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
