angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $timeout) {
  $scope.settings = { enableMonitoring: false, city:'Boston' }
  $scope.changeCity = function() {
    console.log('TODO: City changed', $scope.settings)
  }

  $scope.changeMonitoring = function() {
    console.log('Monitoring setting changed', $scope.settings.enableMonitoring)
    $scope.status = 'sync'
    $timeout(sync_done, 3000)
  }

  function sync_done() {
    $scope.status = 'ok'
    console.log('sync done $scope.city = ', $scope.city)
  }
})

.controller('ChatsCtrl', function($scope, Chats) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});
  console.log('The scope is now', $scope.settings)

  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
