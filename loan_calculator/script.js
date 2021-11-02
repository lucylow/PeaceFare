angular.module('InterestApp', ['ui.bootstrap'])
.controller('MainCtrl', function ($interval, $scope, $filter, Loan) {
  var dateFilter = $filter('date');
  
  $scope.currencySymbol    = '$';
  $scope.currencyPrecision = 2;
  $scope.currencyStep      = 1 / Math.pow(10, $scope.currencyPrecision);

  $scope.loans = [
    new Loan(100,  0.15, new Date(2015,0, 1,0,0,0,0)),
    new Loan(2500, 0.25, new Date(Date.now() - (8.64e7*7))),
    new Loan(500,  0.35, new Date(Date.now() - 60000))
  ];
  $scope.settled = [
    new Loan(500,  0.35, new Date(Date.now() - 120000), new Date(Date.now() - 35000))
  ];
  $scope.settleTotal = function (){
    return $scope.settled.reduce(function (p, loan) {
      return p + loan.earnings;
    }, 0);
  };
  $scope.earningTotal = function (){
    return $scope.loans.reduce(function (p, loan) {
      return p + loan.earnings;
    }, 0);
  };
  $scope.settleLoan = function (loan) {
    var index = $scope.loans.indexOf(loan);
    if(index === -1) return;

    // mark loan as settled
    loan.settle();

    // push to settled loans
    Array.prototype.push.apply($scope.settled, $scope.loans.splice(index, 1));
  };
  $scope.createEntry = function () {
    $scope.loans.push(new Loan(
      $scope.entry.amount,
      $scope.entry.interest / 100,
      $scope.entry.date
    ));
    $scope.resetEntry();
  };
  $scope.resetEntryDate = function () {
    $scope.entry.date = new Date();
    $scope.entry.date.setSeconds(0);
    $scope.entry.date.setMilliseconds(0);
  };
  ($scope.resetEntry = function () {
    $scope.entry = {};
    $scope.resetEntryDate();
  })();
  
  $interval(angular.noop, 1000);
})
.factory('Loan', function () {
  function Loan (amount, interest, issuedDate, settledDate) {
    this.amount = amount;
    this.interest = interest;
    this.issued = issuedDate;
    this.settled = settledDate;
  }
  
  Object.defineProperties(Loan.prototype, {
    age: {
      get: function () {
        if(!this.settled) {
          return Date.now() - this.issued;
        }
        return moment(this.settled).diff(this.issued);
      }
    },
    ageSec: {
      get: function () {
        return this.age / 1000;
      }
    },
    earnPerDay: {
      get: function () {
        return this.amount * this.interest;
      }
    },
    earnPerHour: {
      get: function () {
        return this.earnPerDay / 24;
      }
    },
    earnPerMinute: {
      get: function () {
        return this.earnPerDay / 1440;
      }
    },
    earnPerSecond: {
      get: function () {
        return this.earnPerDay / 86400;
      }
    },
    earnings: {
      get: function () {
        return this.ageSec * this.earnPerSecond;
      }
    }
  });

  Loan.prototype.settle = function (now) {
    now = now || new Date();
    this.settled = now;
    return this;
  };

  return Loan;
})
.filter('percent', function ($filter) {
  var numFilter = $filter('number');
  return function (v, precision) {
    var ret = numFilter(v, precision);
    if(!ret) return ret;
    return ret + '%';
  };
})
.filter('ago', function ($filter) {
  return function (v) {
    return moment(Date.now() - v).fromNow();
  };
})
.filter('duration', function () {
  
  return function (v, unitMax) {
    if(v === undefined||
       v === false||
       v === null) return '---';
    
    if(isNaN(unitMax)) {
      unitMax = 2;
    }

    var
    remainder = parseFloat(v),
    unitLabel = {
      day:  'd',
      hour: 'hr',
      min:  'min',
      sec:  'sec',
      ms:   'ms'
    },
    unitSize = {
      day:  8.64e7,
      hour: 3.6e6,
      min:  60000,
      sec:  1000,
      ms:   1
    };

    return ['day', 'hour', 'min', 'sec', 'ms'].reduce(function (units, unit) {
      var size = unitSize[unit], label = unitLabel[unit];
      if((remainder < size && !units.length) || units.length >= unitMax) return units;

      var
      len = Math.floor(remainder / size);

      if(len === 0) {
        return units;
      }

      // subtract this from remainder
      remainder -= len * size;

      // add to unit output
      units.push(len + label);

      return units;
    }, []).join(' ');
  };
});