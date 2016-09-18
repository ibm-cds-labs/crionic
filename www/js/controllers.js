angular.module('starter.controllers', ['ionic', 'ngCordova'])

.controller('DashCtrl', function($scope, $timeout, DB) {
  $scope.settings = { enableMonitoring: false, city:'Boston' }
  $scope.syncStatus = 'off'

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
    //$scope.syncStatus = 'sync'
    //$timeout(sync_done, 3000)
  }

  function sync_done() {
    $scope.syncStatus = 'ok'
    console.log('sync odne DB.crimes', DB.crimes)
  }
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
