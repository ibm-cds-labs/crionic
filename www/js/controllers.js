angular.module('starter.controllers', ['ionic', 'ngCordova'])

.controller('DashCtrl', function($scope, $timeout) {
  $scope.settings = { enableMonitoring: false, city:'Boston' }
  $scope.syncStatus = 'off'

  $scope.changeCity = function() {
    console.log('TODO: City changed', $scope.settings)
  }

  $scope.changeMonitoring = function() {
    console.log('Monitoring setting changed', $scope.settings.enableMonitoring)
    $scope.syncStatus = 'sync'
    $timeout(sync_done, 3000)
  }

  function sync_done() {
    $scope.syncStatus = 'ok'
  }
})

.controller('ChatsCtrl', function($scope, $cordovaGeolocation) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  $scope.$on('$ionicView.enter', function(e) {
    console.log('Enter view', e)
  });

  window.g = $cordovaGeolocation
  console.log('check "g"')
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})
